# ADR-0030: 门禁与仓库工具收敛到 workspace 包

- **Date**: 2026-10-28
- **Status**: 已接受
- **Relates to**: [ADR-0027](./0027-script-execution-surfaces.md)（脚本执行面分类、`scripts/lib/` 的定义与测试发现规则）、[ADR-0025](./0025-pr-review-flow.md)（门禁集合）

2026-10-28 修订：§4 的「不设汇总入口」被推翻，改为单一入口、没有子路径；§1 的 `exports` 与类型声明、加载成本、后果与验收同步。原始理由（汇总入口会让每个门禁进程加载全部模块）在方向上没错，成本也被实测确认，只是这笔成本被判定为可接受。

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

- `"type": "module"`，`exports` 只有 `"."` → `./src/index.mjs`；没有 `build` 脚本，没有 `dist`，不引入 TypeScript 编译。
- 消费者全是 Node 运行时（git hook、CI 入口、`vite.config.ts`），没有浏览器打包需求，构建步骤只带来成本。
- 决定性理由：门禁必须在 hook 里源码直读。一旦有构建，`check-pre-commit` 就跑在上一次产物上，「改了检查逻辑但忘了 build 仍然放行」是门禁最不能接受的失效。
- 类型由 `.d.mts` 提供：入口是 `src/index.d.mts`，两个需要精确签名的模块另有同名声明（`test-ports.d.mts`、`shell-i18n-catalog.d.mts`）交给入口再导出。TypeScript 为 `x.mjs` 解析相邻的 `x.d.mts`。
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

### 4. 单一入口，没有子路径

- 所有消费点都改成包名：`scripts/checks/*.mjs` 从 `../lib/x.mjs` 改为 `@greypan/monorepo-kit`，五个 `vite.config.ts` 与两个 demo 的 `catalog.spec.ts` 同样。
- `exports` 只留 `"."`（→ `./src/index.mjs`）与 `"./package.json"`。没有子路径，就没有「子路径拼错」和「新增分区忘了加通配」这两类错误；分区仍是目录约定，但不再是导入面。
- 入口分两类导出，判据是模块导出名是否互相冲突，不是风格偏好：检查单元全部导出 `name` 与 `run`（`check-runner` 读的就是这两个），平铺必然互相覆盖，因此以命名空间给出（`commandConventions`、`goCheck`…）；其余叶子函数与常量平铺（`testApiPort`、`runEntrypoint`、`findRepoRoot`…）。
- 代价是加载面变成整包。开发机上实测（`packages/web-ui` 目录内、三次交替、每次新进程）：单模块 `test-ports` 约 7ms，入口约 160ms，差值约 150ms/进程。这个数被接受——端口表在配置求值期只读一次，150ms 相对 `vp dev` / `vp test` 的启动时间可忽略。摘掉两个最重的模块（`context-corpus`、`package-contract`）只降到约 150ms，说明成本摊在整个图上而不是单点，因此没有为它做惰性加载或分片入口。
- 顺带修掉一个被入口放大的隐患：`policy/package-contract.mjs` 原先在模块顶层调 `findRepoRoot()`，统一入口后这个查找会跟着落到每个消费者身上，现在移进 `getPackedFiles`。
- 类型由 `src/index.d.mts` 提供，`src/index.test.mjs` 逐名比对运行时入口与声明：加了导出忘了写声明、或声明了运行时不存在的成员，测试都直接失败。
- 依赖边写进根 `package.json` 与五个消费 workspace 的 `devDependencies`（`workspace:*`）。入口收成一个 specifier 之后，这条边比按子路径引用时更值得保留：`pnpm why @greypan/monorepo-kit` 是「谁在用端口表」的唯一可靠答案。

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
- 引用面只剩一个 specifier：新增模块不需要在 `exports` 里加通配，消费点也不会因为子路径拼错而在运行时才炸。

代价与风险：

- 一次迁移改动面较大：38 个文件移动、7 个门禁入口与 5 个 `vite.config.ts` 与 2 个 `catalog.spec.ts` 改 import，`turbo.json`、`script-tests`、`commitlint.config.js`、`ARCHITECTURE.md` 与四份 `docs/agents` 文档各一处或多处同步。
- 加载面从「按需取一个模块」变成「整包」。配置求值期每个进程多约 150ms，见 §4 的实测；这笔账换来的是引用面没有第二个可错维度。
- 门禁入口多一层 `node_modules` 解析。`check-pre-commit` 本来就经 `pnpm run` 启动，加了 workspace 软链不改变「需要先 install」这个前提。
- `globalDependencies` 仍会让这张表的变更失效全仓缓存，与迁移前一致。
- 入口的 `.d.mts` 是手写的第二份真相。缓解手段是 `src/index.test.mjs` 逐名比对，但类型细节（参数与返回）仍可能与实现漂移，只有真正的 TS 消费方才检查得到。
- 新包会知道本仓库路径（`policy/`、`repo/` 两个分区），这是刻意接受的：它本来就是仓库内部工具，`private: true`，不进发布面。
- `scripts/lib/` 的准入判据从「门禁实现 + 编排 + 通用工具」收窄成一条纯 bootstrap 约束，判据本身变短，这正是本次的目的。

## 备选方案

- **维持现状，只补准入判据**：零迁移成本，但相对路径深度、测试归属、依赖边不可见三个问题都留着。
- **只抽 `shared/` 五个文件**：改动最小，但解决不了 `test-ports` 的引用深度与测试归属，而这两件才是驱动本次决策的问题。
- **抽成需要构建的 TypeScript 包**：否决。hook 会运行在旧产物上，门禁的正确性依赖源码直读。
- **保留子路径通配导出**（本次推翻的形态）：能省下约 150ms/进程的加载面，但多出「子路径拼错」与「新增分区忘了加通配」两类错误，且类型要为每个子路径各自维护一份 `.d.mts`。包只有 24 个模块，用一整张入口换掉这一维判断更划算；这份成本集中在配置求值期的一次读表，不落在热循环里。
- **并入 `@greypan/test-kit`**：否决。测试基建包会反向依赖消费方的名字、路径与语料。

## 验收

- `packages/monorepo-kit` 没有 `build` 脚本、没有 `dist`；`exports` 只有 `"."` 与 `"./package.json"`，全仓不存在 `@greypan/monorepo-kit/` 开头的子路径引用。
- `src/index.test.mjs` 与包内其余测试一起通过，且故意删掉 `src/index.d.mts` 里一条声明时它会失败。
- `scripts/lib/` 只剩 `turbo-cache-dir.sh`、`go-cache-dir.sh` 与 `go-cache-dir.test.mjs`。
- 全仓对 `scripts/lib/` 的引用只剩 bootstrap 路径与历史 ADR / 研究记录。
- `pnpm run check-pre-commit`、`check-policy`、`check-context`、`check-pack` 通过。
- `turbo run test --filter=@greypan/monorepo-kit` 通过，且第二次运行命中缓存。
- `pnpm run test-scripts` 的输出里不出现 `packages/monorepo-kit/`。
- 改动 `src/repo/test-ports.mjs` 后，`turbo run test --filter=@greypan/web-ui --dry=json` 显示哈希变化。
- 五个 `vite.config.ts` 的测试端口行为与迁移前逐字一致（默认偏移 0 下仍为 63410–63460）。
