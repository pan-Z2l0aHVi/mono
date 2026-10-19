# 构建与 CI

修改包脚本、Vite/Turbo 配置、外部化或 CI 流程时先读本指南；这些边界变化时，在同一变更里更新本文档。包清单、依赖边界与发布边界以 [`ARCHITECTURE.md`](../../ARCHITECTURE.md) 为权威。发布流程见 [`release.md`](release.md)，发布禁令与首次发布工具在本文末尾；worktree 与环境准备见 [`worktree.md`](worktree.md)。

## 各包命令

可构建的包使用 turbo 任务：`pnpm exec turbo <task> --filter=@greypan/<name>`。turbo 先完成 `^build`，裸 `pnpm --filter` 会绕过依赖构建，可能用到陈旧或缺失的 `dist`。包内非 turbo 脚本用 `pnpm --filter @greypan/<name> <script>` 直接运行。

影响面与契约查询见 monorepo-change-impact skill 的 SKILL.md，验证时点见 [`verification.md`](verification.md)。`check-pack` 在构建可发布包或修改 exports、files 或 Vite 输出时运行，验证实际发布文件与 manifest export targets。

## Demo 开发

各 demo 与 Interweave 的开发命令以根 `package.json` 的 `dev:` namespace 为准。根目录 aliases 通过 Turbo `dev` task 构建上游工作区包，并启动每个包的持久 `dev` 进程。

不要改用 `turbo watch`：包级 Vite 与 tsdown 监听器已经会重建源文件变更，`turbo watch` 还会监控 Git 控制文件，编辑器或 agent 工具更新工作树时可能重启全部 dev 进程。修改包图、lockfile 或 Turbo 配置后需重启开发命令；普通源文件变更由包级监听器继续处理。

Interweave 由 Wails 宿主管理嵌套前端，其 alias 只启动 Wails host，并构建、监听 WebView frontend 的上游依赖，不要额外启动重复的前端进程。修改 Vite 插件、TypeScript 配置或工作区依赖图后需重启宿主进程。

## 生成物生命周期

生成文件不是 source of truth，禁止手动编辑，但应运行仓库配置的 generator 让工具产生 diff，再验证生成结果与消费者。不要用复制、补丁或格式化工具直接改写输出。

构建期自动生成的产物包括：`web-ui` 图标模块、React demo 的路由树、Vue demo 与 Interweave frontend 的路由类型与 auto-import 声明，以及 Interweave frontend 的 TypeScript bindings。每类产物都由同一个 generator 产生；具体命令与完成证据以各包配置和相应测试为准。

[`packages/web-ui/docs/*.md`](../../packages/web-ui/docs/) 是 demo 示例与 API 表的唯一输入。generator 在 dev 与 build 时写盘，测试期只判不改；两个 demo 与 `web-ui` 的 parity 测试保证产物与 markdown 一致、两端产物逐字节一致。改动组件 API 必须同时改对应 markdown。生成器的输入契约与校验规则以 `@greypan/md-to-comp` 的测试为准。

这些语料必须进入本包 `build` 与 `test` 的 turbo inputs：根配置排除 Markdown，包级 `turbo.json` 重新纳入，并由 `pnpm run check-policy` 中的 `web-ui-docs-inputs` 检查守护。

`apps/interweave/frontend/bindings/**` 只经单一 generator 入口生成。生成过程不得删除已有文件，并用产出集合守卫防止静默少产出；陈旧文件由人工清理。frontend 的 turbo inputs 由 Go 源、Go 模块文件与 bindings generator 构成。

`**/__screenshots__/` 与 `**/.vitest-attachments/` 是测试证据，不是应用代码生成物。除非任务明确要求并已完成对应的视觉或浏览器验证，不要创建、手改或提交。根 [`AGENTS.md`](../../AGENTS.md#不可绕过的仓库边界)在入口层声明同一约束，本节承载处方。

## TypeScript 配置

共享配置在 `packages/tsconfig/`，通过 `"extends": "@greypan/tsconfig/<profile>.json"` 引用。面向 DOM 与 Node 的包把配置拆成 `tsconfig.node.json`、`tsconfig.app.json` 和 `tsconfig.vitest.json`，纯 Node 包只用单个 `tsconfig.json`。每个包声明自己的 `include` 与 `tsBuildInfoFile`；需要路径别名时再声明 `paths`，不要为形式统一添加空配置。

## 库构建模式

公共面是固定入口集合的包用 `vp pack`（基于 tsdown，可以多入口，输出 `.mjs` 与 `.d.mts`，自动生成声明文件并从依赖中外部化）。公共面含通配子路径导出或需要 Vite CSS/资源管线的包用 `vp build`（Vite library 模式配 `preserveModules`，输出 `.js` 与 `.d.ts`，需要手动配置外部化）。具体选择以各包 manifest 与 `vite.config.ts` 为准，入口数量本身不是判据。`packages/tsconfig` 无构建步骤，只提供通过 TypeScript `extends` 消费的 JSON 文件。

## 外部化规则

匹配 `@greypan/*` 的工作区依赖与 Node 内置模块必须外部化，以保证监听模式可解析并避免重复的消费端代码。第三方依赖在设计意图为零配置消费时可以打包，期望消费端自行提供时外部化。优先用正则而非工作区包列表，并让它同时匹配子路径导入。逐包的外部化清单以各包 `vite.config.ts` 为准。

## 应用

消费方在各自的 `package.json` 声明同一份 browserslist 目标，根 `package.json` 没有目标值；改目标时同步所有声明处，具体清单以 manifest 为准。`web-ui` 是唯一在构建时输出 CSS 的包；静态 `color-mix()` 由 lightningcss 求值，含 `var()` 的 `color-mix()` 保留为运行时 CSS。纯 JavaScript 库包统一声明 `engines`，具体值以各包 `package.json` 为准。

两个 demo 用 `basicSsl()` 为 dev server 提供安全上下文：Service Worker 与 `navigator.clipboard` 只在安全上下文可用，而 demo 设了 `server.host: true`。该插件只作用于 dev server，生产构建不受影响。各 demo 的插件、测试面与构建差异以各应用 `vite.config.ts` 与 [`verification.md`](verification.md) 为准。`depsReload` 监听库的 `dist/` 目录，本地依赖变化时触发整页刷新。嵌套 WebView 前端遵循对应框架 demo 的 Vite 插件与本地包约定。

## CI 门控与 workflow 拓扑

workflow 的真实触发面、`permissions`、job `needs` / `if`、step `id`、构建矩阵与安装面以 YAML 本身为权威。`.github/scripts/lib/workflow-topology.mjs` 只声明跨 workflow 的少量不变量（发布分支、required context 与 policy step），同目录的 `workflow-topology.test.mjs` 读取真实 YAML 逐项比对，包括两个 Wails workflow 的原生构建矩阵必须一致，并通过 `test-scripts` 与 CI 的 `check` 强制执行。改 workflow 或该声明而不同步，`check` 会失败；不要在本文件复制这些细节。

CI 构建 workspace 包并跳过 Interweave app wrapper；Wails verify / release 在原生 runner 上构建 frontend 依赖闭包并打包应用。workflow 的 path filter 由 frontend package manifests 的传递依赖图校验。npm 发布通过 Trusted Publishing 绑定 workflow 文件路径，重命名 `npm-publish.yml` 需同步更新 npm 注册。

合并门控只放行 required checks 通过的 PR；具体 context 集合与 strict 策略属于远端规则集状态，以仓库当前规则为准。`GITHUB_TOKEN` 创建的版本 PR 可能需要人工批准挂起的 run；不归属到具体用户的改动需要额外 approval，且 PR 作者不能批准自己的改动。此 access-control approval 不等于独立 review，review 规则见 [`review.md`](review.md)；挂起与发布恢复的操作细节见 [`release.md`](release.md)。

`deploy-pages.yml` 只发布 `DEMO_APPS` 列出的 demo 应用到 `/mono/<name>/`，不遍历全部 `apps/<name>`，也没有根落地页。History 路由的深层链接依赖 404 回退：应用必须在创建路由器之前恢复 `redirect`，未知路径保持 404。

未经用户授权不执行发布。取得授权的机制见 [`workflow.md`](workflow.md#怎么取得这个授权)。不得直接运行 `npm publish`，首次发布用 `pnpm publish-new-pack <package-dir>`。Git 检查的绕过禁令见 [`commit.md`](commit.md)。

## PR changeset gate

PR changeset gate 由 CI 对 PR base/head 执行 `pnpm run check-changeset`（含 `changeset status` 与自定义内容检查）；本地 pre-commit 政策检查不运行该检查。版本 PR 按条件豁免。required check 覆盖 CI 与仓库硬约束，不等于 PR review；review 规则见 [`review.md`](review.md)。
