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

## Runtime queue vocabulary

**待消费队列（消费队列）**：队列项在交给消费者前仍属于队列；交付动作完成后即视为消费完成，消费者后续执行失败不会自动恢复该项。持久化此类队列只恢复尚未交付的项。
_Avoid_: 确认队列、服务端已确认队列

**确认队列**：队列项交给异步消费者后仍保留，只有消费者返回成功结果才视为完成并移除；消费者失败时保留该项，后续由队列的恢复策略再次处理。
_Avoid_: 服务端确认队列、exactly-once 队列

**持久化快照**：队列在状态变更后向外部存储适配器提供的当前待处理项快照；它表达写入边界，不自动承诺服务端投递成功、事务性 durability 或 exactly-once 处理。
_Avoid_: ack、传输确认、服务端响应

### Runtime queue design decisions

队列能力的完整决策与行为边界以 [ADR-0007](docs/adr/0007-plugin-system.md) 的「队列能力补充」为权威；此处只保留跨包一致的术语级边界：

- 公共能力并列命名为 `defineQueue` 与 `defineAckQueue`，经 `definePlugin(...).make()` 暴露；`defineLoopQueue` 已删除，不保留兼容别名。
- 持久化与消费者确认是两个正交维度：可选 `onPersist(readonly T[])` 是同步持久化快照接缝；`defineAckQueue` 以消费者返回的 fulfilled Promise 作为确认。
- 持久化失败是 queue-global 的 fail-closed 条件；消费失败是 item-local 的可重试状态。这两个词的完整语义以 ADR-0007 为准。
- Tracker core 沿用 `transport` 表示单条传输函数，其 ack 只表示浏览器传输路径成功，不代表服务端确认。

## Tracker event vocabulary

**页面错误（Page Error）**：Tracker 收集的浏览器全局运行时失败，包含 uncaught error 与 unhandled promise rejection；不包含资源加载失败、console 消息或框架回调错误。
_Avoid_: JS error、异常监控、资源错误

## 历史导航词汇（History Nav）

**导航条目（Navigation Entry）**:
历史导航模块记录的一次同文档导航；每条具备栈内稳定 id、跨 replace 保持的 key、当前 index 与 URL。
_Avoid_: 历史记录点、页面快照、浏览记录

**同文档导航（Same-document Navigation）**:
不离开当前页面、仅通过 URL 片段变化或 history API 产生的导航（含浏览器前进/后退）；history-nav 只跟踪这一类，整页加载或跨文档跳转不在其职责内。
_Avoid_: 页面跳转、路由切换（避免与 router 概念混淆）

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

| ADR                                                                | 决策                                        | 何时读取                                                                |
| ------------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------- |
| [0001](docs/adr/0001-ci-pipeline.md)                               | CI Pipeline                                 | 修改验证、Changesets 或发布门控                                         |
| [0002](docs/adr/0002-build-toolchain.md)                           | Build Toolchain                             | 修改 Vite Plus、构建或测试工具链                                        |
| [0003](docs/adr/0003-release-planes.md)                            | Release Planes                              | 修改 npm/Wails 发布流程                                                 |
| [0004](docs/adr/0004-progressive-agent-context-architecture.md)    | Agent Context Architecture                  | 修改 agent context、rules、skills 或 instruction system                 |
| [0005](docs/adr/0005-web-ui-component-architecture.md)             | Web UI Component Architecture               | 修改 web-ui 组件技术选型、公共契约、事件模型、框架类型适配或 icon 系统  |
| [0006](docs/adr/0006-web-ui-composition-rendering-architecture.md) | Web UI Composition & Rendering Architecture | 修改 overlay 交互/定位、布局层级、design token 或 @lit/context 组合模式 |
| [0007](docs/adr/0007-plugin-system.md)                             | Plugin System                               | 设计可组合状态或行为模块                                                |
| [0008](docs/adr/0008-interweave-backend-architecture.md)           | Interweave Backend Architecture             | 修改 interweave Go 模块、Wails Service 或 frontend bindings             |
| [0009](docs/adr/0009-interweave-sqlite-persistence-wal.md)         | SQLite Persistence WAL                      | 修改 interweave 持久化层或 SQLite 并发模型                              |

## Interweave 产品与领域词汇

Interweave 当前已确认的产品基线见 [`apps/interweave/docs/product.md`](apps/interweave/docs/product.md)。产品、领域模型、Map、标签、Source 或 MCP 路线任务按需读取该文档和 ADR-0008；各改动主题对应的 ADR 以上方索引表的「何时读取」列为准，此处不再逐条复述。

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

## web-ui 组件组合词汇

**语义色源 token（semantic hue token）**:
表示 accent、success、warning、danger、info 等模式适配后的基础含义色；它不是某个组件的按钮背景或 hover/active 状态色。
_Avoid_: primary 背景、variant 背景、状态色

**Variant 状态色（variant state color）**:
组件基于自身 variant surface 或语义色源派生的 hover/active 展示色；filled/neutral 状态向黑色加深，tonal variant 可保留自己的语义色状态比例。
_Avoid_: 直接改写语义色源 token、用主题文本作为按压加深锚点

**覆盖层 slot 组合（overlay slot composition）**:
trigger 经命名 slot 提供、内容/面板由组件托管的组合模式；面板常脱离文档流（portal）。组件把 trigger 状态 ARIA（aria-expanded 等）回写到 trigger slot 的首个 assigned element，交互语义由 slot 内的可交互元素原生提供。
_Avoid_: trigger/content 拆分为独立公开元素（React 式三元素）、在 trigger 包装结构上承载 ARIA

**受管子元素组合（managed child composition）**:
子项是公开 custom element（option、segmented-trigger、radio、checkbox 等）的组合模式。成员追踪与点击归因由 GroupController 直驱，禁用/展示态经 @lit/context 下行广播（只下行），选中态由根直写子项（上行）；子项被移出组后恢复独立控件语义。
_Avoid_: 用 context 承载成员追踪或上行写回、在子项上用公开属性表达组状态

## 已知边界

- 所有发布的 JavaScript 包均为 ES modules；`tsconfig` 仅发布 JSON profile。
- `web-ui` 不打包框架代码；消费者安装并提供 `lit`，可选地提供 React/Vue 类型依赖。
- 应用均为私有包，不发布到 npm；React/Vue demo 部署到 GitHub Pages，Wails starter 通过 GitHub Release 交付安装程序。
- registry 使用 npmmirror，CI 覆盖为官方 npm registry；不得为局部任务改写 registry/mirror。

组件、token、overlay 与事件语义按需读取 `docs/agents/web-ui.md` 及其指向的 ADR；公共 package 或跨 workspace 契约审查按需读取 `contract-change-review` skill，并以 manifest、消费者和测试为事实；构建、部署与 release workflow 按需读取 `docs/agents/build.md` 和 ADR-0003。
