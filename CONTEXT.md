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
interweave（含 interweave-frontend）──共享包的 Wails 桌面集成表面
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

| ADR                                                                    | 决策                                         | 何时读取                                                         |
| ---------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| [0001](docs/adr/0001-ci-pipeline.md)                                   | CI Pipeline                                  | 修改验证、Changesets 或发布门控                                  |
| [0002](docs/adr/0002-build-toolchain.md)                               | Build Toolchain                              | 修改 Vite Plus、构建或测试工具链                                 |
| [0003](docs/adr/0003-web-component-strategy.md)                        | Web Component Strategy                       | 修改 Lit、Shadow DOM 或框架集成                                  |
| [0004](docs/adr/0004-plugin-system.md)                                 | Plugin System                                | 设计可组合状态或行为模块                                         |
| [0005](docs/adr/0005-overlay-interaction-policy.md)                    | Overlay Interaction Policy                   | 修改 overlay 关闭、焦点或事件协调                                |
| [0006](docs/adr/0006-layout-layering.md)                               | Layout Layering                              | 修改布局层级、portal 或 z-index                                  |
| [0007](docs/adr/0007-web-ui-contract-convergence.md)                   | Web UI Contract Convergence                  | 修改组件公共契约、事件或表单行为                                 |
| [0008](docs/adr/0008-icon-system.md)                                   | Icon System                                  | 修改图标来源、生成器或导出                                       |
| [0009](docs/adr/0009-release-planes.md)                                | Release Planes                               | 修改 npm/Wails 发布流程                                          |
| [0010](docs/adr/0010-design-token-restructure.md)                      | Design Token Restructure                     | 修改 `--wui-*` token 或破坏性兼容性                              |
| [0011](docs/adr/0011-framework-type-adaptation-narrowing.md)           | Framework Type Adaptation Narrowing          | 修改 React/Vue 类型适配或复合控件事件边界                        |
| [0012](docs/adr/0012-progressive-agent-context-architecture.md)        | Progressive Agent Context Architecture       | 修改 agent context、rules、skills 或 instruction system          |
| [0017](docs/adr/0017-interweave-resource-source-boundary.md)           | Interweave Resource/Source 与外部内容边界    | 修改 interweave Resource、Source 或外部内容边界                  |
| [0018](docs/adr/0018-interweave-flat-semantic-tags-map.md)             | Interweave 扁平语义标签与派生 Map            | 修改 interweave 标签、Map 或资源关系语义                         |
| [0019](docs/adr/0019-interweave-backend-capability-boundaries.md)      | Interweave 后端能力边界与 Wails 暴露面       | 修改 interweave Go 模块、Wails Service 或 frontend bindings      |
| [0020](docs/adr/0020-interweave-fresh-library-start.md)                | Interweave v1 新资源库起点                   | 修改 interweave 本地库初始化或旧库兼容策略                       |
| [0021](docs/adr/0021-interweave-source-identity.md)                    | Interweave Source 同一性与去重               | 修改 interweave Source 去重或规范化规则                          |
| [0022](docs/adr/0022-interweave-source-availability.md)                | Interweave Source 布尔可用性与 URL 写入时序  | 修改 interweave Source 可用状态或 URL 抓取/写入规则              |
| [0023](docs/adr/0023-interweave-resource-title-ownership.md)           | Interweave Resource 标题的独立所有权         | 修改 interweave Resource 标题或 Source 元数据更新规则            |
| [0024](docs/adr/0024-interweave-resource-source-preference.md)         | Interweave Resource Source 基数与首选规则    | 修改 interweave Source 删除、首选或基数不变量                    |
| [0025](docs/adr/0025-interweave-duplicate-sources-are-user-managed.md) | Interweave 重复 Source 由用户自行管理        | 修改 interweave Source 重复添加或去重策略                        |
| [0026](docs/adr/0026-interweave-standardized-tag-names.md)             | Interweave 标准化标签名称与自动复用          | 修改 interweave 标签创建、名称标准化或同名复用策略               |
| [0027](docs/adr/0027-interweave-stable-tag-identity.md)                | Interweave Tag 的稳定内部身份                | 修改 interweave Tag ID 或 Resource—Tag 关联键                    |
| [0028](docs/adr/0028-interweave-resource-scoped-tag-operations.md)     | Interweave 标签操作仅作用于单个 Resource     | 修改 interweave 标签作用域或全局标签管理边界                     |
| [0029](docs/adr/0029-interweave-map-local-exploration-boundary.md)     | Interweave Map 局部探索操作边界              | 修改 interweave Map 交互边界或探索操作模型                       |
| [0030](docs/adr/0030-interweave-sqlite-persistence-wal.md)             | Interweave 本地 SQLite 持久化与 WAL 并发模型 | 修改 interweave SQLite 配置、并发或持久化基础设施                |
| [0031](docs/adr/0031-layout-sidebar-collapse.md)                       | Layout 页面结构、Banner 与可折叠 Sidebar     | 修改 `web-ui-layout` 的页面结构、Sidebar、Banner 或移动端 Drawer |

## Interweave 产品与领域词汇

Interweave 当前已确认的产品基线见 [`apps/interweave/docs/product.md`](apps/interweave/docs/product.md)。产品、领域模型、Map、标签、Source 或 MCP 路线任务按需读取该文档和 ADR-0017/0018；修改本地资源库初始化或旧库兼容策略时还读取 ADR-0020；修改 Source 输入规范化、重复添加或去重策略时还读取 ADR-0021/0025；修改 Source 可用状态或 URL 抓取规则时还读取 ADR-0022；修改 Resource 标题或 Source 元数据更新规则时还读取 ADR-0023；修改 Source 删除、首选或基数不变量时还读取 ADR-0024；修改标签创建、名称标准化或同名复用策略时还读取 ADR-0026；修改 Tag ID 或 Resource—Tag 关联键时还读取 ADR-0027；修改标签操作作用域或全局标签管理策略时还读取 ADR-0028；修改 Map 交互边界或探索操作模型时还读取 ADR-0029；修改 SQLite 配置、并发或持久化基础设施时还读取 ADR-0030；修改 Go 模块、Wails Service 或 frontend bindings 时还读取 ADR-0019。

**资源（Resource）**:
用户希望长期找回、理解或使用的原子概念对象；保存独立标题、短备注、语义标签与一个或多个 Source。
_Avoid_: 条目、文件夹、项目容器、内容页面

**v1 新资源库起点**:
v1 使用新建的本地资源库，不迁移或兼容 2026-08-15 重置前的旧 Interweave 数据。
_Avoid_: 旧库自动迁移、隐式兼容层、后台数据转换

**Resource 标题**:
独立于 Source 元数据。只有首次纳入可从首个 Source 取得默认值；URL 无页面标题时以 hostname 回退，文件以文件名回退；此后仅允许用户显式编辑，新增 Source 或刷新不得自动覆盖。
_Avoid_: 从备用 Source、刷新结果或重定向结果自动改名

**来源（Source）**:
访问 Resource 的外部入口，例如本地文件或 URL。多个 Source 表示同一 Resource 的备用或替代入口，不表达版本。
_Avoid_: locator、版本、资源副本

**首选 Source**:
每个 Resource 至少有一个 Source，且恰有一个首选。首个 Source 自动首选，新增不自动切换；每个 Source 都可一键原子替换并保留顺位和首选角色，且不影响其他数据；首选被删除时，最早添加的剩余 Source 成为首选。
_Avoid_: 无 Source 的 Resource、要求用户手动删除再添加、因 Source 不可用而清空首选、依赖偶然查询排序

**重复 Source**:
v1 不做全局 Source 去重：即使文件路径或 URL 完全相同，用户的每次添加或替换仍是独立操作，不定位、不拒绝、不合并、不转移。输入规范化仅用于校验和保存；抓取重定向不改写初始 URL。
_Avoid_: 添加时自动去重、重复定位、隐式合并或转移 Source

**Source 可用性**:
以 `available: boolean` 持久化：`true` 为可用，`false` 为不可用。新建 URL 必须在 10 秒总时限内完成基础元数据抓取再写入；失败或超时仍写入为 `false`，非 HTML 或展示元数据缺失不影响 `true`，后续非元数据数据加载不阻塞写入。新建文件先做轻量 `stat`，成功或失败分别写入 `true` 或 `false`，但都纳入且不读内容或计算 hash。
_Avoid_: `unknown`、独立状态枚举、以元数据完整性替代可用性、后台状态探测

**语义标签（Semantic Tag）**:
用户赋予 Resource 的扁平内容意义。每个 Tag 有不可变内部 `tag_id`；名称经标准化后不可变；标准名称相同即自动复用；没有别名、全局管理面板或自动语义合并；操作仅在单个 Resource 上增删 Tagging。标签无父子、路径、继承或显式标签关系；Resource 的关联仅从共享语义标签派生。
_Avoid_: 文件夹、目录、类型、状态、标签别名、自动语义合并

**Tagging**:
一个 Resource 被赋予一个 Tag 的内部归属关系，只引用 `resource_id` 与 `tag_id`；不是特殊 Tag，也不直接向用户展示。
_Avoid_: `ResourceTag`、标签子类型、以标签名称作为关联键

**资源关系地图（Map）**:
从 Resource—语义标签归属中派生的分层探索视图，用于发现主题群、桥梁与孤立资源；仅支持局部探索与单资源就近增删标签，不持久化画布布局或手工连线。
_Avoid_: 文件树、画布编辑器、关系连线器、资源容器

## 已知边界

- 所有发布的 JavaScript 包均为 ES modules；`tsconfig` 仅发布 JSON profile。
- `web-ui` 不打包框架代码；消费者安装并提供 `lit`，可选地提供 React/Vue 类型依赖。
- 应用均为私有包，不发布到 npm；React/Vue demo 部署到 GitHub Pages，Wails starter 通过 GitHub Release 交付安装程序。
- registry 使用 npmmirror，CI 覆盖为官方 npm registry；不得为局部任务改写 registry/mirror。

组件、token、overlay 与事件语义按需读取 `docs/agents/web-ui.md` 及其指向的 ADR；公共 package 或跨 workspace 契约审查按需读取 `contract-change-review` skill，并以 manifest、消费者和测试为事实；构建、部署与 release workflow 按需读取 `docs/agents/build.md` 和 ADR-0009。
