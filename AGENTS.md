# AGENTS.md

## 文档维护

当你的变更属于以下任何类别时，请更新对应文档：

| 变更类别      | 更新位置                                                | 触发条件                                                                 |
| ------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| 构建脚本/流程 | `docs/agents/build.md`；顶层命令还需更新 `AGENTS.md`    | `package.json` scripts、`vite.config.ts` 构建配置、turbo.json tasks 变更 |
| 包新增/重命名 | `docs/agents/build.md`                                  | `packages/` 或 `apps/` 下新增/移除/重命名目录                            |
| 外部化        | `docs/agents/build.md`                                  | `vite.config.ts` `rollupOptions.external` 变更                           |
| CI/CD 工作流  | `docs/agents/build.md`                                  | `.github/workflows/` 下文件变更                                          |
| 代码质量工具  | `docs/agents/linting.md`                                | linter、formatter、stylelint、cspell 配置变更                            |
| 依赖管理      | `docs/agents/dependencies.md`                           | `pnpm-workspace.yaml` catalog、changeset 配置变更                        |
| 运行时/工具链 | 本文件（工具链）                                        | `.mise.toml`、`package.json` engines 变更                                |
| 测试配置      | `docs/agents/testing.md`                                | `vite.config.ts` 测试配置、测试框架变更                                  |
| 编码规范      | `.agents/rules/code-style.md`、受影响的包 `AGENTS.md`   | 命名、类型安全、架构模式变更                                             |
| Web UI 组件   | `packages/web-ui/AGENTS.md`、`docs/agents/web-ui.md`    | `packages/web-ui` 中 Lit 组件变更                                        |
| 图标系统      | `docs/adr/0008-icon-system.md`、`docs/agents/web-ui.md` | 图标 manifest、生成器或图标公共 API 变更                                 |
| 提交约定      | `docs/agents/commit.md`                                 | commitlint 配置、提交工作流变更                                          |

规则：

1. 变更前先阅读相关文档，确认当前文档状态
2. 变更后立即更新文档，不得推迟
3. 优先检查映射文档。仅当范围不明确或需要不相关的文档扩展时，才询问用户
4. 文档更新应与代码变更在同一 commit 中提交
5. `AGENTS.md`（含所有子包）、`docs/adr/`、`docs/agents/`、`.agents/rules/` 下的文档使用中文撰写，专业名词（技术术语、命令、路径、包名等）保留英文

---

## 仓库级规则（强制约束）

以下 `.agents/rules/` 文件为仓库级强制约束，开始任务前必须阅读与任务相关的规则文件全文。

| 规则文件                                                   | 摘要                                                                                                                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`code-style.md`](.agents/rules/code-style.md)             | 命名/大小写规范；公共 API 中文 JSDoc；严格 TS（禁 `any`）；`definePlugin` 优先于 class；CSS nesting 组织；`apps/` 优先 Tailwind v4；改动后先跑 `check:code` |
| [`commit.md`](.agents/rules/commit.md)                     | 未经授权不暂存/提交；授权后先读 `commitlint.config.js` 与 `docs/agents/commit.md`；禁 `--no-verify`/`--no-gpg-sign`                                         |
| [`dep-management.md`](.agents/rules/dep-management.md)     | 未经授权不增删改 npm 依赖；授权后先读 `docs/agents/dependencies.md`，遵循 workspace catalog 与 peer dependency 策略                                         |
| [`react.md`](.agents/rules/react.md)                       | React HMR——禁匿名 default export，用具名函数声明；由 oxlint `unicorn/no-anonymous-default-export` 强制执行                                                  |
| [`review-checklist.md`](.agents/rules/review-checklist.md) | Review 以问题为先、按严重程度排序；独立 review agent 不参与同一变更的实施                                                                                   |
| [`testing.md`](.agents/rules/testing.md)                   | 公共行为加聚焦测试；跨包/导出/契约变更跑根 `pnpm test`；构建/产物变更跑根 `pnpm build`                                                                      |

## 仓库概览

pnpm monorepo（`apps/**`、`packages/**`），使用 Turborepo。`packages/*` 发布到 npm，命名空间为 `@greypan/*`。`apps/*` 为私有应用，不发布 npm 包：两个 web demo 部署到 GitHub Pages，`wails-starter` 以安装包发布到 GitHub Release。

## 工具链

- **包管理器**：pnpm 10.33.0（通过 `.npmrc` 中 `engine-strict=true` 强制执行）
- **运行时**：Node 24（通过 mise 管理——若 node/pnpm/go 缺失则运行 `mise install`；`engines` 允许 >=24.18.0）
- **桌面端 CLI**：Wails 3 CLI 3.0.0-alpha2.122（通过 mise 的 Go 后端管理；使用已验证与此 CLI 和 Go 模块兼容的已发布 npm 运行时版本）
- **构建/开发/Lint/测试/格式化**：全部委托给 `vite-plus`（`vp`）——一个 Vite 封装器。大多数包级脚本调用 `vp build`、`vp pack`、`vp check`、`vp test run`、`vp lint`、`vp fmt`
- **编排**：Turborepo（`turbo.json`）——`build` 和 `test` 任务依赖 `^build`（上游包优先构建）。Demo 命令先构建一次上游包，然后使用 `turbo run dev` 启动持久的包级 watcher，不使用 Turbo 的仓库 watcher
- **桌面端产物**：`.github/workflows/wails-verify.yml` 在 PR 上原生验证 `wails-starter`，并上传 DMG 和 EXE 作为 GitHub Actions 产物。`.github/workflows/wails-release.yml` 从合并的 Changesets version PR 重建两个安装程序，并创建带 SHA-256 校验和的 GitHub Release
- **语言**：TypeScript 6，仅 ES modules（含 JS 源码的包均设置 `"type": "module"`；`packages/tsconfig` 仅发布 JSON 配置，无该字段）

## 常用命令

| 命令                                              | 功能                                              |
| ------------------------------------------------- | ------------------------------------------------- |
| `pnpm install`                                    | 安装所有依赖（CI 中使用冻结 lockfile）            |
| `pnpm build`                                      | 按依赖顺序构建所有包                              |
| `pnpm test`                                       | 运行所有测试                                      |
| `pnpm commit`                                     | 通过 cz-git 交互式提交 conventional commit        |
| `bash scripts/commit.sh <type> <scope> <subject>` | 非交互式提交（适用于 agent）                      |
| `pnpm dev:react-web-ui-demo`                      | React demo，包含上游构建和包 watcher              |
| `pnpm dev:vue-web-ui-demo`                        | Vue demo，包含上游构建和包 watcher                |
| `pnpm run check:code`                             | 检查格式化、Lint 和类型                           |
| `pnpm run fix:code`                               | 自动修复格式化/Lint 问题，然后类型检查            |
| `pnpm clean`                                      | 移除生成产物和缓存，保留 Wails 构建模板           |
| `pnpm clean --full`                               | 同时移除 `node_modules` 和 lockfile               |
| `pnpm publish:new <package-dir>`                  | 首次发布新包（1.0.0）                             |
| `pnpm release:version`                            | 应用 Changesets 版本；仅在变更时同步 Wails 元数据 |
| GitHub Actions `Version Packages`                 | 创建或更新 Changesets version PR                  |
| GitHub Actions `Publish npm Packages`             | 在 version PR 合并后构建并发布公共包              |
| GitHub Actions `Verify Wails Desktop`             | 构建并上传 Wails macOS/Windows 验证产物           |
| GitHub Actions `Release Wails Desktop`            | 在 version PR 合并后构建并发布 Wails 安装程序     |

## 构建详情

修改包脚本、Vite/Turbo 配置、包结构、外部化或发布流程前，请先阅读 [docs/agents/build.md](docs/agents/build.md)。其中包含包图、TypeScript 配置、构建模式和 CI/发布架构。

## Agent 约束

Agent 必须无例外地遵守以下规则：

- **不得修改 `.npmrc` 或 `.mise.toml` 中的 registry 或 mirror 配置。**
- **不得新增 npm 依赖（包括 devDependencies），除非用户明确要求。**
- **不得修改 `.github/workflows/` 下的 CI/CD 配置，除非用户明确要求。**
- **不得修改 `go.mod` 或 `go.sum`；Go 工具链仅用于辅助工具，非核心项目代码。**
- **不得直接运行 `npm publish`；始终使用 `pnpm publish:new`。**
- **不得修改 Git 配置，包括 `.gitconfig` 和全局 Git 配置。**
- **不得使用 `--no-verify` 或 `--no-gpg-sign` 绕过 Git hooks。**

## 自动生成/忽略的文件

以下文件为自动生成，不应手动编辑：

- `**/routeTree.gen.ts` — TanStack Router 路由树
- `**/auto-imports.d.ts` — auto-import 类型声明
- `apps/wails-starter/frontend/bindings/**` — Wails 3 bindings
- `**/__screenshots__/` — Vitest browser mode 测试失败截图
- `**/.vitest-attachments/` — Vitest browser mode 测试附件

这些文件被排除在 lint、格式化和拼写检查之外。

## 其他注意事项

- `.npmrc` 使用 npmmirror registry（`registry=https://registry.npmmirror.com`）。CI 中覆盖为官方 registry。
- `prepare` 脚本运行 `vp config`——在安装时设置 vite-plus 内部配置。
- Go 工具链也通过 mise 管理（用于部分工具，非 JS 包直接使用）。

## 文档

- `docs/agents/` — 按需操作指南，涵盖构建、测试、Lint、包工作流和 issue 跟踪
- `docs/adr/` — 重要技术决策的架构决策记录
- `docs/design/` — 设计参考，包括截图和 CSS 实现
- `CONTEXT.md` — 项目架构概览，包括 ADR 索引、包边界和技术原则

## Agent 参考文档

按需阅读；非每次会话必需：

| 文件                                    | 用途                                        | 何时阅读                                                      |
| --------------------------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| `docs/agents/testing.md`                | 测试基础设施、命令和 browser mode           | 测试执行或配置不明确时                                        |
| `docs/agents/linting.md`                | 工具链、formatter、linter 和 stylelint 使用 | Lint 或格式化命令不明确时                                     |
| `docs/agents/issue-tracker.md`          | GitHub issue 操作和 `gh` CLI 用法           | 创建、查询或更新 issue 时                                     |
| `docs/agents/domain.md`                 | 代码探索约定、ADR 和术语表                  | 探索不熟悉的代码区域时                                        |
| `docs/agents/build.md`                  | 构建模式、包图、外部化、CI                  | 变更构建、包或发布流程时                                      |
| `docs/agents/web-ui.md`                 | Web UI 实现、token、overlay、测试           | 变更 `packages/web-ui` 时                                     |
| `docs/agents/dependencies.md`           | 依赖放置和 catalog 策略                     | 依赖变更授权后                                                |
| `docs/agents/commit.md`                 | 提交信息和执行工作流                        | 提交授权后                                                    |
| `docs/agents/review.md`                 | Review 范围和报告                           | 进行代码 review 时                                            |
| `.agents/skills/agent-browser/SKILL.md` | 浏览器自动化 CLI（仅手动调用）              | 用户调用 `/agent-browser` 时（如 chrome-devtools MCP 不可用） |

## 指令作用域

`AGENTS.md` 和 `.agents/rules/` 定义仓库级约束。包级 `AGENTS.md` 仅对包内变更添加约束。`docs/agents/` 下的文件为按需指南；在执行对应任务前阅读相应指南。

### Web Platform API 验证

实现不熟悉、新引入或跨浏览器行为模糊的 Web Platform API 时，应通过 MDN MCP server（`mdn`）验证 API 语义和浏览器行为——不要依赖模型记忆。包括在浏览器支持不确定时检查 MDN 兼容性数据（BCD）。

### 浏览器验证

涉及 UI、UX、交互、响应式行为或浏览器运行时行为的变更，必须在真实浏览器中验证。chrome-devtools MCP 可用时作为主要验证层——导航到本地 demo、与组件交互、检查 console/network 并截图。`agent-browser` skill 是手动替代方案：仅在用户调用 `/agent-browser` 时运行，例如 MCP 不可用或需要隔离浏览器上下文时。

各变更类型的验证要点：

- **交互**：主要指针交互、键盘操作、焦点管理、禁用状态、关闭/取消路径
- **布局**：空白渲染、溢出、遮挡、错位、意外布局偏移（检查桌面和移动端视口）
- **无障碍**：语义化、accessible name、键盘可达性
- **运行时**：console 错误、页面异常、依赖浏览器特性的行为（jsdom 不是替代品）

约束：

- 启动本地 dev server 前，检查目标端口是否已有响应的服务器。合适则复用；不要仅因验证任务启动就创建重复服务器。
- 仅在无合适服务器运行、现有服务器无法提供所需当前状态、或明确需要隔离环境时才启动新服务器。此时使用未占用端口并记录其 PID。
- 仅停止当前任务启动的服务器。不得终止用户或其他任务拥有的已有服务器。
- 目标端口上遇到无响应的 dev server 时，先询问用户再终止。仅在会话结束时清理当前任务启动的服务器。
- 不得附加或控制用户现有的 Chrome 会话。在 chrome-devtools MCP 或 `agent-browser` 拥有的浏览器上下文中验证，与用户工作的 Chrome 隔离。
- 仅对本地自签名 HTTPS demo 忽略证书错误；不得为外部站点放松证书验证。
- 验证完成后停止为验证启动的所有 dev server，除非用户要求保留。保留或报告本地 URL 供后续使用。

Fallback 链：chrome-devtools MCP → 项目 browser-mode 测试 → 组件测试和 HTTP/DOM 检查。`agent-browser` 不在自动链中——仅在手动调用（`/agent-browser`）时运行。若无浏览器层可用（MCP 缺失且未手动调用），需明确报告为何无法完成真实浏览器验证及其风险。

最终报告必须声明验证 URL、检查内容和任何缺口。不得将构建成功或 jsdom 测试通过描述为浏览器交互验证。
