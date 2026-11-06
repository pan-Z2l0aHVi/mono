---
'@greypan/monorepo-kit': minor
---

Replace the checklist protocol with a nested `run` chain, per ADR-0022. Every `defineXxx(options)`
now returns a plugin that produces `run` instead of a `{ name, run }` unit, so `runner/runChecks` and
`runner/runEntrypoint` are gone: the trigger layer composes the chain itself with
`defineRunner().use(a).use(b).use(defineCatch()).make({ root, env })` and calls `run()`. Execution
order is `.use()` order, the first `Err` short-circuits the rest, and attribution is the domain prefix in
the `Err` text (`go:`, `git:`, `turbo:`, `md:`, `changeset:`, `pack:`, `script:`, `i18n:`, `port:`, with
`defineCatch()` converging thrown errors into `throw:`) — output format and exit code belong to the
trigger script. Each run-producing plugin `.use()`es the capabilities it needs, so a check cannot be
wired without its own dependencies. Capabilities compose the same way: `defineGit`, `defineGitHooksStatus`
and `defineChangesets` now head with `defineExec()` instead of spawning `git` themselves, and each spells
its result as `Plugin<XxxApi, KitCtx>` so the `exec` key it absorbed internally is not handed to its
consumers to supply.

`run` takes no arguments. The check context it used to receive carried `base`, `head` and `app` per run;
every input a judgement needs is now either context (`root`, `env`, injected once by `.make()`) or a
parameter it was configured with: `base` is a required member of `ChangesetStatusOptions`, `base` and `head`
of `ChangesetRequiredOptions` (both types are exported), and `app` of `ShellI18nCatalogOptions`. A
chain built without one is a compile error, which retires `requireCommit`'s `missing required option`
throw — with the parameter typed `string` there is no absent value left to guard. For the same reason
`scripts/policies/changeset-*.mjs` turned into factories: the range is known only per invocation, so the
entry parses `--base`/`--head` (still exit 2 when a flag is absent) and assembles the policy instance.
`mode` and `node` had no consumers and disappear; `script-tests` uses `process.execPath`.

`runner/` is two symbols: `defineRunner()` is the single base — identity `ok(undefined)` at the chain head,
the inherited `run` forwarded verbatim in the middle, discriminated by `typeof ctx.run === 'function'` — and
`defineCatch()` wraps the preceding `run` so throws and rejections become a prefixed `Err` rather than
skipping the checks that already passed. `Chain`, `Run` and `KitCtx` are declared only in
`runner/runner.ts` and are the protocol types the entry exports; `CheckUnit`, `CheckContext` and
`CheckResult` are gone with the checklist. The protocol is guarded mechanically by
`src/runner/__tests__/protocol-scan.spec.ts` (capability keys disjoint and never named `run`/`root`/`env`,
`definePlugin`'s first type argument is either `{ run: Run }` or one named `Api`, literal `Err` texts
carrying a domain prefix, `Run` and `Chain` declared in exactly one place, `Chain` annotation on every
run-producing export, and no judgement writing `process.stdout`/`process.stderr`/`console.*`).

Add `exports["./vite"]` for `testApiPort` and `devHttpsPlugin`: both are evaluated inside
`vite.config.ts`, and keeping them in the main entry would spread Vite's type surface to every Node
consumer. The main entry no longer exports them, and `testApiPortNames` is deleted: `testApiPort` reports
an unknown project name by listing the keys of `monorepo.json`, so the separate accessor had no caller.
`getWorkspaceRoot()` in `shared/workspace-root.ts` is the only repo-root lookup, and no plugin produces a
root. `ExecResult` keeps `{ ok, status, stdout, stderr }` so "ran and failed" stays distinguishable from
"could not start", but the judgement layer now turns any non-zero exit into an `Err`.
`staged-clean`'s `unavailable()` branch and `StagedCleanOptions.installHint` are removed, so a tool that
cannot start fails as a `git:` verdict instead of being skipped; `git-hooks-status` keeps its own
`installHint`, which is a hint string shown to the developer.
`script-tests` no longer writes the discovered scripts' output from inside the package: a passing run is
silent, and a failing one appends that script's captured stdout and exit code to the `script:` verdict.
Nothing is lost for debugging — `execFileSync` forwards the child's stderr to the parent process by
default, so tracebacks reached the terminal without the package echoing them; the echo only added
progress output on the success path, which is process logging and belongs to the trigger layer.
