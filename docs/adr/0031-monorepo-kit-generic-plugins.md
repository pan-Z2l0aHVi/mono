# ADR-0031: monorepo-kit 收敛为参数化能力包

- **Date**: 2026-10-29
- **Status**: 已接受
- **Relates to**: [ADR-0030](./0030-monorepo-tooling-package.md)（包边界与分区，本 ADR 替代其 §1、§2 与 §5 的测试排除）、[ADR-0027](./0027-script-execution-surfaces.md)（脚本执行面分类、`scripts/` 目录职责）

## 背景与取舍

ADR-0030 把门禁实现与仓库编排收进 `@greypan/monorepo-kit`，解决了相对路径深度、测试归属与依赖边三个问题。但它的分区判据是「换仓库是否重写」，于是包里同时存在两种东西：`shared/` 里真正与仓库无关的工具，以及 `policy/`、`repo/` 里写着本仓路径、项目名、语料位置与端口表的策略。

这个混合形态有一个已经发生的结果：`policy/script-tests.mjs` 曾把 `packages/monorepo-kit` 写成模块内常量，一个通用能力因此知道了消费方的包名。那次修复把排除项移交给入口，方向是对的，但只修了一个实例。清单还长：`readme-locales` 的 locale 列表、`web-ui-docs-inputs` 的包目录、`interweave-turbo-inputs` 的前端路径、`shell-i18n-catalog` 的 locale 与目录、`no-mutual-links` 的根集合、`git-hooks-status` 的 hook 名单、`test-ports` 的端口表位置。

本次的目标不是「再抽一个包」，而是把这条边界做实：包里只保留任何 pnpm monorepo 都可能需要的能力与判定，本仓事实全部退回根 `scripts/`，由组合点传参。包当前 `private: true` 且不发布 npm；第二仓库复用是目标形态，不是本次的交付物——在没有第二个真实消费者之前，不为其预建抽象。

## 决策

### 1. 包内四分区：能力、判定、协议、工具

```text
packages/monorepo-kit/src/
  plugins/   # 能力插件，defineXxx(options) → 可组合插件
  checks/    # 检查单元，defineXxx(options) → { name, run }
  runner/    # runChecks / runEntrypoint
  shared/    # 与领域无关的纯函数：readJsonFile、排序
```

原先 `policy/`、`repo/` 两个分区取消。判据从「换仓库是否重写」改成一条更窄的：**这段代码是否知道本仓的任何名字、路径或数据**。知道的，去根 `scripts/policies/`；不知道的，留在包里。

`shared/` 收缩成纯工具。`exec`、`git`、`workspace-manifests` 并入对应插件，`repo-root`（按 `pnpm-workspace.yaml` 向上定位仓库根）并入 workspace 插件——那是 pnpm 知识，不是通用文件工具。

### 2. 七个能力插件

能力插件用 `@greypan/js-kit` 的 `definePlugin` 组合；`.make()` 的产物就是检查 `run(ctx)` 收到的对象。

| 插件         | 能力                                                                      |
| ------------ | ------------------------------------------------------------------------- |
| `exec`       | 以 argv 运行子进程，返回 `status` / `stdout` / `stderr`                   |
| `git`        | 只读查询：staged 文件、`ls-files`、diff、仓库根                           |
| `workspace`  | pnpm 工作区：定位根、列 workspace manifest、读 manifest                   |
| `turbo`      | 读 `turbo.json`、解析任务输入与缓存目录                                   |
| `changesets` | `.changeset/` 目录、config 与 `changeset status` 的只读封装               |
| `toolchain`  | 有序步骤列表 `{ name, match, command, args, failOn: 'exit' \| 'stdout' }` |
| `test-ports` | 读取根 `monorepo.json` 的端口分配、校验与偏移                             |

`toolchain` 之所以是插件而不是检查内联逻辑：`staged-clean` 需要在同一份步骤表上做「按 staged 文件匹配」与「并发执行」两件事，换仓库时变的是步骤表，不是匹配与汇总语义。

### 3. 检查全参数化

每个检查都以 `defineXxx(options)` 导出，仓库事实只能经 options 进入：

| 检查                                        | 由组合点传入的仓库事实                    |
| ------------------------------------------- | ----------------------------------------- |
| `readme-locales`                            | `locales`、跳过的目录                     |
| `web-ui-docs-inputs`                        | `packageDir`、prose 文件名集合            |
| `interweave-turbo-inputs`                   | 前端目录、包名、额外输入文件              |
| `shell-i18n-catalog`                        | `locales`、扫描目录                       |
| `command-conventions`                       | 命名空间集合                              |
| `no-mutual-links`                           | 互链检查的根集合                          |
| `context-corpus` / `-invariants`            | 语料根、commit scope 来源、符号链接对应表 |
| `git-hooks-status`                          | `required` hook 名单                      |
| `script-tests`                              | glob、排除目录                            |
| `test-ports`                                | 端口表数据（仍读根 `monorepo.json`）      |
| `package-contract`、`turbo-cache-invariant` | 无（本就与仓库无关）                      |

检查协议不变：仍导出 `name` 与 `run(ctx)`，仍由 `runEntrypoint` 并发聚合。`run` 收到的是完整组合对象，检查自行解构所需能力；不引入「检查声明所需能力」的注册机制——那会换来一层运行时求值约定，而当前隔离失效的真实代价只是 review 时多看一眼。

`runner/` 留在包内。它是把一组函数变成协议的那一段（输出格式、首个失败的归因、非零退出），也是复用面里唯一会被每个消费仓库各自重写、随后漂移的东西。它与本仓零耦合，是全包最该留下的模块。

### 4. 本仓策略退回根 `scripts/policies/`

```text
scripts/
  policies/                # 本仓的仓库事实与配置好的检查实例
    readme-locales.mjs     # export const readmeLocales = defineReadmeLocales({ locales: ['CN'], … })
    git-hooks.mjs          # hook 名单，不 import 包（安装期要读）
    git-hooks-status.mjs   # 上面那份名单 + 指引，配置好的 git-hooks-status
    …
  checks/                  # 仍只做入口：import 实例 + runEntrypoint
```

一个检查一个文件。仓库常量集中在这一个目录，`pnpm why @greypan/monorepo-kit` 仍能回答「谁在消费哪些能力」，但「本仓的判据长什么样」只有一处可看。策略源码保持 `.mjs` + JSDoc，与根 `scripts/` 的既有语言一致。

`scripts/maintenance/install-git-hooks.mjs` 改从 `scripts/policies/git-hooks.mjs` 取 hook 名单，不再 import 包。这条边独立于通用化：`prepare` 会在 `pnpm install` 期间运行它，若它依赖包，安装期就需要构建产物，干净环境上会形成 install 与 build 的循环。

### 5. 构建形态改为 TS + `vp pack`，门禁前保障产物新鲜

- 源码改为 TypeScript，走 `@greypan/tsconfig/node.json`（`strict: true`）；`vp pack` 单入口产出 `dist/index.js` 与 `dist/index.d.ts`。`exports` 仍只有 `"."` 与 `"./package.json"`，指向 dist。
- 门禁与配置消费 dist。ADR-0030 §1 否决「运行时也要构建」的理由是「hook 会跑在上一次产物上」。本次不为产物放弃判定，而是把这个前置条件逐处落实：
  - 根 `check-pre-commit` 脚本前置 `turbo run build --filter=@greypan/monorepo-kit`。命中缓存约 0.2 秒；只有真的改了门禁源码才走完整构建（约 3 秒），而那正是必须重建的时候。hook 与手动运行同一条命令，覆盖两处。
  - CI 把 `turbo run build` 提到所有门禁之前（`check-context`、`check-policy`、`check-changeset`、`check-pack`），干净 runner 上先有 dist；生成物新鲜度检查仍排在 build 之前。
  - `vp dev` / `vp test` / `turbo test` 已有 `dependsOn: ["^build"]`，不需要新增机制。
  - 全新环境由既有流程覆盖：worktree 文档要求在实施前跑 `pnpm run build`，且 `pnpm install` 不再需要 dist。
- 残留风险明确接受：直接运行 `pnpm run check-policy` 这类命令而没有先构建，会读到旧产物。这类命令不在 hook 路径上，CI 从同一提交重建，它是本地便利入口而不是判定权威。

### 6. 测试跟随新工具链

- 包内测试改 `src/**/__tests__/*.spec.ts`，由 `vp test run` 执行，配一份 `tsconfig.vitest.json`。命名为 `.spec.ts` 与 `js-kit` 一致，也让测试进入类型检查。
- `test` 仍不依赖 `build`：测试 import 源码。dist 的正确性由构建步骤与门禁自身的运行来兑现，不额外写「dist 可导入」的测试。
- 包内不再有 `*.test.mjs`，`checks/script-tests.ts` 的 `exclude` 参数因此失去消费者。收尾切片删除该参数、对应测试断言，以及 ADR-0030 修订（五）。

### 7. 增量迁移，垂直切片

第一个切片是把构建形态切过去：`.mjs` → `.ts` + `strict`、`vp pack`、`exports` 指向 dist、`vp test`、CI 重排、`check-pre-commit` 前置 build、`install-git-hooks` 解耦。它不改任何判定行为，只是让「门禁读 dist」这个前提成立。

其后每个切片迁移一个检查，连带它需要的插件：`staged-clean` → `command-conventions` → `no-mutual-links` → `readme-locales` → `shell-i18n-catalog` → `context-*` → 其余检查收尾。每片结束时 `check-pre-commit`、`check-policy`、包内测试全绿，回滚只影响一个检查。

## 后果

正向：

- 包里不再出现本仓路径、项目名与数据；第二仓库复用时的改动面是「写一份 `scripts/policies/`」，不是「改包」。
- 检查的判定与仓库事实分离：改判据看检查，改本仓配置看 `policies/`，两处不互相污染。
- 策略实例集中在一个目录，`install-git-hooks` 这类非入口消费者有共同的家，不必回头依赖包。
- 包内测试进入 turbo 图，有类型检查；`.spec.ts` 与 `js-kit` 统一。

代价与风险：

- 24 个模块迁到 `strict` TypeScript 是本次最大的一次性工作量；`noImplicitAny: false` 的历史豁免随之取消。
- 参数面变大：每个检查多一层 `defineXxx` 包装，根 `policies/` 多出一个目录。
- 门禁依赖构建产物，提交路径多约 0.2 秒（改门禁源码时约 3 秒），CI 多一次显式构建步骤。
- 直接运行 `check-policy` 等命令而未构建时会读旧产物。
- 根 `scripts/*.mjs` 不在任何 tsconfig 的 program 里（仓库根没有 `tsconfig.json`），JSDoc 类型只在编辑器生效，`vp check` 不检查这一层。
- 一个 PR 的 diff 较大；切片用于保留可回滚边界。

## 备选方案

- **保持 ADR-0030 的分区，只修 `script-tests` 那一个实例**：零迁移成本，但包里仍散着本仓名字，「哪部分是通用能力」只能逐文件读。
- **新增独立的通用包，`monorepo-kit` 只留本仓策略**：边界更干净，但只有一个仓库和一个消费者的规模下，两个包带来的图与发布面成本换不到实际收益。
- **运行时源码直出，`vp pack` 只作发布预演**：新鲜度结构性成立、零成本，但产物没有任何消费者，打包能力第一次验证发生在真要发布时。
- **门禁读 dist 且入口校验源码与产物的哈希**：把静默失效变成显式失败，但每次改判据都要两步（build + 检查），且 CI 仍需重排；本次选择由前置 build 直接消除旧产物的可能。
- **检查声明所需能力、组合点按需注入**：隔离更强，但多一层注册机制；当前检查全是只读纯函数，收益不足。

## 验收

- `packages/monorepo-kit` 内不出现本仓的包名、应用路径、locale 列表、端口数据或语料路径；全部经 `defineXxx(options)` 由 `scripts/policies/` 传入。
- 包内分区只剩 `plugins/`、`checks/`、`runner/`、`shared/`；`exports` 只有 `"."` 与 `"./package.json"`，指向 dist。
- `packages/monorepo-kit` 的 `build` 产出 `dist/index.js` 与 `dist/index.d.ts`，`dist/` 被 gitignore。
- 干净 clone 上 `pnpm install` 通过，不触发构建；`pnpm run check-pre-commit` 在无 dist 时先构建再判定。
- `pnpm run check-pre-commit`、`check-policy`、`check-context`、`check-pack`、`check-changeset`、`check-go`、`test-scripts` 通过。
- `turbo run test --filter=@greypan/monorepo-kit` 通过，且不需要先 build；包内测试全部为 `.spec.ts`。
- CI 中所有门禁步骤都在 `turbo run build` 之后。
- `scripts/policies/` 是唯一出现本仓门禁事实的目录；`scripts/checks/` 仍只有入口。
