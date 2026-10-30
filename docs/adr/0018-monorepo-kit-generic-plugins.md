# ADR-0018: monorepo-kit 收敛为参数化能力包

- **Date**: 2026-10-29
- **Status**: 已接受

## 背景

[ADR-0017](./0017-monorepo-tooling-package.md) 的分区判据是「换仓库是否重写」，于是包里同时存在两种东西：真正与仓库无关的工具，以及写着本仓路径、项目名、语料位置与端口表的策略。混合形态有一个已经发生的失效：一个通用能力把消费方的包名写成了模块内常量。同类清单当时还长——locale 列表、包目录、前端路径、端口表位置、hook 名单、互链根集合、语料扫描范围。

本次目标不是再抽一个包，而是把这条边界做实：包里只保留任何 pnpm monorepo 都可能需要的能力与判定，本仓事实全部退回根 `scripts/`，由组合点传参。包 `private: true` 且不发布 npm；第二仓库复用是目标形态，不是交付物——在没有第二个真实消费者之前，不为其预建抽象。

## 决策

包内三个分区，判据从「换仓库是否重写」改成一条更窄的：**这段代码是否知道本仓的任何名字、路径或数据**。知道的去根 `scripts/policies/`，不知道的留在包里。

```text
packages/monorepo-kit/src/
  plugin/      # 一个能力一个目录：<能力>.ts 是插件，同目录的其余模块是它承载的检查单元
  runner/      # runChecks / runEntrypoint
  shared/      # 与领域无关的纯函数：readJsonFile、排序
```

能力与判定不按形态分家：检查单元与它依赖的那份能力同住一个 `plugin/<能力>/` 目录。一份判定归谁的判据是**它的权威输入由谁拥有**，不是它 import 了几个能力——任务输入哈希读 `turbo.json`，归 `turbo`；hook 状态读 `.vite-hooks/` 与 Git 配置，归 `git`。`shared/` 只留纯函数：子进程执行、Git 查询、workspace manifest 读取与仓库根定位都并入对应插件，其中按 `pnpm-workspace.yaml` 向上定位仓库根属于 pnpm 知识，不是通用文件工具。

七个能力插件用 `@greypan/js-kit` 的 `definePlugin` 组合，`.make()` 的产物就是检查 `run(ctx)` 收到的对象。

| 插件         | 能力                                                                      |
| ------------ | ------------------------------------------------------------------------- |
| `exec`       | 以 argv 运行子进程，返回 `status` / `stdout` / `stderr`                   |
| `git`        | 只读查询：staged 文件、`ls-files`、diff、仓库根                           |
| `workspace`  | pnpm 工作区：定位根、列 workspace manifest、读 manifest                   |
| `turbo`      | 读 `turbo.json`、解析任务输入与缓存目录                                   |
| `changesets` | `.changeset/` 目录、config 与 `changeset status` 的只读封装               |
| `toolchain`  | 有序步骤列表 `{ name, match, command, args, failOn: 'exit' \| 'stdout' }` |
| `test-ports` | 读取端口分配配置（默认 `monorepo.json`）、校验与偏移                      |

`toolchain` 之所以是插件而不是检查内联逻辑：同一份步骤表上要做「按 staged 文件匹配」与「并发执行」两件事，换仓库时变的是步骤表，不是匹配与汇总语义。

检查全参数化：每个检查以 `defineXxx(options)` 导出，仓库事实只能经 options 进入。

| 检查                                                             | 由组合点传入的仓库事实                                              |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| `readme-locales`                                                 | `locales`、跳过的目录                                               |
| `web-ui-docs-inputs`                                             | `packageDir`、prose 文件名集合                                      |
| `interweave-turbo-inputs`                                        | 前端目录、包名、额外输入文件                                        |
| `shell-i18n-catalog`                                             | `locales`、扫描目录                                                 |
| `command-conventions`                                            | 命名空间集合                                                        |
| `no-mutual-links`                                                | 互链检查的根集合                                                    |
| `context-corpus` / `-invariants`                                 | 语料根、commit scope 来源、符号链接对应表                           |
| `git-hooks-status`                                               | `required` hook 名单                                                |
| `script-tests`                                                   | 无（发现集合由 `git ls-files '*.test.mjs'` 现读，包内测试不在里面） |
| `test-ports`                                                     | 端口表文件名（默认 `monorepo.json`）                                |
| `test-port-call-sites`                                           | 扫描 glob、调用名                                                   |
| `package-contract`、`turbo-cache-invariant`、`turbo-input-paths` | 无（仓库事实从 `turbo.json` 与 `pnpm-workspace.yaml` 读出来）       |

检查协议不变：仍导出 `name` 与 `run(ctx)`，仍由 `runner/` 的 `runEntrypoint` 并发聚合输出格式、首个失败归因与非零退出。`run` 收到完整组合对象，检查自行解构所需能力；不引入「检查声明所需能力」的注册机制——那会换来一层运行时求值约定，而当前隔离失效的真实代价只是 review 时多看一眼。`runner/` 与本仓零耦合，是把一组函数变成协议的那一段，也是复用面里唯一会被每个消费仓库各自重写、随后漂移的东西。

本仓策略住在根 `scripts/policies/`，一个检查一个文件，导出配置好的检查实例；`scripts/checks/` 仍只做入口。仓库常量集中在这一个目录，「本仓的判据长什么样」只有一处可看，策略源码保持 `.mjs` + JSDoc，与根 `scripts/` 的既有语言一致。

能从仓库配置派生的常量不抄第二份：hook 名单由 `versionedGitHooks(root)` 从 `.vite-hooks/` 现读，安装器与状态检查共用同一份派生结果；workspace 容器目录由 `readPnpmWorkspaceDirectories(root)` 从 `pnpm-workspace.yaml` 的 `dir/**` 模式派生，语料、互链、端口调用点、环境诊断与 workflow 拓扑测试共用。策略实例经 `scripts/policies/repo-root.mjs` 按 `pnpm-workspace.yaml` 定位仓库根，不按目录深度写 `../..`。

构建形态是 TypeScript + `vp pack`：源码走 `@greypan/tsconfig/node.json`（`strict: true`），单入口产出 `dist/index.js` 与 `dist/index.d.ts`，`exports["."]` 指向 dist，`dist/` 被 gitignore。门禁与配置消费产物，因此「跑在上一次产物上」是这条链路的失效模式，前置条件逐处落实：根 `check-pre-commit` 前置一次 `turbo run build --filter=@greypan/monorepo-kit`（命中缓存约 0.2 秒，只有真改了门禁源码才走完整构建，而那正是必须重建的时候）；CI 把构建提到所有门禁之前，干净 runner 上先有 dist；`vp dev` / `vp test` / `turbo test` 已有 `dependsOn: ["^build"]`，不新增机制。残留风险明确接受：绕过入口直接跑 `check-policy` 而不先构建会读到旧产物，这类命令不在 hook 路径上、CI 从同一提交重建，它是本地便利入口而不是判定权威。

包内测试是 `src/**/__tests__/*.spec.ts`，由 `vp test run` 执行并配一份 `tsconfig.vitest.json`；命名为 `.spec.ts` 与 `js-kit` 一致，也让测试进入类型检查。`test` 不依赖 `build`：测试 import 源码，dist 的正确性由构建步骤与门禁自身的运行兑现，不额外写「dist 可导入」的测试。

## 后果

- 包里不再出现本仓路径、项目名与数据；第二仓库复用时的改动面是「写一份 `scripts/policies/`」，不是「改包」。
- 判定与仓库事实分离：改判据看检查，改本仓配置看 `policies/`，两处不互相污染。
- 包内测试进入 turbo 图并有类型检查；`install-git-hooks` 这类非入口消费者有共同的家，其中安装期用的那份名单不 import 包，否则 `pnpm install` 会依赖构建产物、在干净环境上形成 install 与 build 的循环。
- 参数面变大：每个检查多一层 `defineXxx` 包装，根 `scripts/` 多出一个 `policies/` 目录。
- 门禁依赖构建产物，提交路径多约 0.2 秒（改门禁源码时约 3 秒），CI 多一次显式构建步骤。
- 根 `scripts/*.mjs` 不在任何 tsconfig 的 program 里（仓库根没有 `tsconfig.json`），JSDoc 类型只在编辑器生效，`vp check` 不检查这一层。

## 替代方案

- **保持 ADR-0017 的分区，只修那一个已知实例**：零迁移成本，但包里仍散着本仓名字，「哪部分是通用能力」只能逐文件读。
- **新增独立的通用包，`monorepo-kit` 只留本仓策略**：边界更干净，但只有一个仓库和一个消费者的规模下，两个包带来的图与发布面成本换不到实际收益。
- **运行时源码直出，`vp pack` 只作发布预演**：新鲜度结构性成立、零成本，但产物没有任何消费者，打包能力第一次验证发生在真要发布时。
- **门禁读 dist 且入口校验源码与产物的哈希**：把静默失效变成显式失败，但每次改判据都要两步（build + 检查），本次选择由前置 build 直接消除旧产物的可能。
- **检查声明所需能力、组合点按需注入**：隔离更强，但多一层注册机制；当前检查全是只读纯函数，收益不足。
