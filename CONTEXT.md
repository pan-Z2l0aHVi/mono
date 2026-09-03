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

以下是 `defineQueue` 与 `defineAckQueue` 公共化方案的已实现行为和边界：

- 公共能力并列命名为 `defineQueue` 与 `defineAckQueue`；`defineLoopQueue` 直接删除，不保留兼容别名。
- 两种队列都可以通过可选的 `onPersist(readonly T[])` 持久化待处理项快照；持久化与消费者确认是两个正交维度。
- `defineAckQueue` 以消费者返回的 fulfilled Promise 作为确认；rejection 会保留该项。
- 消费失败是 item-local：失败项进入待重试状态，不阻塞后续项；因此成功交付顺序不保证严格 FIFO。
- 第一版不自动重试；`resume()`、`flush()` 和下次实例化是恢复入口。
- `flush()` 返回 `Promise<void>`，会尝试 pending 与 failed 项并跳过 in-flight 项；传输失败只保留条目，不因单项失败拒绝整个刷新 Promise。
- 持久化失败与消费失败不同：它是 queue-global 的 fail-closed 条件，应停止会改变队列成员关系的新消费，避免在无法保存快照时静默丢失数据。

- 消费者回调只接收业务数据 `T`，不暴露内部 ID、剩余队列或调度状态；`defineQueue` 不等待消费者 Promise，`defineAckQueue` 等待其确认。
- `onConsume` 是必需选项；不提供消费者不构成有效的公共队列实例。
- 普通 drain 固定串行；`flush()` 并发启动调用时的 pending/failed 项，以适配页面退出时的 best-effort 发送。
- `flush()` 忽略暂停状态但不修改暂停状态，并以调用时的快照为边界；调用后新入队项不属于本次 Promise。
- `defineAckQueue` 的消费者 rejection 是可重试失败；`defineQueue` 在交付后不重试。第一版不加入 `drop`、dead-letter 或最大重试次数。
- 持久化采用 persist-before-commit：快照成功写入后才提交内存成员变更；写入失败时保留原状态，已成功传输但未能持久化删除的项可能重复发送。
- 初始数据选项命名为 `initialItems`，类型为 `readonly T[]`。

- 消费者错误通过独立的可选 `onConsumeError(error, item)` 观察；队列捕获同步 throw 与异步 rejection，避免 unhandled rejection。
- `enqueue()` 遇到持久化提交失败同步抛出原始错误；`flush()` 对传输失败 resolve，对持久化提交失败 reject；持久化错误不伪装为消费者错误。
- `resume()` 在 persistence-blocked 时先尝试重新写入当前快照；成功后解除阻塞，失败则继续 blocked；不做后台自动重试。
- persistence-blocked 时 `flush()` 不启动新的 dispatch，只允许已有 in-flight 操作 settle。
- `flush()` 不重复启动 in-flight 项，但等待调用时已经存在的 in-flight 操作；failed 项恢复时保留原队列位置。
- `initialItems` 在实例创建后通过 microtask 自动调度，给插件组合中的 pause 留出接线时间。
- 队列第一版不提供 `dispose()`；没有外部资源的通用队列不额外引入生命周期协议。
- `onPersist` 每次收到新的浅层 `readonly T[]` 快照；成员关系变化时调用，恢复 `persistence-blocked` 时可能额外执行一次当前快照 probe；不持久化内部 ID 或调度状态，恢复初始数据时不重复写入。
- `onPersist` 是同步提交接缝；公共队列不等待它返回 Promise。`defineQueue` 与 `defineAckQueue` 都通过 `definePlugin(...).make()` 暴露，私有 queue core 不单独导出。
- Tracker core 内部继续使用 `transport` 表示单条传输函数，并通过 `defineAckQueue` 等待 transport Promise fulfilled；这里的 ack 只表示浏览器传输路径成功，不代表服务端确认。

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

| ADR                                                                     | 决策                                                    | 何时读取                                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| [0001](docs/adr/0001-ci-pipeline.md)                                    | CI Pipeline                                             | 修改验证、Changesets 或发布门控                                   |
| [0002](docs/adr/0002-build-toolchain.md)                                | Build Toolchain                                         | 修改 Vite Plus、构建或测试工具链                                  |
| [0003](docs/adr/0003-web-component-strategy.md)                         | Web Component Strategy                                  | 修改 Lit、Shadow DOM 或框架集成                                   |
| [0004](docs/adr/0004-plugin-system.md)                                  | Plugin System                                           | 设计可组合状态或行为模块                                          |
| [0005](docs/adr/0005-overlay-interaction-policy.md)                     | Overlay Interaction Policy                              | 修改 overlay 关闭、焦点或事件协调                                 |
| [0006](docs/adr/0006-layout-layering.md)                                | Layout Layering                                         | 修改布局层级、portal 或 z-index                                   |
| [0007](docs/adr/0007-web-ui-contract-convergence.md)                    | Web UI Contract Convergence                             | 修改组件公共契约、事件或表单行为                                  |
| [0008](docs/adr/0008-icon-system.md)                                    | Icon System                                             | 修改图标来源、生成器或导出                                        |
| [0009](docs/adr/0009-release-planes.md)                                 | Release Planes                                          | 修改 npm/Wails 发布流程                                           |
| [0010](docs/adr/0010-design-token-restructure.md)                       | Design Token Restructure                                | 修改 `--wui-*` token 或破坏性兼容性                               |
| [0011](docs/adr/0011-framework-type-adaptation-narrowing.md)            | Framework Type Adaptation Narrowing                     | 修改 React/Vue 类型适配或复合控件事件边界                         |
| [0012](docs/adr/0012-progressive-agent-context-architecture.md)         | Progressive Agent Context Architecture                  | 修改 agent context、rules、skills 或 instruction system           |
| [0017](docs/adr/0017-interweave-resource-source-boundary.md)            | Interweave Resource/Source 与外部内容边界               | 修改 interweave Resource、Source 或外部内容边界                   |
| [0018](docs/adr/0018-interweave-flat-semantic-tags-map.md)              | Interweave 扁平语义标签与派生 Map                       | 修改 interweave 标签、Map 或资源关系语义                          |
| [0019](docs/adr/0019-interweave-backend-capability-boundaries.md)       | Interweave 后端能力边界与 Wails 暴露面                  | 修改 interweave Go 模块、Wails Service 或 frontend bindings       |
| [0020](docs/adr/0020-interweave-fresh-library-start.md)                 | Interweave v1 新资源库起点                              | 修改 interweave 本地库初始化或旧库兼容策略                        |
| [0021](docs/adr/0021-interweave-source-identity.md)                     | Interweave Source 同一性与去重                          | 修改 interweave Source 去重或规范化规则                           |
| [0022](docs/adr/0022-interweave-source-availability.md)                 | Interweave Source 布尔可用性与 URL 写入时序             | 修改 interweave Source 可用状态或 URL 抓取/写入规则               |
| [0023](docs/adr/0023-interweave-resource-title-ownership.md)            | Interweave Resource 标题的独立所有权                    | 修改 interweave Resource 标题或 Source 元数据更新规则             |
| [0024](docs/adr/0024-interweave-resource-source-preference.md)          | Interweave Resource Source 基数与首选规则               | 修改 interweave Source 删除、首选或基数不变量                     |
| [0025](docs/adr/0025-interweave-duplicate-sources-are-user-managed.md)  | Interweave 重复 Source 由用户自行管理                   | 修改 interweave Source 重复添加或去重策略                         |
| [0026](docs/adr/0026-interweave-standardized-tag-names.md)              | Interweave 标准化标签名称与自动复用                     | 修改 interweave 标签创建、名称标准化或同名复用策略                |
| [0027](docs/adr/0027-interweave-stable-tag-identity.md)                 | Interweave Tag 的稳定内部身份                           | 修改 interweave Tag ID 或 Resource—Tag 关联键                     |
| [0028](docs/adr/0028-interweave-resource-scoped-tag-operations.md)      | Interweave 标签操作仅作用于单个 Resource                | 修改 interweave 标签作用域或全局标签管理边界                      |
| [0029](docs/adr/0029-interweave-map-local-exploration-boundary.md)      | Interweave Map 局部探索操作边界                         | 修改 interweave Map 交互边界或探索操作模型                        |
| [0030](docs/adr/0030-interweave-sqlite-persistence-wal.md)              | Interweave 本地 SQLite 持久化与 WAL 并发模型            | 修改 interweave SQLite 配置、并发或持久化基础设施                 |
| [0031](docs/adr/0031-layout-sidebar-collapse.md)                        | Layout 页面结构、Banner 与可折叠 Sidebar                | 修改 `web-ui-layout` 的页面结构、Sidebar、Banner 或移动端 Drawer  |
| [0032](docs/adr/0032-interweave-library-core-layer.md)                  | Interweave library 分层与 core 产品规则层               | 修改 interweave library 分层、Wails 外观或产品规则归属            |
| [0033](docs/adr/0033-cross-framework-api-convention.md)                 | 跨框架 API 约定与框架调用方绑定约束                     | 修改 web-ui 的 Property/Attribute/Event 命名或跨框架绑定兼容性    |
| [0034](docs/adr/0034-web-ui-semantic-token-system.md)                   | Web UI Semantic Token System                            | 修改 `--wui-*` token 契约、focus 指示器或组件 token 文档          |
| [0035](docs/adr/0035-web-ui-drawer-drag-close.md)                       | Web UI Drawer 边缘拖拽关闭                              | 修改 drawer 拖拽手势、drag bar、关闭态无渲染约束或弹簧动画        |
| [0036](docs/adr/0036-web-ui-drawer-floating-card.md)                    | Web UI Drawer 浮动卡片视觉语言                          | 修改 drawer 视觉容器：留边、圆角或贴边语义（非 headless）         |
| [0037](docs/adr/0037-web-ui-nested-drawer-stacking.md)                  | Web UI Nested Drawer 声明式层叠与自适应阶梯露边         | 修改 nested drawer 层叠、等比缩放、上方最大宽度补偿或卡片露边策略 |
| [0038](docs/adr/0038-web-ui-collapse.md)                                | Web UI Collapse 组件族                                  | 修改 collapse 展开收起、trigger/content 家族或关闭态渲染语义      |
| [0039](docs/adr/0039-browser-kit-history-nav.md)                        | browser-kit 自研 history-nav（Navigation API 只读子集） | 修改 history-nav 公共 API、导航跟踪或前进/后退可用性              |
| [0040](docs/adr/0040-web-ui-collapse-single-element-and-lit-context.md) | Web UI Collapse 单组件化与 @lit/context 下行通道        | 修改 collapse 组件形态、受管组合下行通道或 headless 内核方向      |
| [0041](docs/adr/0041-web-ui-overlay-content-migration.md)               | Web UI 覆盖层内容迁移与 slot 属性边界                   | 修改覆盖层 portal 迁移、menu 族关闭态隐藏或消费者节点写入面       |
| [0042](docs/adr/0042-web-ui-trigger-aria-writeback.md)                  | Web UI trigger 元素 ARIA 回写约定                       | 修改 slot-trigger 组件的 aria-expanded/controls 回写行为          |
| [0043](docs/adr/0043-web-ui-instant-state-feedback.md)                  | Web UI hover/active 背景反馈即时切换                    | 修改 web-ui 组件 hover/active 背景反馈的过渡行为                  |

## Interweave 产品与领域词汇

Interweave 当前已确认的产品基线见 [`apps/interweave/docs/product.md`](apps/interweave/docs/product.md)。产品、领域模型、Map、标签、Source 或 MCP 路线任务按需读取该文档和 ADR-0017/0018；修改本地资源库初始化或旧库兼容策略时还读取 ADR-0020；修改 Source 输入规范化、重复添加或去重策略时还读取 ADR-0021/0025；修改 Source 可用状态或 URL 抓取规则时还读取 ADR-0022；修改 Resource 标题或 Source 元数据更新规则时还读取 ADR-0023；修改 Source 删除、首选或基数不变量时还读取 ADR-0024；修改标签创建、名称标准化或同名复用策略时还读取 ADR-0026；修改 Tag ID 或 Resource—Tag 关联键时还读取 ADR-0027；修改标签操作作用域或全局标签管理策略时还读取 ADR-0028；修改 Map 交互边界或探索操作模型时还读取 ADR-0029；修改 SQLite 配置、并发或持久化基础设施时还读取 ADR-0030；修改 interweave library 分层或产品规则归属时还读取 ADR-0032；修改 web-ui 的 Property/Attribute/Event 命名或跨框架绑定兼容性时还读取 ADR-0033；修改 web-ui 的 `--wui-*` token 契约、focus 指示器或组件 token 文档矩阵时还读取 ADR-0034；修改 drawer 拖拽手势、drag bar、关闭态无渲染约束或弹簧动画时还读取 ADR-0035；修改 drawer 视觉容器（留边、圆角或贴边语义）时还读取 ADR-0036；修改 drawer 声明式层叠、等比缩放、上方最大宽度补偿或卡片露边策略时还读取 ADR-0037；修改 collapse 组件形态、受管组合下行通道或 headless 内核方向时还读取 ADR-0040；修改覆盖层 portal 迁移、menu 族关闭态隐藏或消费者节点写入面时还读取 ADR-0041；修改 slot-trigger 组件的 ARIA 回写行为时还读取 ADR-0042；修改 web-ui 组件 hover/active 背景反馈的过渡行为时还读取 ADR-0043；修改 Go 模块、Wails Service 或 frontend bindings 时还读取 ADR-0019。

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

组件、token、overlay 与事件语义按需读取 `docs/agents/web-ui.md` 及其指向的 ADR；公共 package 或跨 workspace 契约审查按需读取 `contract-change-review` skill，并以 manifest、消费者和测试为事实；构建、部署与 release workflow 按需读取 `docs/agents/build.md` 和 ADR-0009。
