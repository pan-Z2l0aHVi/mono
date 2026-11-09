# @greypan/monorepo-kit

## 0.1.0

### Minor Changes

- 7eefb10: Replace the checklist protocol with a nested `run` chain, per ADR-0022. Every `defineXxx(options)`
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

### Patch Changes

- 59fa85c: Add `skipWorktreeFiles()` to `GitApi` (the `S` entries of `git ls-files -v`) and a `defineFullCheckout({ remedy })`
  check unit. On a cone-sparse worktree the tracked files outside the cone are absent from disk, so gates that
  enumerate tracked files or walk directories silently scan a subset and still report a pass; this unit refuses
  instead, and the restore command enters through options because it is a consuming-repository fact.
  `defineScriptTests` now requires every `*.test.mjs` to print its own
  `<repo-relative path>: all assertions passed` line: an exit code alone cannot tell "no assertion ran" from a pass.
- Updated dependencies [7eefb10]
  - @greypan/js-kit@3.2.0

## 0.0.2

### Patch Changes

- 425a950: Collapse nested workspaces into their nearest ancestor commit scope, so a nested workspace such as
  `apps/interweave/frontend` is covered by the parent app scope instead of requiring its own entry.

## 0.0.1

### Patch Changes

- 9787a15: 新增叶子函数 `readPnpmWorkspaceDirectories(root)`：从 `pnpm-workspace.yaml` 的 `dir/**` 形态模式派生 workspace 容器目录。本仓的 `context-corpus`、`no-mutual-links`、`test-port-call-sites`、`env-doctor` 与 workflow 拓扑测试改用派生结果，不再各自手写 `apps` / `packages`；`scripts/policies/repo-root.mjs` 统一按 `pnpm-workspace.yaml` 定位仓库根。
- 9787a15: 移除各包 `exports` 里的 `"./package.json"`。仓库内没有任何消费方；这一项只为按包名读元数据重新放开入口，留着会让后来者把它当成必需项。唯一需要读 manifest 的 `check-md-to-comp-artifacts` 改为按仓库路径读取。已发布包按 minor 处理：升级后经包名解析元数据会报 `ERR_PACKAGE_PATH_NOT_EXPORTED`，目前没有已知的外部消费者。
- 9787a15: 按 ADR-0018 收敛包内分区：检查单元一律 `defineXxx(options)` 返回 `{ name, run }`，仓库事实（包目录、hook 名单、Turbo 输入、修复命令）只从 options 进入，实例由消费仓库的 `scripts/policies/` 建好交给 `scripts/checks/` 的入口。`policy/` 与 `repo/` 取消，`check-runner` 移到 `runner/`，`shared/` 只留与仓库无关的 `config`、`errors`、`order`；`shared/exec`、`shared/git`、`shared/repo-root`、`shared/workspace-manifests` 并入对应的 `exec`、`git`、`workspace` 插件，并新增 `turbo`、`changesets`、`test-ports` 插件。`test-scripts` 去掉 `exclude` 参数，发现集合不再排除本包。插件 API 的键与 context 同名（`root`、`env`）会在 `use` 合并后静默遮蔽 context，因此不再提供与 context 同名的 API。
- 9787a15: 仓库门禁、策略检查与构建编排的实现从 `scripts/lib/` 收进本包，TypeScript 源码经 `vp pack` 产出 `dist/`、按「换仓库是否重写」分 `shared/`、`policy/`、`repo/` 三个分区；`scripts/lib/` 只留 `.mise.toml` 在 Node 可用前执行的两个 POSIX helper。`test-scripts` 的发现集合排除本包，包内测试改由 turbo 的 `test` 任务承担。
  
  对外只有一个入口 `exports["."]`，不提供子路径，跨包引用一律写 `@greypan/monorepo-kit`。检查单元（导出 `name` 与 `run` 的模块）以命名空间给出，其余叶子函数与常量平铺；运行时与类型声明都取自 `vp pack` 的产物 `dist/`，因此门禁加载包之前必须先跑 `build`。测试按分区放在模块旁的 `__tests__/`；`turbo-cache-dir` 只保留 `scripts/lib/turbo-cache-dir.sh` 一份实现。端口分配是仓库数据，放在根 `monorepo.json`，`repo/` 只保留读取、校验与偏移。
- 9787a15: 包内目录改为按能力竖切：`plugins/` 与 `checks/` 合并成 `plugin/<能力>/`，一个能力一个目录，能力插件与它承载的参数化判定同住（`changesets`、`exec`、`git`、`test-ports`、`toolchain`、`turbo`、`workspace`），分区从四个减为三个。一份判定归谁看它的权威输入由哪个能力拥有，不看它 import 了几个能力；测试跟着进各能力目录的 `__tests__/`。模块文件名、`defineXxx` 导出面与检查协议都不变，`exports` 仍只有 `"."`；引用包内文件路径的外部配置需改路径，本仓已同步 `apps/*-web-ui-demo/turbo.json` 的 `test.inputs` 与 `skills/monorepo-change-impact/repo-query.mjs` 的前缀判定。
- 9787a15: 新增 `readme-locales` 门禁：发布包必须同时提供 `README.md` 与 `README.CN.md`，成对存在的两份必须互相链接；检查并入 `check-policy` 与 `check-pre-commit`。`format-clean` 改名为 `staged-clean`，`check-md-to-comp-artifacts` 入口从 `scripts/workflow/` 移到 `scripts/checks/`；`test-scripts` 的排除目录改由根入口传入，策略模块不再硬编码本包路径。
- 9787a15: 新增 `defineTestPortCallSites(options)` 检查：端口分配与各 `vite.config.ts` 调用点的一致性判据收进包里，扫描 glob 与调用名由消费仓库传入，项目名取自同一份分配。`test-ports` 的包内测试改为夹具驱动、不再读包外文件，包级 `turbo.json` 随之删除；本仓端口表的文档副本移除，唯一事实是根 `monorepo.json`。
- 9787a15: 新增 `defineTurboInputPaths()` 门禁：`turbo.json` 里指向不存在文件的 `$TURBO_ROOT$` 正模式不报错，只是收不进任何文件，任务因此静默停止失效。检查从 `pnpm-workspace.yaml` 列出根与每个 workspace 的 `turbo.json`，逐个判这些条目能否命中文件并指认到配置与条目下标；排除项不判，因为排除项打偏只会多算输入。无 options——配置集合与待判条目都从仓库配置读出来。并入 `check-pre-commit` 与 `check-policy`。
- Updated dependencies [9787a15]
  - @greypan/js-kit@3.1.0
