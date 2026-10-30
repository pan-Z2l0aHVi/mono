# @greypan/monorepo-kit

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
