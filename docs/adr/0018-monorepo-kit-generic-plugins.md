# ADR-0018: monorepo-kit 收敛为参数化能力包

- **Date**: 2026-10-29
- **Revised**: 2026-11-06
- **Status**: 已接受

## 背景

[ADR-0017](./0017-monorepo-tooling-package.md) 的分区判据是「换仓库是否重写」，于是包里同时存在真正与仓库无关的工具，以及写着本仓路径、项目名、语料位置与端口表的策略。混合形态有已经发生的失效：一个通用能力把消费方的包名写成了模块内常量；同类清单还有 locale 列表、包目录、前端路径、端口表位置、hook 名单、互链根集合与语料扫描范围。

本次目标不是再抽一个包，而是把边界做实：包里只保留任何 pnpm monorepo 都可能需要的能力与判定，本仓事实全部退回根 `scripts/`，由组合点传参。第二仓库复用是目标形态，不是交付物；没有第二个真实消费者之前不预建抽象。

## 决策

包内分区的判据从「换仓库是否重写」收窄一条：**这段代码是否知道本仓的任何名字、路径或数据**。知道的去根 `scripts/policies/`，不知道的留在包里。

`src/` 下一个能力一个目录，能力插件与它承载的判定同住；目录的 `index.ts` 是该分区的对外面。横切职责独立成区：链协议在 `runner/`，Vite 求值期适配在 `vite/`（走 `./vite` 子路径），与领域无关的纯函数在 `shared/`（不成体系、不开入口）。一份判定归谁，看**它的权威输入由谁拥有**，不看它 import 了几个能力：任务输入哈希读 `turbo.json`，归 `turbo`；hook 状态读 `.vite-hooks/` 与 Git 配置，归 `git`。只有「按 `pnpm-workspace.yaml` 向上定位仓库根」留在 `shared/`，因为根是触发层注入的 context。能力插件用 `@greypan/js-kit` 的 `definePlugin` 组合，`.make()` 的产物即判定在链上收到的 context。

检查全参数化：每个检查以 `defineXxx(options)` 导出，仓库事实只能经 options 进入。能力清单、每个检查接收的参数与插件组合形状都以源码为准（`src/<能力>/index.ts` 与各 `defineXxx` 签名），文档不维护可能漂移的枚举；链协议形状见 [ADR-0022](./0022-monorepo-kit-plugin-chain.md)。

本仓策略住在根 `scripts/policies/`，一个检查一个文件，导出配置好的检查实例；每次调用才知道的事实（changeset 的 `base`/`head`）由工厂接参，实例在入口组装时现造。`scripts/checks/` 仍只做入口。仓库常量集中在这一个目录，「本仓的判据长什么样」只有一处可看。

能从配置派生的常量不抄第二份：hook 名单从 `.vite-hooks/` 现读，workspace 容器目录从 `pnpm-workspace.yaml` 的 `dir/**` 派生；策略实例经 `scripts/policies/repo-root.mjs` 定位仓库根，不按目录深度写 `../..`。

构建形态是 TypeScript + `vp pack`：产物与 `exports` 一一对应，`dist/` 被 gitignore。门禁与配置消费产物，因此「跑在上一次产物上」是这条链路的失效模式，由 `check-pre-commit` 的前置 build 与 CI 的显式构建消除；细节见 `docs/agents/scripts-and-commands.md` 与本包 `AGENTS.md`。包内测试是 `src/**/__tests__/*.spec.ts`，由 `vp test run` 执行并参与类型检查，测试 import 源码、不依赖 build。

## 后果

- 包里不再出现本仓路径、项目名与数据；第二仓库复用时的改动面是「写一份 `scripts/policies/`」，不是「改包」。
- 判定与仓库事实分离：改判据看检查，改本仓配置看 `policies/`，两处不互相污染。
- 包内测试进入 turbo 图并有类型检查；安装期用的 hook 名单不 import 包，否则 `pnpm install` 会依赖构建产物、形成 install 与 build 的循环。
- 参数面变大：每个检查多一层 `defineXxx` 包装，根 `scripts/` 多出一个 `policies/` 目录；门禁依赖构建产物，提交路径多约 0.2 秒（改门禁源码时约 3 秒）。
- 根 `scripts/*.mjs` 不在任何 tsconfig 的 program 里，JSDoc 类型只在编辑器生效，`vp check` 不检查这一层。

## 替代方案

- **保持 ADR-0017 的分区，只修已知实例**：零迁移成本，但包里仍散着本仓名字，「哪部分是通用能力」只能逐文件读。
- **新增独立的通用包，`monorepo-kit` 只留本仓策略**：边界更干净，但只有一个仓库和一个消费者的规模下，两个包的图与发布面成本换不到收益。
- **运行时源码直出，`vp pack` 只作发布预演**：新鲜度结构性成立、零成本，但产物没有任何消费者，打包能力第一次验证发生在真要发布时。
- **门禁读 dist 且入口校验源码与产物的哈希**：把静默失效变成显式失败，但每次改判据都要两步；本次由前置 build 直接消除旧产物的可能。
- **检查声明所需能力、组合点按需注入**：否决，隔离更强但多一层注册机制，而检查全是只读纯函数，收益不足。
