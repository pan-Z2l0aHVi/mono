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

Add `exports["./vite"]` for `testPorts` and `devHttpsPlugin`: both are evaluated inside
`vite.config.ts`, and keeping them in the main entry would spread Vite's type surface to every Node
consumer. `testPorts()` is a Vite plugin rather than a js-kit one — no judgement on the chain ever
consumed the `testApiPort(name)` accessor it replaces, because the port is read while the config is
evaluated. It writes `{ host: '127.0.0.1', port, strictPort: false }` into `test.api`, targeting the
project named by `testName` when the config declares `test.projects`, so consumers' `plugins` arrays no
longer hand-write those keys and their rationale. `testApiPort`, `testApiPortNames`, `defineTestPorts`
and `TestPortsApi` are deleted; reading and offsetting the table (`readTestPorts`) stays internal, shared
by the plugin and the `port:` call-site guard.

The layout drops the `plugin/` tier: each capability folder moved up to `src/<capability>/` and publishes
its surface through a folder `index.ts`, which `src/index.ts` re-exports. Intra-package imports still name
concrete files — a folder entry is a re-export, and importing across folders through it would merge two
module graphs and cycle `exec` against `git`. Both Vite adapters live in `src/vite/`; `shared/` has no
entry of its own. `@greypan/monorepo-kit/vite` is now `dist/vite/index.js`, the second entry key is
written as `vite/index` because `unbundle` puts the output where the key says.
`getWorkspaceRoot()` in `shared/workspace-root.ts` is the only repo-root lookup, and no plugin produces a
root. `ExecResult` keeps `{ ok, status, stdout, stderr }` so "ran and failed" stays distinguishable from
"could not start", but the judgement layer now turns any non-zero exit into an `Err`.
`staged-clean`'s `unavailable()` branch and `StagedCleanOptions.installHint` are removed, so a tool that
cannot start fails as a `git:` verdict instead of being skipped; `git-hooks-status` keeps its own
`installHint`, which is a hint string shown to the developer.
`git-hooks-status` stats each required hook with `throwIfNoEntry: false`: that flag turns ENOENT and ENOTDIR
into `undefined` but still throws for EACCES and ELOOP, so the call is wrapped and the code lands in the `fail`
detail as `pre-commit (ELOOP)`. An escaping stat error would abort `inspectGitHooks` and leave `env-doctor`
with no verdict at all.
`script-tests` no longer writes the discovered scripts' output from inside the package: a passing run is
silent, and a failing one appends that script's captured stdout/stderr (each on its own line) and exit
code to the `script:` verdict. `execFileSync` also forwards the child's stderr to the parent process by
default, so tracebacks still reach the terminal; what the echo used to add was progress output on the
success path, which is process logging and belongs to the trigger layer. Success-path progress is
intentionally gone — the failure verdict keeps the child's output, not a live progress stream.

Post-review hardening: `commandOutput()` joins stdout and stderr with a newline instead of concatenating
them (a glued pair used to invent a string that never appeared in either stream); `exec()` normalises a
spawn failure's `status: null` to `undefined` so callers can still test "command could not start";
`defineExec()` merges `options.env` into the injected environment instead of replacing it, so a caller
adding one variable no longer drops `PATH`; `staged-clean` catches EACCES/ELOOP from `statSync`,
records that one path's failure and keeps going, so the remaining staged files and the tool-chain
evidence still arrive in the same verdict; and `testPorts()` skips its
config hook for `env.command === 'build'`, so a missing or invalid port table cannot break a build that
never runs tests. The seven gate entrypoints now construct and run through `scripts/checks/run-check.mjs`,
which turns an assembly-time throw (plugin factories run eagerly in `.make()`) into the same one-line
`throw: ` verdict and exit 1 that `defineCatch()` gives run-time escapes.
