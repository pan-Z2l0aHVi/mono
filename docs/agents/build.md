# 构建与发布架构

在修改包脚本、Vite/Turbo 配置、包结构、外部化或 CI/发布流程之前，请先阅读本指南。当这些细节发生变化时，应在同一变更中更新本文档。

## 各包命令

每个包暴露其所需的命令：所有可构建的包都有 `build`，大多数有 `dev`（监听模式），只有包含维护的自动化测试覆盖率的包才暴露 `test`。使用 `pnpm --filter @greypan/<name> <script>` 运行它们；例如，`pnpm --filter @greypan/js-kit test`。

## Demo 开发

根目录的 demo 命令首先构建上游工作区包，然后使用 `turbo run dev --filter=<demo>...` 启动每个包的持久 `dev` 进程。不要对这些命令使用 `turbo watch`：包级别的 Vite 和 tsdown 监听器已经会重建源文件变更，而 `turbo watch` 还会监控 Git 控制文件，当编辑器或 agent 工具更新 Git 工作树时可能会重启所有 dev 进程。

在修改包图、lockfile 或 Turbo 配置后，需要重启 demo 命令。普通的源文件变更会由运行中的包级监听器继续处理。

Wails 开发启动 Wails 以及嵌套 WebView 前端的每个可构建工作区依赖，使用 `--filter=@greypan/wails-starter-frontend^...`。`^...` 后缀排除了前端本身。Wails Taskfile 负责前端的 Vite 服务器，因此不要使用 `--filter=@greypan/wails-starter...`；这会导致启动一个重复的前端 dev 服务器。在修改 Vite 插件、TypeScript 配置或工作区依赖图后，需要重启 Wails。

不同包类型的构建脚本不同：

- **单入口包**（`test-kit`、`unplugin-web-components`、`deps-reload`）：`vp pack`，基于 tsdown，输出 `.mjs` 和 `.d.mts`。
- **子路径导出包**（`js-kit`、`browser-kit`、`web-ui`）：`vp build`，使用 Vite library 模式配合 `preserveModules`，输出 `.js` 和 `.d.ts`。
- **React 应用**：`vp build`。
- **Vue 应用**：`vue-tsc --build && vp build`。
- **tsconfig**：无构建步骤；它提供通过 TypeScript `extends` 消费的 JSON 文件。

在工作区根目录运行 `pnpm run check:code` 进行格式化、lint 和类型检查。运行 `pnpm run fix:code` 可在类型检查前自动修复格式化和 lint 问题。包构建命令不能替代这两个命令。

对于 `web-ui`，`pnpm --filter @greypan/web-ui generate-icons` 从 `icons.used.json` 重新生成图标模块。Vite 插件也会在 `vp build` 期间自动运行它。

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

## 包结构

```text
packages/
  tsconfig                  共享 TypeScript 配置文件；无构建步骤
  js-kit                    JS 工具库；无工作区依赖的基础包
  browser-kit               浏览器工具库；依赖 js-kit
  test-kit                  Vitest 浏览器模式和 MSW 基础设施；依赖 js-kit
  web-ui                    Lit Web 组件；依赖 js-kit 和 browser-kit
  unplugin-web-components   Web 组件的 Unplugin；依赖 js-kit
  deps-reload               本地依赖重载插件；依赖 js-kit
apps/
  react-web-ui-demo            React 19、TanStack Router、Zustand；私有项目
  vue-web-ui-demo              Vue 3、Vue Router、Pinia；私有项目
  wails-starter                Wails 3 桌面应用模板；Go 后端加 Vue WebView 前端
```

`js-kit` 是叶子包。`browser-kit` 依赖 `js-kit`；`test-kit` 依赖 `js-kit` 并有 `msw` peer 依赖；`web-ui` 依赖两者。应用依赖共享包。

## 库构建模式

`vp pack` 使用 tsdown 处理单入口包。它通过 `pack` 块配置，无需 `vite-plugin-dts` 即可生成声明文件，并自动外部化依赖。`test-kit`、`unplugin-web-components` 和 `deps-reload` 使用此模式。

`vp build` 使用 Vite library 模式处理具有子路径导出的包。它通过 `build.lib` 和 `preserveModules: true` 配置，使用 `vite-plugin-dts` 生成声明文件。`js-kit`、`browser-kit` 和 `web-ui` 使用此模式。

## 外部化规则

- 匹配 `@greypan/*` 的**工作区依赖**必须被外部化。Vite library 包通过 `rollupOptions.external` 实现；tsdown 从依赖中自动处理。这确保了监听模式的可解析性并避免重复的消费端代码。
- **Node 内置模块**如 `node:path` 必须被外部化。
- **第三方依赖**在设计意图为零配置消费时可以被打包；当期望消费端自行提供时应外部化。
- 优先使用正则表达式而非工作区包列表。同时匹配子路径导入，例如 Lit 模式 `/^lit($|\/)/`。
- `web-ui` 外部化其框架依赖，因此消费端必须安装 `lit` 作为依赖。
- `wails-starter` 有一个外层 Turbo 工作区（`@greypan/wails-starter`）和一个嵌套的 WebView 工作区（`@greypan/wails-starter-frontend`）。Wails Taskfile 负责嵌套的前端进程；`pnpm dev:wails-starter` 仅展开前端的依赖，排除前端进程本身。
- Wails Taskfile 使用 pnpm，生成 `frontend/bindings/`，并将 `frontend/dist/` 嵌入 Go 二进制文件。`bin/` 是 Turbo 构建原生产物的输出目录。
- Wails 构建资源有意仅支持 darwin/arm64 和 windows/amd64。在 macOS 上，包 `build` 脚本同时创建 `bin/wails-starter.dmg` 和 `bin/wails-starter.exe`；`build:macos` 和 `build:windows` 分别明确构建各自目标。在 Windows 上，`build` 创建 EXE。在 Linux CI 上，它仅构建 WebView 前端，因为两个桌面发布目标都不是原生运行环境。Windows 交叉编译可在 macOS 上无需 Docker 运行，而在非 macOS 主机上构建 macOS 需要 Wails 的 Docker 设置。Wails 在更新资源时可能会生成 Android、iOS 和 Linux 构建模板；这些不支持的目标目录应被忽略，不得进入版本 PR。
- `apps/wails-starter/build/` 包含 Wails Taskfile、平台模板、图标和打包资源，而非一次性输出。`pnpm clean` 和 `pnpm clean --full` 都会保留它；只有 `bin/`、`frontend/dist/`、生成的绑定、缓存和依赖是一次性产物。

| 包                        | 外部化                                                                   | 打包的第三方依赖 |
| ------------------------- | ------------------------------------------------------------------------ | ---------------- |
| `js-kit`                  | `@greypan/*`、`remeda`、`nanoid`                                         | 无               |
| `browser-kit`             | `@greypan/*`、`nanoid`、`remeda`、`copy-to-clipboard`、`msw`             | 无               |
| `test-kit`                | 通过 tsdown 自动处理：`@greypan/js-kit`、`msw`                           | 无               |
| `web-ui`                  | `@greypan/*` 加框架正则匹配 `lit`、`@lit`、`react`、`react-dom` 和 `vue` | 无               |
| `unplugin-web-components` | 通过 tsdown 自动处理：`@greypan/js-kit`、`change-case`、`unplugin`       | 无               |
| `deps-reload`             | 通过 tsdown 自动处理：`node:*`、`@greypan/js-kit`、`unplugin`            | 无               |

## 应用

- `react-web-ui-demo` 使用 `@vitejs/plugin-react` v4 配合 React Compiler（`babel-plugin-react-compiler`，目标 19），加上 `@vitejs/plugin-legacy` 支持旧版浏览器。React 和 Vue demo 应用目前依赖浏览器验证而非维护的单元测试套件。
- demo 应用和 `web-ui` 共享相同的 browserslist 目标（Chrome/Edge >=111、Safari/iOS >=16.4、Firefox >=128、非 dead），这与 Tailwind v4 的支持矩阵一致。`web-ui` 是唯一在构建时输出 CSS 的包；其静态 `color-mix()` 调用由 lightningcss 评估，而包含 `var()` 的 `color-mix()` 作为运行时 CSS 保留并依赖上述目标。
- 库包（`js-kit`、`browser-kit`、`test-kit`、`deps-reload`、`unplugin-web-components`）仅包含 JavaScript，不输出 CSS，因此没有 `browserslist` 字段；它们统一声明 `engines.node >=20.11.0`。该下限覆盖了 `deps-reload` 中的 `import.meta.dirname`（Node 20.11+），与 vite/vitest 的 peer 版本范围（^20.19 / ^20）对齐，并排除了已停止维护的 Node 18 和 20 版本。
- 两个 demo 应用都使用 `basicSsl()` 进行 HTTPS 开发服务器配置。
- `depsReload` 监听库的 `dist/` 目录，当本地依赖发生变化时触发整页刷新。
- Wails WebView 前端遵循 Vue demo 的 Vite 插件和本地包约定，Wails Vite 插件负责生成 Go 绑定。

## CI 与发布

- `ci.yml` 中的 CI 仍然是针对 pull request 和推送到 `main` 的完整验证工作流：changeset 状态、构建、格式化/lint/类型检查和测试。它还接受 `workflow_dispatch` 触发来处理 Changesets 版本 PR，覆盖了 `GITHUB_TOKEN` 创建的版本 PR 可能不会触发的 `pull_request.opened` 事件。PR 和手动触发的运行共享一个以分支为键的 `concurrency` 组（`github.head_ref || github.ref_name`），因此 `cancel-in-progress` 会将两者合并为单次运行而非重复原生构建。它安装了 Wails 的 GTK4 和 WebKitGTK Linux 前置依赖，因为完整工作区构建会通过 mise 编译 Wails CLI。
- `changeset-version.yml` 在推送到 `main` 时运行，其唯一职责是创建或更新 Changesets 版本 PR。它通过 `changesets/action` 的 `version` 输入调用 `pnpm run release:version`，因此待处理的 `@greypan/wails-starter` 发布会更新原生版本元数据而非使用 Changesets 的默认命令；`sync:version` 默认更新，仅在显式传入 `--check` 时进行验证。对于公共包变更它仅安装 Node 和 pnpm；Wails 发布还会额外安装 Wails Linux 前置依赖、Go 和配置的 Wails CLI。创建 PR 后，它会触发 CI，对于 Wails 变更还会对版本分支进行原生验证；它从不发布包或安装程序。
- `npm-publish.yml` 仅发布公共 npm 包。其 `pull_request.closed` 触发器限定为 `packages/**`，然后仅在 `changeset-release/main` 合并到 `main` 时运行，检测实际的公共包版本变更，在合并 SHA 上重建 `packages/*` Turbo 图并通过 npm Trusted Publishing 发布。发布成功后，一个独立的最小权限作业为每个包版本创建幂等的 GitHub Release 和标签，附带 npm 和包 changelog 的链接。包发布显式不标记为 Latest，以确保最新的 Wails 桌面安装程序保持突出。它不使用 Wails 工具链或长期 npm token。
- `wails-verify.yml` 仅验证涉及 Wails 的 pull request 和手动运行。它检查同步的元数据，构建 macOS ARM64 DMG 和 Windows x64 EXE，并将其保留为 14 天的只读验证产物。它没有创建 Release 的权限。
- `wails-release.yml` 限定为修改 `apps/wails-starter/**` 的已关闭 pull request，然后仅在 `changeset-release/main` 合并到 `main` 时运行。如果 Wails 应用版本发生了变更，它会从该精确合并 SHA 重建两个原生安装程序，并创建带 SHA-256 校验和的 `wails-starter-vX.Y.Z`。其发布作业在创建 Release 前检出该 SHA，以便 GitHub CLI 解析发布目标；它独占 `contents: write` 权限，且私有应用永远不会发布到 npm。
- `main` 必须受到保护，确保产品变更通过 pull request 合入。在 GitHub 分支保护中要求 `CI` 通过；Wails 验证保持路径触发而非全局必需检查，因此不相关的 PR 无需等待原生运行环境。
- Changesets 版本 PR 使用 `GITHUB_TOKEN` 创建，因此其自身的 `pull_request` 触发的 CI 会被 GitHub 的 pwn-request 保护标记为 `action_required`，在获批准前不会运行。由于 `main` 规则集要求 `check` 上下文，合并版本 PR 需要先批准那个被挂起的运行（Actions 运行页面，或 `gh api repos/<owner>/<repo>/actions/runs/<id>/approve`）。`changeset-version.yml` 触发的 `workflow_dispatch` 运行已经验证了相同的提交，因此批准只是为了满足合并门控；分支键控的 `concurrency` 组随后会在两者同时运行时将已批准的运行与调度运行合并。
- `deploy-pages.yml` 中的部署是手动触发的，通过一个 `actions/deploy-pages` 产物部署作业级 `DEMO_APPS` 列表中的每个可部署 Demo。它仅安装 Node 和 pnpm，因为 Pages 不需要 Wails CLI。每个条目是 `apps/<name>` 目录，服务路径为 `/mono/<name>/`；构建命令使用 pnpm 的 `{./apps/<name>}...` 目录选择器而非 npm 包名。站点没有根落地页。
- 每个可部署 Demo 必须支持 History 路由深层链接。GitHub Pages 将未匹配的请求路由到根 `404.html`；它根据 `DEMO_APPS` 验证应用名称，将请求的路由保存在 `redirect` 中，并加载应用根目录。在生产环境中，应用必须在创建路由器之前恢复 `redirect`。未知路径保持 404 响应。
- 首次发布必须使用 `pnpm publish:new <package-dir>`，它会构建并发布版本 `1.0.0`。需要先执行 `npm login`；之后为 `npm-publish.yml` 配置 npm Trusted Publishing，以便后续包发布使用版本 PR 流程。
- npm Trusted Publishing 通过 OIDC `job_workflow_ref` 声明绑定到工作流文件路径。重命名或移动 `npm-publish.yml` 会使现有的 trusted-publisher 注册失效：即使设置了 `id-token: write`，`pnpm changeset publish` 也会因 `ENEEDAUTH` 失败。在重命名工作流的同一变更中更新 npmjs.com 上对应的 trusted publisher。
