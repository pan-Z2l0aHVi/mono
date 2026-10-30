# ADR-0017: 门禁与仓库工具收敛到 workspace 包

- **Date**: 2026-10-28
- **Status**: 已接受
- **Relates to**: [ADR-0014](./0014-script-organization.md)（脚本执行面分类、`scripts/lib/` 的定义与测试发现规则）、[ADR-0012](./0012-pr-review.md)（门禁集合）

2026-10-28 修订（一）：§4 的「不设汇总入口」被推翻，改为单一入口、没有子路径；原始理由（汇总入口会让每个门禁进程加载全部模块）在方向上没错，只是这笔成本被判定为可接受。

2026-10-28 修订（二）：§1 与 §4 的手写声明被推翻，改为 `tsc` 从源码生成声明到 `dist/`。运行时仍然源码直出——被否决的是「运行时要构建」，不是「类型要有产物」。

2026-10-28 修订（三）：包内测试收进各分区的 `__tests__/`，`src/index.test.mjs` 删除（入口与声明的逐名比对退场，声明由同一份源码生成，不再有第二份真相）；`turbo-cache-dir` 只保留 `scripts/lib/turbo-cache-dir.sh` 一份实现，`env-doctor` 改为调用它，Node 等价实现与一致性测试一并删除。

2026-10-28 修订（四）：端口分配数据从 `repo/test-ports.mjs` 移到根 `monorepo.json`，包内只保留读取、校验与偏移；项目名因此退化为 `string`，未知名字在调用时报错并列出可选值，名称集合与调用点的一致性仍由 `test-ports.test.mjs` 守。

2026-10-29 修订（六）：ADR-0018 替代本 ADR 的 §1、§2 与 §5 的测试排除。§1 的「运行时源码直出、`build` 只产出类型」被推翻：包改为 TypeScript 源码经 `vp pack` 产出 `dist/`，门禁与配置消费产物，新鲜度由根 `check-pre-commit` 的前置 build 与 CI 重排保障。§2 的 `policy/` / `repo/` 两分区取消，仓库事实退回根 `scripts/policies/`。§5 的测试运行形态（`node --test`、`*.test.mjs`）改由 `vp test run` 跑 `*.spec.ts`，`exclude` 参数随包内 `*.test.mjs` 消失而删除，由 ADR-0018 的收尾切片执行。§6 的 `globalDependencies` 只保留 `.mise.toml` 与 `monorepo.json`，删去 `test-ports.ts` 的登记：该文件在包目录内，`monorepo-kit#build` 的哈希与 `dist/` 的 `^build` 传播已经覆盖它；而端口表是运行时从仓库根读的、不随构建产物变化，仍须由这份根登记失效消费者的 `test`。

2026-10-29 修订（七）：端口表的文档副本从 `docs/agents/build.md` 删除，唯一事实是根 `monorepo.json`；「分配与调用点一致」改由 `scripts/policies/test-port-call-sites.mjs` 组合出的 `test-port-call-sites` 检查在 `check-policy` 里守护，包内测试改为夹具驱动、不再读包外文件，`packages/monorepo-kit/turbo.json` 随之删除。修订（四）提到的 `test-ports.test.mjs`、§5 的包级 `test.inputs` 与 §6 的 build.md 副本比对均以此为准。

## 背景与取舍

迁移前 `scripts/lib/` 有 22 个实现模块、15 个同名测试、2 个 `.d.mts`、2 个 `.sh`，同时装着三类互不相同的职责：

- **门禁原子实现**：`no-mutual-links`、`context-*`、`changeset-*`、`package-contract`、`format-clean` 等 16 个。
- **仓库编排**：`test-ports.mjs`（六个 browser project 的端口分配）、`turbo-cache-dir.mjs`（共享 artifact cache 路径）。
- **仓库无关工具**：`config.mjs`、`exec.mjs`、`git.mjs`、`workspace-manifests.mjs`。

三类东西的消费者、变更频率与失败语义都不同，但共用一个目录与一套测试发现机制。三个已经发生或已经存在的问题：

1. **跨包引用深度不一致。** `apps/interweave/frontend/vite.config.ts` 引用端口表要走 `../../../scripts/lib/test-ports.mjs`，而 `packages/web-ui/vite.config.ts` 是 `../../`。迁移时前者一度按后者的深度写成 `../../`，由 `TS2307` 抓到。包 specifier 没有这个可错的维度。
2. **测试没有归属。** 全仓 tracked `*.test.mjs` 统一由 `scripts/checks/test-scripts.mjs` 串行直跑：无缓存、无并发、失败只报文件名。而 workspace 包的测试在 turbo 图里，有依赖排序、缓存与按包失败定位。
3. **依赖边不可见。** 「谁消费端口表」只能靠 grep 相对路径；`package.json` 里没有边，`pnpm why` 看不到。

ADR-0014 §5 允许 `scripts/lib/` 承载共享实现，因此迁移前的形态不违规。但准入判据只能写成「这段代码描述的是本仓库的编排事实还是可复用能力」这种长句子，判据越长，说明这个目录承担的职责越多。ADR-0014 的目标是入口与实现分离，三类职责混住时只完成了一半。

不选 `@greypan/test-kit` 的理由：那个包的定位是跨包复用的浏览器测试基建（MSW 环境），对消费方一无所知。把这些模块搬进去，会让基础设施包反向依赖本仓库的路径、语料与项目名。

## 决策

### 1. 新建 `packages/monorepo-kit`，运行时源码直出，类型产物由 `tsc` 生成

- `"type": "module"`，`exports` 只有 `"."`（`types` → `./dist/index.d.mts`，`import` → `./src/index.mjs`）。运行时没有 JS 构建产物：`build` 脚本只跑 `tsc --emitDeclarationOnly`，把声明写进 gitignore 的 `dist/`。
- 消费者全是 Node 运行时（git hook、CI 入口、`vite.config.ts`），没有浏览器打包需求，为运行时代码建打包步骤只带来成本。
- 决定性理由：门禁必须在 hook 里源码直读。一旦运行时也要构建，`check-pre-commit` 就跑在上一次产物上，「改了检查逻辑但忘了 build 仍然放行」是门禁最不能接受的失效。类型产物没有这条约束：它只影响 `vp check` 的解析结果，CI 的 Build 步也在类型检查之前。
- 声明从源码生成，不手写：`tsconfig.json` 开 `allowJs` + `checkJs`，`tsc` 按 JSDoc 与推断写出 `dist/**/*.d.mts`。公共签名靠 JSDoc 表达；`noImplicitAny` 暂留 `false`，包内参数还没有逐个标注，声明里对应位置是 `any`。端口分配是配置数据，`testApiPort` 的项目名只能是 `string`，未知名字在调用时报错并附可选名单。
- 不依赖 `vite` / `vitest`；`engines.node` 写 `>=24.18.0`，与根 `package.json` 一致，测试脚本用的 glob 形式在 Node 24 可用。

### 2. 分三个分区，按「换仓库是否重写」划分

| 分区      | 内容                                                                                                                                                                                                                                                                                                                                                              | 判据                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `shared/` | `config`、`exec`、`git`、`workspace-manifests`、`repo-root`                                                                                                                                                                                                                                                                                                       | 与仓库无关，可直接复用于别处   |
| `policy/` | 17 个门禁原子实现：`changeset-policy`、`changeset-status`、`check-runner`、`command-conventions`、`context-corpus`、`context-invariants`、`git-hooks-status`、`go-check`、`interweave-turbo-inputs`、`no-mutual-links`、`package-contract`、`readme-locales`、`script-tests`、`shell-i18n-catalog`、`staged-clean`、`turbo-cache-invariant`、`web-ui-docs-inputs` | 本仓库的门禁策略，换仓库即重写 |
| `repo/`   | `test-ports`（读取并校验根 `monorepo.json` 的端口分配）                                                                                                                                                                                                                                                                                                           | 本仓库编排，被构建配置消费     |

分区是目录约定，不是访问控制。`policy/` 与 `repo/` 显式承认自己知道本仓库布局，不假装通用；`shared/` 才是不带仓库假设的部分。

### 3. `scripts/lib/` 收缩成「Node 之前要跑的东西」

- `turbo-cache-dir.sh`、`go-cache-dir.sh` 由 `.mise.toml` 的 `[env]` 模板在 Node 可用之前执行，属于 bootstrap 面，不进 Node 工具包，留在 `scripts/lib/`。`go-cache-dir.test.mjs` 测的就是那个 `.sh`，跟着留下。
- 其余 22 个实现模块、14 个同名测试与 2 个 `.d.mts` 全部迁走。此后 `scripts/lib/` 只剩这两个 `.sh` 与一个测试，职责可以一句话说完。
- `turbo-cache-dir` 只有一份实现：Node 消费者（`env-doctor`）调用同一个 `.sh`，不再维护等价实现。

### 4. 单一入口，没有子路径

- 所有消费点都改成包名：`scripts/checks/*.mjs` 从 `../lib/x.mjs` 改为 `@greypan/monorepo-kit`，五个 `vite.config.ts` 与两个 demo 的 `catalog.spec.ts` 同样。
- `exports` 只留 `"."`（→ `./src/index.mjs`）。没有子路径，就没有「子路径拼错」和「新增分区忘了加通配」这两类错误；分区仍是目录约定，但不再是导入面。
- 包不为读元数据开放 `"./package.json"`：仓库内没有消费者，留着只会让后来者把它当成必需项。需要读 manifest 的脚本按仓库路径读取，不经过包名解析。
- 入口分两类导出，判据是模块导出名是否互相冲突，不是风格偏好：检查单元全部导出 `name` 与 `run`（`check-runner` 读的就是这两个），平铺必然互相覆盖，因此以命名空间给出（`commandConventions`、`goCheck`…）；其余叶子函数与常量平铺（`testApiPort`、`runEntrypoint`、`findRepoRoot`…）。
- 代价是加载面变成整包：端口表在配置求值期只读一次也能把整包图带进来。这笔成本被接受——它相对 `vp dev` / `vp test` 的启动时间可忽略，且成本摊在整个图上而不是单个重模块，因此没有为它做惰性加载或分片入口。
- 顺带修掉一个被入口放大的隐患：`policy/package-contract.mjs` 原先在模块顶层调 `findRepoRoot()`，统一入口后这个查找会跟着落到每个消费者身上，现在移进 `getPackedFiles`。
- 类型声明由 `tsc` 生成到 `dist/`，声明与实现之间没有第二份手写真相。
- 依赖边写进根 `package.json` 与五个消费 workspace 的 `devDependencies`（`workspace:*`）。入口收成一个 specifier 之后，这条边比按子路径引用时更值得保留：`pnpm why @greypan/monorepo-kit` 是「谁在用端口表」的唯一可靠答案。

### 5. 测试跟着被测对象，`test-scripts` 显式排除包

- 包内测试放在被测模块旁的 `__tests__/`，`"test": "node --test \"src/**/__tests__/*.test.mjs\""`。glob 必须显式写到 `__tests__/`：直接传目录会按 Node 的默认模式收文件，`repo/test-ports.mjs` 匹配 `test-*`，会被当成空测试再跑一遍——迁移时这一条是实测出来的。类型产物落在 `dist/`，不在这个 glob 里。
- `scripts/checks/test-scripts.mjs` 把 `packages/monorepo-kit` 作为排除目录传给 `policy/script-tests.mjs`；排除是仓库事实，由入口给出，策略模块不认包名。`git ls-files '*.test.mjs'` 的 pathspec 里 `*` 跨越目录分隔符，所以它覆盖全仓；不排除会双跑，且失败归属到两个地方。
- 需要仓库根的测试（`package-contract`）经 `shared/repo-root.mjs` 向上查找 `pnpm-workspace.yaml` 定位仓库根，不再按目录深度写 `../../..`。迁移期已经在这个维度出过一次错。
- 包自己的 `turbo.json` 把测试读到的包外文件加进 `test.inputs`：全仓 `vite.config.ts`（调用点扫描）与 `docs/agents/build.md`（端口表副本比对），turbo 只哈希包目录内的文件。`test` 不依赖 `build`，测试直接 import 源码。

### 6. turbo 与 changeset

- 根 `turbo.json` 的 `globalDependencies` 保留，登记 `monorepo.json` 与读取它的 `packages/monorepo-kit/src/repo/test-ports.mjs`。§1 给了这个包 `build` 之后，`^build` 已经把这份配置的变更传播到消费者：改端口分配会改 `monorepo-kit#build` 的哈希，消费者的 `test` 随之失去缓存。这条登记仍然保留，作为不依赖传播语义的第二道保险——源码直出意味着消费者经 `node_modules` 软链直接读源码，而 turbo 只对包目录内的文件做哈希；代价是改这份配置会让全仓缓存失效，而它很少改。
- `.changeset/config.json` 不把新包加入 `ignore`：门禁行为的变更值得留变更记录。代价是改检查逻辑要写一条带包名的 changeset，「空 changeset」这条捷径在门禁变更上不再可用。

## 后果

正向：

- 相对路径深度这一维消失，跨包引用变成稳定的 specifier。
- 门禁与编排的测试进入 turbo 图：并行、缓存、按包定位失败。
- 依赖边写进 `package.json`，`pnpm why @greypan/monorepo-kit` 能列出谁在消费端口表。
- `scripts/` 回到纯入口目录，ADR-0014 的入口/实现分离覆盖到全部分类。
- 引用面只剩一个 specifier：新增模块不需要在 `exports` 里加通配，消费点也不会因为子路径拼错而在运行时才炸。

代价与风险：

- 一次迁移改动面较大：38 个文件移动、7 个门禁入口与 5 个 `vite.config.ts` 与 2 个 `catalog.spec.ts` 改 import，`turbo.json`、`script-tests`、`commitlint.config.js`、`ARCHITECTURE.md` 与四份 `docs/agents` 文档各一处或多处同步。
- 加载面从「按需取一个模块」变成「整包」，见 §4；这笔账换来的是引用面没有第二个可错维度。
- 门禁入口多一层 `node_modules` 解析。`check-pre-commit` 本来就经 `pnpm run` 启动，加了 workspace 软链不改变「需要先 install」这个前提。
- `globalDependencies` 仍会让这张表的变更失效全仓缓存，与迁移前一致。
- 类型检查覆盖 2.4k 行 `.mjs`，但 `noImplicitAny` 仍为 `false`：包内参数未逐个标注，声明在这些位置退化为 `any`。要收紧得先补 JSDoc，属于后续工作，不在本次范围。
- 新包会知道本仓库路径（`policy/`、`repo/` 两个分区），这是刻意接受的：它本来就是仓库内部工具，`private: true`，不进发布面。
- `scripts/lib/` 的准入判据从「门禁实现 + 编排 + 通用工具」收窄成一条纯 bootstrap 约束，判据本身变短，这正是本次的目的。

## 备选方案

- **维持现状，只补准入判据**：零迁移成本，但相对路径深度、测试归属、依赖边不可见三个问题都留着。
- **只抽 `shared/` 五个文件**：改动最小，但解决不了 `test-ports` 的引用深度与测试归属，而这两件才是驱动本次决策的问题。
- **抽成需要构建的 TypeScript 包**：否决。hook 会运行在旧产物上，门禁的正确性依赖源码直读。
- **保留子路径通配导出**（本次推翻的形态）：能省掉整包加载面，但多出「子路径拼错」与「新增分区忘了加通配」两类错误，且类型要为每个子路径各自维护一份 `.d.mts`。包只有 24 个模块，用一整张入口换掉这一维判断更划算；这份成本集中在配置求值期的一次读表，不落在热循环里。
- **并入 `@greypan/test-kit`**：否决。测试基建包会反向依赖消费方的名字、路径与语料。

## 验收

- `packages/monorepo-kit` 的 `build` 只产出类型：没有 JS 产物，`dist/` 被 gitignore。`exports` 只有 `"."`，全仓不存在 `@greypan/monorepo-kit/` 开头的子路径引用。
- 包内测试全部位于各分区的 `__tests__/`，`turbo run test --filter=@greypan/monorepo-kit` 通过且不需要先 build。
- `scripts/lib/` 只剩 `turbo-cache-dir.sh`、`go-cache-dir.sh` 与两个同名测试。
- 全仓对 `scripts/lib/` 的引用只剩 bootstrap 路径与历史 ADR / 研究记录。
- `pnpm run check-pre-commit`、`check-policy`、`check-context`、`check-pack` 通过。
- `turbo run test --filter=@greypan/monorepo-kit` 通过，且第二次运行命中缓存。
- `pnpm run test-scripts` 的输出里不出现 `packages/monorepo-kit/`。
- 改动 `monorepo.json` 后，`turbo run test --filter=@greypan/web-ui --dry=json` 显示哈希变化。
- 五个 `vite.config.ts` 的测试端口行为与迁移前逐字一致（默认偏移 0 下仍为 63410–63460）。
