# Mono 项目架构 Context

本文件是 repository-level project context：记录项目边界、跨包架构、依赖方向、领域术语入口和 ADR 索引。仅在架构、跨包依赖、仓库拓扑、项目术语或长期设计取舍相关任务中阅读；不要把它当作逐项操作手册。

- **Domain vocabulary**：项目中需要保持一致的术语和概念边界。
- **Repository architecture context**：包边界、依赖方向、集成表面和长期工程原则。
- **Implementation details**：源码、manifest、配置、测试以及按需加载的 task guide；不在此文件中复制。

## 快速入口

- 全局拓扑、workspace 清单、依赖草图和高频热点：[`ARCHITECTURE.md`](ARCHITECTURE.md)。
- 协作与 Agent 交付流程：[`CONTRIBUTING.md`](CONTRIBUTING.md)。
- 本文件只承载跨包架构、术语和 ADR 索引；不要把它当作普通局部任务的操作手册。

## 项目身份

Mono 是一个 pnpm + Turborepo monorepo。它向 npm 发布 `@greypan/*` 工具包和基于 Lit 的 `@greypan/web-ui`，同时维护 React、Vue 与 Wails 私有应用，以验证共享包在真实框架和桌面交付中的契约。

## 核心工程原则

- **Plugin over inheritance**：扩展性通过 `packages/js-kit/src/plugin-system/` 的函数组合实现，不以 class 层级承载内部状态或行为。
- **Shadow DOM encapsulation**：`web-ui` 组件使用 Shadow DOM；应用 CSS reset 无法进入组件内部，组件通过 `:host` 和 CSS custom properties 提供受控边界。
- **Framework-agnostic public contract**：一个 Lit 运行时实现服务 React、Vue 与 vanilla JS；框架类型适配位于 `packages/web-ui/src/types/`，不引入运行时 wrapper。
- **Acyclic workspace graph**：工作区依赖保持有向无环；`js-kit` 是运行时代码的基础包，Turbo 的 `build` 与 `test` 先构建上游依赖。

## 模块关系

```text
@greypan/tsconfig ──配置 profile，供所有 TypeScript workspace 使用
@greypan/js-kit ───无工作区运行时依赖的基础工具与 plugin system
  ├─ @greypan/browser-kit ──浏览器工具
  │    └─ @greypan/web-ui ──Lit 组件、icons、React/Vue 类型
  ├─ @greypan/test-kit ────Vitest browser mode 与 MSW 基础设施
  ├─ @greypan/unplugin-web-components ──Web Components auto-import
  └─ @greypan/deps-reload ─开发期 workspace dist 重载

react-web-ui-demo / vue-web-ui-demo ─共享包的 Web 集成与预览表面
weave（含 weave-frontend）──共享包的 Wails 桌面集成表面
```

| 边界                      | 负责内容                                            | 不负责内容                        |
| ------------------------- | --------------------------------------------------- | --------------------------------- |
| `js-kit`                  | 平台无关的 type、utility、plugin system             | DOM、UI 或框架绑定                |
| `browser-kit`             | DOM、storage、环境、网络和浏览器工具                | Node runtime 或 UI 组件           |
| `test-kit`                | Vitest browser mode、MSW 复用基础设施               | 产品组件或应用测试逻辑            |
| `web-ui`                  | Lit components、主题、icons、公共组件契约、框架类型 | 框架运行时 wrapper 或全局应用样式 |
| `unplugin-web-components` | Vite/Webpack 的 Web Components auto-import 转换     | Web Components 实现               |
| `deps-reload`             | 本地开发时 workspace 产物重载                       | 生产构建行为                      |
| `tsconfig`                | 可发布的 TypeScript profile JSON                    | 编译或运行时代码                  |
| `apps/*`                  | 私有集成、展示和桌面交付表面                        | npm 公共包发布                    |

## 关键 ADR

| ADR                                                             | 决策                                      | 何时读取                                                |
| --------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------- |
| [0001](docs/adr/0001-ci-pipeline.md)                            | CI Pipeline                               | 修改验证、Changesets 或发布门控                         |
| [0002](docs/adr/0002-build-toolchain.md)                        | Build Toolchain                           | 修改 Vite Plus、构建或测试工具链                        |
| [0003](docs/adr/0003-web-component-strategy.md)                 | Web Component Strategy                    | 修改 Lit、Shadow DOM 或框架集成                         |
| [0004](docs/adr/0004-plugin-system.md)                          | Plugin System                             | 设计可组合状态或行为模块                                |
| [0005](docs/adr/0005-overlay-interaction-policy.md)             | Overlay Interaction Policy                | 修改 overlay 关闭、焦点或事件协调                       |
| [0006](docs/adr/0006-layout-layering.md)                        | Layout Layering                           | 修改布局层级、portal 或 z-index                         |
| [0007](docs/adr/0007-web-ui-contract-convergence.md)            | Web UI Contract Convergence               | 修改组件公共契约、事件或表单行为                        |
| [0008](docs/adr/0008-icon-system.md)                            | Icon System                               | 修改图标来源、生成器或导出                              |
| [0009](docs/adr/0009-release-planes.md)                         | Release Planes                            | 修改 npm/Wails 发布流程                                 |
| [0010](docs/adr/0010-design-token-restructure.md)               | Design Token Restructure                  | 修改 `--wui-*` token 或破坏性兼容性                     |
| [0011](docs/adr/0011-framework-type-adaptation-narrowing.md)    | Framework Type Adaptation Narrowing       | 修改 React/Vue 类型适配或复合控件事件边界               |
| [0012](docs/adr/0012-progressive-agent-context-architecture.md) | Progressive Agent Context Architecture    | 修改 agent context、rules、skills 或 instruction system |
| [0013](docs/adr/0013-weave-domain-model.md)                     | Weave 领域模型（可寻址资源+内部索引引用） | 修改 weave 库/条目/存储模型                             |
| [0014](docs/adr/0014-weave-tag-model.md)                        | Weave 标签模型（Bear 式路径标签）         | 修改 weave 标签结构/继承/过滤                           |
| [0015](docs/adr/0015-weave-identity-and-repair.md)              | Weave 身份与修复模型                      | 修改 weave 条目身份/监听/修复策略                       |
| [0016](docs/adr/0016-weave-mcp-service.md)                      | Weave MCP 服务形态                        | 修改 weave MCP 传输/鉴权/工具集                         |

## Weave 领域词汇

**条目（Item）**:
库中的最小单元，一个可寻址资源（v1：`file` 或 `url`），拥有稳定 UUID、定位符与标签集合。
_Avoid_: 文件、素材文件、文档

**定位符（Locator）**:
条目当前可解析的位置——本地绝对路径（file）或远程 URL（url）；不可解析即断链。
_Avoid_: 软链接目标、路径

**指纹（Fingerprint）**:
条目源文件的 大小/mtime（可选内容哈希），仅作为断链修复时的候选匹配证据；内容变动不触发事件。
_Avoid_: 版本、内容快照

**标签（Tag）**:
路径式命名的层级节点（`父/子/孙`），单父树；选择父标签默认包含其子孙标签下的条目。
_Avoid_: 文件夹、目录、分类

**断链（Broken）**:
file 条目的定位符无法在文件系统解析的状态；对应条目进入修复中心。
_Avoid_: 失效软链接、缺失文件

**监听根（Watch Root）**:
用户登记的目录；其内容被递归索引为条目，并由后台 watcher 持续监听。
_Avoid_: 素材目录、库目录

**修复中心（Repair Center）**:
集中处理断链的界面：列出断链、展示候选、手动重定位/自动修复/忽略。
_Avoid_: 错误修复、断链管理

**可寻址资源（Addressable Resource）**:
条目类型抽象——任何可被定位符引用的资源；v1 仅实现 file 与 url，未来可扩展（便签、云盘等）。

## 已知边界

- 所有发布的 JavaScript 包均为 ES modules；`tsconfig` 仅发布 JSON profile。
- `web-ui` 不打包框架代码；消费者安装并提供 `lit`，可选地提供 React/Vue 类型依赖。
- 应用均为私有包，不发布到 npm；React/Vue demo 部署到 GitHub Pages，Wails starter 通过 GitHub Release 交付安装程序。
- registry 使用 npmmirror，CI 覆盖为官方 npm registry；不得为局部任务改写 registry/mirror。

组件、token、overlay 与事件语义按需读取 `docs/agents/web-ui.md` 及其指向的 ADR；构建、部署与 release workflow 按需读取 `docs/agents/build.md` 和 ADR-0009。
