# 构建与发布架构

在修改包脚本、Vite/Turbo 配置、外部化或 CI/发布流程之前，请先阅读本指南。当这些细节发生变化时，应在同一变更中更新本文档。

包清单和依赖边界以 [`CONTEXT.md`](../../CONTEXT.md) 为权威来源；release terminology 以 [ADR-0009](../adr/0009-release-planes.md) 为权威来源，本指南只描述构建、验证和发布流程。

## 各包命令

每个包暴露其所需的命令：所有可构建的包都有 `build`，大多数有 `dev`（监听模式），只有包含维护的自动化测试覆盖率的包才暴露 `test`。使用 `pnpm --filter @greypan/<name> <script>` 运行它们；例如，`pnpm --filter @greypan/js-kit test`。

## Demo 开发

根目录的 demo 命令首先构建上游工作区包，然后使用 `turbo run dev --filter=<demo>...` 启动每个包的持久 `dev` 进程。不要对这些命令使用 `turbo watch`：包级别的 Vite 和 tsdown 监听器已经会重建源文件变更，而 `turbo watch` 还会监控 Git 控制文件，当编辑器或 agent 工具更新 Git 工作树时可能会重启所有 dev 进程。

在修改包图、lockfile 或 Turbo 配置后，需要重启 demo 命令。普通的源文件变更会由运行中的包级监听器继续处理。

对于由宿主运行时管理嵌套前端的集成应用，先从目标应用的 `package.json`、最近的 `AGENTS.md` 与任务配置确认依赖筛选器。若宿主任务已负责前端开发服务器，只构建前端的上游依赖，不要额外启动重复的前端进程。在修改 Vite 插件、TypeScript 配置或工作区依赖图后，需要重启宿主开发进程。

不同包类型的构建脚本不同：

- **单入口包**（`test-kit`、`unplugin-web-components`、`deps-reload`）：`vp pack`，基于 tsdown，输出 `.mjs` 和 `.d.mts`。
- **子路径导出包**（`js-kit`、`browser-kit`、`web-ui`）：`vp build`，使用 Vite library 模式配合 `preserveModules`，输出 `.js` 和 `.d.ts`。
- **React 应用**：`vp build`。
- **Vue 应用**：`vue-tsc --build && vp build`。
- **tsconfig**：无构建步骤；它提供通过 TypeScript `extends` 消费的 JSON 文件。

在工作区根目录运行 `pnpm run check:code` 进行 CI 代码质量检查：`vp check` 运行格式化、lint 与 TypeScript 类型检查（通过 `fmt.ignorePatterns` 排除第三方 `.agents/skills/`）；`check:go` 自动发现所有 `go.mod` 并运行 `go vet`。提交 hook 的 `vp staged` 对暂存路径运行 `vp check --fix`，并额外对暂存的 `.go` 文件运行 `gofmt -w`、对 `.css/.vue` 运行 `stylelint --fix`。包构建命令不能替代这些命令；Wails 的 macOS/Windows 原生构建仍负责验证 host package 与平台集成。

构建可发布 package 或修改其 `exports`、`files`、Vite 输出时，在根构建成功后运行 `pnpm run check:pack`。该检查使用 `pnpm pack --dry-run` 验证实际发布文件与 manifest export targets；它不判断 API 语义或版本级别。任务开始时使用 `pnpm find:usages -- <paths...>`，取得由 `pnpm-workspace.yaml` 纳入的受影响 workspace、最小读取 context、所需证据与最小充分验证建议；需要确认公开入口时使用 `pnpm inspect:contract -- <published-package>`，需要审阅 Git 变更集的 manifest-level semver 候选时使用 `pnpm diff:contract -- --base <git-ref>`；对 Git 变更集可传入 `--base <git-ref>`、`--staged` 或 `--worktree`。

对于 `web-ui`，`pnpm --filter @greypan/web-ui generate-icons` 从 `icons.used.json` 重新生成图标模块。Vite 插件也会在 `vp build` 期间自动运行它。

## 生成物生命周期

生成文件不是 source of truth，禁止手动编辑；但这不等于禁止使用仓库配置的 generator。若源码或配置的变更会影响受版本控制的代码生成物，必须运行所属 generator，让工具产生 diff，再验证生成结果和消费者。不要通过复制、补丁或格式化工具直接改写输出。

| 场景                           | source of truth                                            | 受控生成入口                                                                            | 完成证据                                                                                                 |
| ------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| React 文件路由                 | `apps/react-web-ui-demo/src/routes/**` 与 `vite.config.ts` | `pnpm --filter @greypan/react-web-ui-demo build`（TanStack Router Vite plugin）         | `src/routeTree.gen.ts` 仅由 generator 更新；`check:code` 通过，并在真实浏览器访问新增/修改的路由。       |
| Vue auto import / typed router | Vue 源码与 `apps/vue-web-ui-demo/vite.config.ts`           | `pnpm --filter @greypan/vue-web-ui-demo build`（Vite plugins）                          | `auto-imports.d.ts`、`typed-router.d.ts` 仅由 plugin 更新；`vue-tsc --build` 与受影响路由/页面验证通过。 |
| Wails frontend bindings        | 公开 Go API、`apps/interweave/frontend/package.json`       | `pnpm --filter @greypan/interweave-frontend build`（先执行 `wails3 generate bindings`） | 核对 `frontend/bindings/**` 的 generator diff，并运行 frontend 类型检查/构建和受影响调用点验证。         |
| web-ui icons                   | `packages/web-ui/icons.used.json`                          | `pnpm --filter @greypan/web-ui generate-icons` 或 `vp build`                            | 图标模块只由 generator 更新，并完成 package build 与公开契约验证。                                       |

`**/__screenshots__/` 与 `**/.vitest-attachments/` 属于测试证据，而不是应用代码生成物。除非任务明确要求并已经完成对应的视觉/浏览器验证，不要创建、手改或提交这些文件。

## TypeScript 配置

共享配置文件位于 `packages/tsconfig/`，通过 `"extends": "@greypan/tsconfig/<profile>.json"` 引用。

| 配置文件     | 层级     | 使用者                                  | 继承自                              |
| ------------ | -------- | --------------------------------------- | ----------------------------------- |
| `core.json`  | 1：纯 JS | `js-kit`                                | `./base.json`                       |
| `node.json`  | 2：Node  | Node 包和所有 `tsconfig.node.json` 文件 | `@tsconfig/node24` 加 `./base.json` |
| `dom.json`   | 3：DOM   | `browser-kit`、`web-ui`                 | `./base.json`                       |
| `react.json` | 4：框架  | `react-web-ui-demo`                     | `./dom.json`                        |
| `vue.json`   | 4：框架  | `vue-web-ui-demo`                       | `@vue/tsconfig` 加 `./dom.json`     |

每个包添加自己的 `include`、`paths` 和 `tsBuildInfoFile`。面向 DOM 和 Node 的包将其配置拆分为 `tsconfig.node.json`、`tsconfig.app.json` 和 `tsconfig.vitest.json`；纯 Node 包只使用一个 `tsconfig.json`。

## 库构建模式

`vp pack` 使用 tsdown 处理单入口包。它通过 `pack` 块配置，无需 `vite-plugin-dts` 即可生成声明文件，并自动外部化依赖。`test-kit`、`unplugin-web-components` 和 `deps-reload` 使用此模式。

`vp build` 使用 Vite library 模式处理具有子路径导出的包。它通过 `build.lib` 和 `preserveModules: true` 配置，使用 `vite-plugin-dts` 生成声明文件。`js-kit`、`browser-kit` 和 `web-ui` 使用此模式。

## 外部化规则

- 匹配 `@greypan/*` 的**工作区依赖**必须被外部化。Vite library 包通过 `rollupOptions.external` 实现；tsdown 从依赖中自动处理。这确保了监听模式的可解析性并避免重复的消费端代码。
- **Node 内置模块**如 `node:path` 必须被外部化。
- **第三方依赖**在设计意图为零配置消费时可以被打包；当期望消费端自行提供时应外部化。
- 优先使用正则表达式而非工作区包列表。同时匹配子路径导入，例如 Lit 模式 `/^lit($|\/)/`。
- `web-ui` 外部化其框架依赖，因此消费端必须安装 `lit` 作为依赖。
- 对于包含外层宿主工作区和嵌套前端工作区的应用，宿主任务、构建目标、生成绑定与资源目录均以目标应用的 manifest、包级 `AGENTS.md`、任务配置和 CI workflow 为准；通用指南不复制应用专属的筛选器、平台矩阵或发布产物名称。生成绑定、前端产物、缓存和依赖通常是一次性产物；任务配置、平台模板、图标和打包资源是否保留必须以目标应用的清理脚本为准。

| 包                        | 外部化                                                                   | 打包的第三方依赖 |
| ------------------------- | ------------------------------------------------------------------------ | ---------------- |
| `js-kit`                  | `@greypan/*`、`remeda`、`nanoid`                                         | 无               |
| `browser-kit`             | `@greypan/*`、`nanoid`、`remeda`、`copy-to-clipboard`、`msw`             | 无               |
| `test-kit`                | 通过 tsdown 自动处理：`@greypan/js-kit`、`msw`                           | 无               |
| `web-ui`                  | `@greypan/*` 加框架正则匹配 `lit`、`@lit`、`react`、`react-dom` 和 `vue` | 无               |
| `unplugin-web-components` | 通过 tsdown 自动处理：`@greypan/js-kit`、`change-case`、`unplugin`       | 无               |
| `deps-reload`             | 通过 tsdown 自动处理：`node:*`、`@greypan/js-kit`、`unplugin`            | 无               |

## 应用

- `react-web-ui-demo` 使用 `@vitejs/plugin-react` v6（workspace catalog 当前版本）配合 React Compiler（`babel-plugin-react-compiler`，目标 19），加上 `@vitejs/plugin-legacy` 支持旧版浏览器。React 和 Vue demo 应用目前依赖浏览器验证而非维护的单元测试套件。
- demo 应用和 `web-ui` 共享相同的 browserslist 目标（Chrome/Edge >=111、Safari/iOS >=16.4、Firefox >=128、非 dead），这与 Tailwind v4 的支持矩阵一致。`web-ui` 是唯一在构建时输出 CSS 的包；其静态 `color-mix()` 调用由 lightningcss 评估，而包含 `var()` 的 `color-mix()` 作为运行时 CSS 保留并依赖上述目标。
- 库包（`js-kit`、`browser-kit`、`test-kit`、`deps-reload`、`unplugin-web-components`）仅包含 JavaScript，不输出 CSS，因此没有 `browserslist` 字段；它们统一声明 `engines.node >=20.11.0`。该下限覆盖了 `deps-reload` 中的 `import.meta.dirname`（Node 20.11+），与 vite/vitest 的 peer 版本范围（^20.19 / ^20）对齐，并排除了已停止维护的 Node 18 和 20 版本。
- 两个 demo 应用都使用 `basicSsl()` 进行 HTTPS 开发服务器配置。
- `depsReload` 监听库的 `dist/` 目录，当本地依赖发生变化时触发整页刷新。
- 使用嵌套 WebView 前端的集成应用遵循相应框架 demo 的 Vite 插件和本地包约定；宿主运行时的插件负责生成其绑定。

## CI 与发布

- `ci.yml` 是针对 pull request 和推送到 `main` 的完整验证工作流：共享 agent context、changeset 状态、构建、格式化/lint/类型检查和测试。它还接受 `workflow_dispatch` 触发来处理版本 PR，覆盖由自动化令牌创建的版本 PR 可能不会触发初始 pull request 事件的情形。PR 和手动触发的运行共享一个以分支为键的 `concurrency` 组（`github.head_ref || github.ref_name`），因此 `cancel-in-progress` 会将两者合并为单次运行而非重复构建。原生应用所需的系统前置条件以当前 workflow 和工具配置为准。
- `changeset-version.yml` 在推送到 `main` 时创建或更新 Changesets 版本 PR，并通过 `changesets/action` 的 `version` 输入调用 `pnpm run release:version`。包专属的版本同步由相应脚本负责；默认更新与 `--check` 验证的语义以该脚本为准。公共包与私有原生应用所需的工具链和后续验证分别由当前 workflow 决定；版本 workflow 不直接发布包或安装程序。
- `npm-publish.yml` 仅发布公共 npm 包。其 `pull_request.closed` 触发器限定为 `packages/**`，然后仅在 `changeset-release/main` 合并到 `main` 时运行，检测实际的公共包版本变更，在合并 SHA 上重建 `packages/*` Turbo 图并通过 npm Trusted Publishing 发布。发布成功后，一个独立的最小权限作业为每个包版本创建幂等的 GitHub Release 和标签，附带 npm 和包 changelog 的链接。它不使用私有原生应用的工具链或长期 npm token。
- 私有原生应用的验证 workflow 处理目标应用路径、其 WebView frontend 的直接 workspace runtime dependencies 或手动触发，校验同步元数据并在对应的原生目标上构建验证产物；当前 Wails 验证还覆盖 `packages/web-ui/**`、`packages/browser-kit/**` 和 `packages/js-kit/**`。发布 workflow 保持只在目标应用版本变更后的受控合并上创建带校验和的安装程序 Release，且私有应用永远不会发布到 npm。workflow 文件、路径筛选器、平台矩阵、产物保留期和 Release 命名均以当前配置为准。
- `main` 必须受到保护，确保产品变更通过 pull request 合入。在 GitHub 分支保护中要求 `CI` 通过；原生应用验证保持路径触发而非全局必需检查，因此不相关的 PR 无需等待原生运行环境。
- Changesets 版本 PR 使用 `GITHUB_TOKEN` 创建，因此其自身的 `pull_request` 触发的 CI 会被 GitHub 的 pwn-request 保护标记为 `action_required`，在获批准前不会运行。由于 `main` 规则集要求 `check` 上下文，合并版本 PR 需要先批准那个被挂起的运行（Actions 运行页面，或 `gh api repos/<owner>/<repo>/actions/runs/<id>/approve`）。`changeset-version.yml` 触发的 `workflow_dispatch` 运行已经验证了相同的提交，因此批准只是为了满足合并门控；分支键控的 `concurrency` 组随后会在两者同时运行时将已批准的运行与调度运行合并。
- `deploy-pages.yml` 中的部署是手动触发的，通过一个 `actions/deploy-pages` 产物部署作业级 `DEMO_APPS` 列表中的每个可部署 Demo。它仅安装 Node 和 pnpm，因为 Pages 不需要私有原生应用的工具链。每个条目是 `apps/<name>` 目录，服务路径为 `/mono/<name>/`；构建命令使用 pnpm 的 `{./apps/<name>}...` 目录选择器而非 npm 包名。站点没有根落地页。
- 每个可部署 Demo 必须支持 History 路由深层链接。GitHub Pages 将未匹配的请求路由到根 `404.html`；它根据 `DEMO_APPS` 验证应用名称，将请求的路由保存在 `redirect` 中，并加载应用根目录。在生产环境中，应用必须在创建路由器之前恢复 `redirect`。未知路径保持 404 响应。
- npm Trusted Publishing 通过 OIDC `job_workflow_ref` 声明绑定到工作流文件路径。重命名或移动 `npm-publish.yml` 会使现有的 trusted-publisher 注册失效：即使设置了 `id-token: write`，`pnpm changeset publish` 也会因 `ENEEDAUTH` 失败。在重命名工作流的同一变更中更新 npmjs.com 上对应的 trusted publisher。

## Release context

发布流程和 release plane 的术语、边界与授权模型见 [ADR-0009](../adr/0009-release-planes.md)。本指南只保留执行流程和 release safety boundary：未经用户授权不执行发布；不得直接运行 `npm publish`，首次发布使用 `pnpm publish:new <package-dir>`；不得使用 `--no-verify` 或 `--no-gpg-sign`。后续公共包和私有原生应用安装程序按对应 workflow 与 Changesets 配置执行。修改 `.github/workflows/`、Changesets 或发布脚本时，先阅读本指南和相关 ADR，并以当前 workflow、manifest 与脚本为事实来源。
