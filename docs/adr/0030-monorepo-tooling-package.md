# ADR-0030: 门禁与仓库工具收敛到 workspace 包

- **Date**: 2026-10-28
- **Status**: 已接受
- **Relates to**: [ADR-0027](./0027-script-execution-surfaces.md)（脚本执行面分类、`scripts/lib/` 的定义与测试发现规则）、[ADR-0025](./0025-pr-review-flow.md)（门禁集合）

## 背景与取舍

迁移前 `scripts/lib/` 有 22 个实现模块、15 个同名测试、2 个 `.d.mts`、2 个 `.sh`，同时装着三类互不相同的职责：

- **门禁原子实现**：`no-mutual-links`、`context-*`、`changeset-*`、`package-contract`、`format-clean` 等 16 个。
- **仓库编排**：`test-ports.mjs`（六个 browser project 的端口分配）、`turbo-cache-dir.mjs`（共享 artifact cache 路径）。
- **仓库无关工具**：`config.mjs`、`exec.mjs`、`git.mjs`、`workspace-manifests.mjs`。

三类东西的消费者、变更频率与失败语义都不同，但共用一个目录与一套测试发现机制。三个已经发生或已经存在的问题：

1. **跨包引用深度不一致。** `apps/interweave/frontend/vite.config.ts` 引用端口表要走 `../../../scripts/lib/test-ports.mjs`，而 `packages/web-ui/vite.config.ts` 是 `../../`。迁移时前者一度按后者的深度写成 `../../`，由 `TS2307` 抓到。包 specifier 没有这个可错的维度。
2. **测试没有归属。** 全仓 tracked `*.test.mjs` 统一由 `scripts/checks/test-scripts.mjs` 串行直跑：无缓存、无并发、失败只报文件名。而 workspace 包的测试在 turbo 图里，有依赖排序、缓存与按包失败定位。
3. **依赖边不可见。** 「谁消费端口表」只能靠 grep 相对路径；`package.json` 里没有边，`pnpm why` 看不到。

ADR-0027 §5 允许 `scripts/lib/` 承载共享实现，因此迁移前的形态不违规。但准入判据只能写成「这段代码描述的是本仓库的编排事实还是可复用能力」这种长句子，判据越长，说明这个目录承担的职责越多。ADR-0027 的目标是入口与实现分离，三类职责混住时只完成了一半。

不选 `@greypan/test-kit` 的理由：那个包的定位是跨包复用的浏览器测试基建（MSW 环境），对消费方一无所知。把这些模块搬进去，会让基础设施包反向依赖本仓库的路径、语料与项目名。

## 决策

### 1. 新建 `packages/monorepo-kit`，源码直出，无构建

- `"type": "module"`，`exports` 全部指向 `./src/**/*.mjs`；没有 `build` 脚本，没有 `dist`，不引入 TypeScript 编译。
- 消费者全是 Node 运行时（git hook、CI 入口、`vite.config.ts`），没有浏览器打包需求，构建步骤只带来成本。
- 决定性理由：门禁必须在 hook 里源码直读。一旦有构建，`check-pre-commit` 就跑在上一次产物上，「改了检查逻辑但忘了 build 仍然放行」是门禁最不能接受的失效。
- 类型由同名 `.d.mts` 提供（`test-ports.d.mts`、`shell-i18n-catalog.d.mts`），TypeScript 为 `x.mjs` 解析相邻的 `x.d.mts`。
- 不依赖 `vite` / `vitest`；`engines.node` 写 `>=24.18.0`，与根 `package.json` 一致，测试脚本用的 glob 形式在 Node 24 可用。

### 2. 分三个分区，按「换仓库是否重写」划分

| 分区      | 内容                                                                                                                                                                                                                                                                                                                                            | 判据                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `shared/` | `config`、`exec`、`git`、`workspace-manifests`、`repo-root`                                                                                                                                                                                                                                                                                     | 与仓库无关，可直接复用于别处            |
| `policy/` | 16 个门禁原子实现：`changeset-policy`、`changeset-status`、`check-runner`、`command-conventions`、`context-corpus`、`context-invariants`、`format-clean`、`git-hooks-status`、`go-check`、`interweave-turbo-inputs`、`no-mutual-links`、`package-contract`、`script-tests`、`shell-i18n-catalog`、`turbo-cache-invariant`、`web-ui-docs-inputs` | 本仓库的门禁策略，换仓库即重写          |
| `repo/`   | `test-ports`、`turbo-cache-dir`                                                                                                                                                                                                                                                                                                                 | 本仓库编排，被构建配置与 bootstrap 消费 |

分区是目录约定，不是访问控制。`policy/` 与 `repo/` 显式承认自己知道本仓库布局，不假装通用；`shared/` 才是不带仓库假设的部分。

### 3. `scripts/lib/` 收缩成「Node 之前要跑的东西」

- `turbo-cache-dir.sh`、`go-cache-dir.sh` 由 `.mise.toml` 的 `[env]` 模板在 Node 可用之前执行，属于 bootstrap 面，不进 Node 工具包，留在 `scripts/lib/`。`go-cache-dir.test.mjs` 测的就是那个 `.sh`，跟着留下。
- 其余 22 个实现模块、14 个同名测试与 2 个 `.d.mts` 全部迁走。此后 `scripts/lib/` 只剩这两个 `.sh` 与一个测试，职责可以一句话说完。
- 代价：`turbo-cache-dir` 的一对实现分处两地（`.sh` 在 `scripts/lib/`，等价 `.mjs` 在包内）。一致性由包内的 `turbo-cache-dir.test.mjs` 钉住，它从仓库根解析 `.sh` 路径。

### 4. 入口改用包 specifier，不设汇总入口

- `scripts/checks/*.mjs` 从 `../lib/x.mjs` 改为 `@greypan/monorepo-kit/policy/x`；六个 `vite.config.ts` 改为 `@greypan/monorepo-kit/repo/test-ports`；两个 demo 的 `catalog.spec.ts` 改为 `@greypan/monorepo-kit/policy/shell-i18n-catalog`。
- 不给 `exports["."]` 建统一再导出：`check-policy` 只 import 5 个模块，汇总入口会强制加载全部 16 个，每个 hook 都付这份成本。
- `exports` 用子路径通配：`"./shared/*"`、`"./policy/*"`、`"./repo/*"` 各自映射到 `./src/<分区>/*.mjs`，另加 `"./package.json"`。
- 依赖边写进根 `package.json` 与五个消费 workspace 的 `devDependencies`（`workspace:*`）。

### 5. 测试跟着被测对象，`test-scripts` 显式排除包

- 包内 `"test": "node --test \"src/**/*.test.mjs\""`。glob 必须显式：直接传目录会按 Node 的默认模式收文件，`repo/test-ports.mjs` 与 `repo/test-ports.d.mts` 都匹配 `test-*`，前者被当成空测试跑一遍、后者在类型剥离阶段直接报错——迁移时这一条是实测出来的。
- `policy/script-tests.mjs` 的发现集合排除 `packages/monorepo-kit/**`。`git ls-files '*.test.mjs'` 的 pathspec 里 `*` 跨越目录分隔符，所以它覆盖全仓；不排除会双跑，且失败归属到两个地方。
- 需要仓库根的测试（`turbo-cache-dir`、`package-contract`）经 `shared/repo-root.mjs` 向上查找 `pnpm-workspace.yaml` 定位仓库根，不再按目录深度写 `../../..`。迁移期已经在这个维度出过一次错。
- 包自己的 `turbo.json` 把 `scripts/lib/turbo-cache-dir.sh` 加进 `test.inputs`：那个测试读包外文件，而 turbo 只哈希包目录内的文件。

### 6. turbo 与 changeset

- 根 `turbo.json` 的 `globalDependencies` 保留，路径改为 `packages/monorepo-kit/src/repo/test-ports.mjs`。**不能删**：源码直出时消费者经 `node_modules` 软链读源码，而 turbo 只对包目录内的文件做哈希，又没有 `^build` 传播，改端口表不会让 `web-ui` 的 `test` 缓存失效。
- `.changeset/config.json` 不把新包加入 `ignore`：门禁行为的变更值得留变更记录。代价是改检查逻辑要写一条带包名的 changeset，「空 changeset」这条捷径在门禁变更上不再可用。

## 后果

正向：

- 相对路径深度这一维消失，跨包引用变成稳定的 specifier。
- 门禁与编排的测试进入 turbo 图：并行、缓存、按包定位失败。
- 依赖边写进 `package.json`，`pnpm why @greypan/monorepo-kit` 能列出谁在消费端口表。
- `scripts/` 回到纯入口目录，ADR-0027 的入口/实现分离覆盖到全部分类。

代价与风险：

- 一次迁移改动面较大：37 个文件移动、7 个门禁入口与 6 个 `vite.config.ts` 改 import，`turbo.json`、`script-tests`、`commitlint.config.js`、`ARCHITECTURE.md` 与四份 `docs/agents` 文档各一处或多处同步。
- 门禁入口多一层 `node_modules` 解析。`check-pre-commit` 本来就经 `pnpm run` 启动，加了 workspace 软链不改变「需要先 install」这个前提。
- `globalDependencies` 仍会让这张表的变更失效全仓缓存，与迁移前一致。
- 新包会知道本仓库路径（`policy/`、`repo/` 两个分区），这是刻意接受的：它本来就是仓库内部工具，`private: true`，不进发布面。
- `scripts/lib/` 的准入判据从「门禁实现 + 编排 + 通用工具」收窄成一条纯 bootstrap 约束，判据本身变短，这正是本次的目的。

## 备选方案

- **维持现状，只补准入判据**：零迁移成本，但相对路径深度、测试归属、依赖边不可见三个问题都留着。
- **只抽 `shared/` 五个文件**：改动最小，但解决不了 `test-ports` 的引用深度与测试归属，而这两件才是驱动本次决策的问题。
- **抽成需要构建的 TypeScript 包**：否决。hook 会运行在旧产物上，门禁的正确性依赖源码直读。
- **并入 `@greypan/test-kit`**：否决。测试基建包会反向依赖消费方的名字、路径与语料。

## 验收

- `packages/monorepo-kit` 没有 `build` 脚本、没有 `dist`，`exports` 全部指向 `src/**/*.mjs`。
- `scripts/lib/` 只剩 `turbo-cache-dir.sh`、`go-cache-dir.sh` 与 `go-cache-dir.test.mjs`。
- 全仓对 `scripts/lib/` 的引用只剩 bootstrap 路径与历史 ADR / 研究记录。
- `pnpm run check-pre-commit`、`check-policy`、`check-context`、`check-pack` 通过。
- `turbo run test --filter=@greypan/monorepo-kit` 通过，且第二次运行命中缓存。
- `pnpm run test-scripts` 的输出里不出现 `packages/monorepo-kit/`。
- 改动 `src/repo/test-ports.mjs` 后，`turbo run test --filter=@greypan/web-ui --dry=json` 显示哈希变化。
- 六个 `vite.config.ts` 的测试端口行为与迁移前逐字一致（默认偏移 0 下仍为 63410–63460）。
