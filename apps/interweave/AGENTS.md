# interweave

在使用或修改任何 Wails API 前，先查阅 [Wails 3 官方文档](https://v3.wails.io/reference/overview/)。官方文档可用时不要依赖 Wails v2 API、示例或第三方 API 参考。

## 导航

- Go Wails host 入口是 [`main.go`](./main.go)，后端能力边界在 [`backend/`](./backend/)，前端集成在 [`frontend/src/`](./frontend/src/)。
- [`backend/library/`](./backend/library/) 拥有 Resource、Source、语义标签、Map 与其本地持久化；[`backend/native/`](./backend/native/) 拥有受控的 OS 能力；[`backend/settings/`](./backend/settings/) 拥有应用设置的类型、校验与持久化；[`backend/remote/`](./backend/remote/) 仅供 Go 发起出站 HTTP；[`backend/internal/`](./backend/internal/) 只放跨后端模块复用的工具。
- 顶部菜单的形状定义在 [`backend/native/menu/`](./backend/native/menu/)（`Describe` 是纯数据，`Build` 物化成 Wails 菜单，`Snapshot` 产出供 Windows 一体化顶栏消费的菜单快照），跨端命令契约与菜单 Service 在 [`backend/menu/`](./backend/menu/)。macOS/Linux 菜单点击发 `menu:command` 事件由前端分发；Windows 一体化顶栏订阅 `menu:tree-changed`、启动时拉取 `GetMenu`，点击时通过 `InvokeMenuItem` 回传 Go 统一执行（Go 侧命令就地处理，前端命令仍走 `menu:command`）；禁用集合经 `ReportDisabledCommands` 上报，不落盘，不属于 settings。
- 前端保留模块边界，即 [`frontend/src/`](./frontend/src/) 下的 [`components/`](./frontend/src/components/)、[`pages/`](./frontend/src/pages/)、[`stores/`](./frontend/src/stores/)、[`composables/`](./frontend/src/composables/) 和 [`services/`](./frontend/src/services/)，以及由 `vue-router/vite` 从 [`frontend/src/pages/`](./frontend/src/pages/) 生成的 file-based 路由表。
- 应用壳只有一套：[`frontend/src/components/AppLayout.vue`](./frontend/src/components/AppLayout.vue) 独占 `web-ui-layout` 与 [`frontend/src/components/AppNav.vue`](./frontend/src/components/AppNav.vue)，`RouterView` 只往默认 slot 换页面内容，并内置按 `route.meta.keepAlive` 控制的 `<KeepAlive>` 扩展点。
- 路由层复用 `@greypan/route-progress` 与 Vue 端守卫模式：[`frontend/vite.config.ts`](./frontend/vite.config.ts) 通过 `importMode` 仅保持 `/library` 同步，其余页面按页懒加载；[`frontend/src/router/guards.ts`](./frontend/src/router/guards.ts) 统一收口延迟跳转与顶部进度条（[`RouteProgressBar.vue`](./frontend/src/components/RouteProgressBar.vue)），[`AppNav.vue`](./frontend/src/components/AppNav.vue) 悬停/聚焦/触摸时触发意图预取，[`frontend/src/router/prefetch.ts`](./frontend/src/router/prefetch.ts) 提供集中式真 SWR（`revalidateIfStale: true`）预取注册表，局部 loading 复用 [`useDelayedLoading.ts`](./frontend/src/composables/useDelayedLoading.ts)。
- 页面需要顶部工具条时，在多根 fragment 的根节点上写 `slot="header"`，不要自带 `web-ui-layout`，也不要在模板里按 route meta 分叉壳。分叉会让切路由重建 sidebar，掐断正在播放的 icon 画线动画。
- 页面是否已实现以 [`frontend/src/pages/`](./frontend/src/pages/) 下的当前代码为准；未实现页面用 `web-ui-empty` 占位。
- 不保留泛化的 `@api/*` 或 `@bindings/*` alias。第一个公开 Service 生成后，再按实际生成路径只为 `library`、`native` 或 `settings` 建立显式 alias。

## 领域与产品边界

- 产品与领域词汇以本文件的「领域与产品边界」为权威。后端能力边界与持久化模型读 [ADR-0008](../../docs/adr/0008-interweave-backend.md) 和 [ADR-0009](../../docs/adr/0009-interweave-sqlite.md)。已实现行为以 [`backend/library/`](./backend/library/) 及其 Go 测试为真相。纯局部实现不预读这些文档。
- 产品边界（不得顺手扩大的部分）：Interweave 引用外部内容而不接管它，不复制、移动、重命名或删除原始文件与网页，移除 Resource 只删库内记录；文件找回由用户主动扫描指定目录或已挂载本地磁盘，候选须经用户确认后替换 Source；不做自动归类、自动修复、后台可用性轮询、账户、云同步或跨设备同步；文件夹监听只限库内已登记 file source 所在目录，用于同步可用状态；不做内容托管（无 Markdown/富文本工作台）、全文索引、OCR、音视频转写或 Resource 版本历史；标签只在单个 Resource 上增删，无父子、别名、全局管理面板或自动语义合并；MCP 与 Agent 写入不进入 v1。
- 公共 UI 契约仍以 [`packages/web-ui`](../../packages/web-ui) 为准。
- 不在前端复制领域规则。后续 Go 侧实现统一落在 [`backend/`](./backend/)。

**资源（Resource）**:
用户希望长期找回、理解或使用的原子概念对象；保存独立标题、短备注、语义标签与一个或多个 Source。
_Avoid_: 条目、文件夹、项目容器、内容页面

**v1 新资源库起点**:
v1 使用新建的本地资源库，不迁移或兼容本地资源库重建前的旧 Interweave 数据。
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

**URL 来源的展示分类**:
kind 是展示层的权威闭集词汇。URL 来源的链接是直链图片（扩展名优先，探测到的 Content-Type 为 image/* 兑底）时归 image，驱动缩略图、预览形态与壁纸菜单；页面链接保持 web，即使页面里有图。available 只反映上次抓取是否成功，不拦预览与壁纸入口。
_Avoid_: URL 一律 web、把探测失败当成链接失效、为 URL 生成派生缩略图副本

**Source 可用性**:
以 `available: boolean` 持久化：`true` 为可用，`false` 为不可用。新建 URL 必须在 10 秒总时限内完成基础元数据抓取再写入；失败或超时仍写入为 `false`，非 HTML 或展示元数据缺失不影响 `true`，后续非元数据数据加载不阻塞写入。新建文件先做轻量 `stat`，成功或失败分别写入 `true` 或 `false`，但都纳入；可访问文件的身份与属性在纳入或替换后同步记录，内容 hash 在后台采集，不阻塞纳入。
已登记的 file source 只监听其所在目录：`available` 随文件增删自动翻转并恢复，媒体读取确认不可达时立即改判为 `false`。URL 不做监听，只在用户打开详情时按需重新判定；该次判定无法得出结论时保留原值。
可用性写入统一经 [`backend/library/watch/`](./backend/library/watch/) 的 AvailabilityGate——目录监听与媒体 404 兜底共用的唯一写入口；落库、事件时序与「只在真翻转时发」由 gate 拥有，调用方不得绕开它自行落库或发事件，改动前读该目录的测试。
_Avoid_: `unknown`、独立状态枚举、以元数据完整性替代可用性、后台轮询探测、把无法判定写成不可用、绕开 gate 的可用性写入

**语义标签（Semantic Tag）**:
用户赋予 Resource 的扁平内容意义。每个 Tag 有不可变内部 `tag_id`；名称经标准化后不可变；标准名称相同即自动复用；没有别名、全局管理面板或自动语义合并；操作仅在单个 Resource 上增删 Tagging。标签无父子、路径、继承或显式标签关系；Resource 的关联仅从共享语义标签派生。
_Avoid_: 文件夹、目录、类型、状态、标签别名、自动语义合并

**Tagging**:
一个 Resource 被赋予一个 Tag 的内部归属关系，只引用 `resource_id` 与 `tag_id`；不是特殊 Tag，也不直接向用户展示。
_Avoid_: `ResourceTag`、标签子类型、以标签名称作为关联键

**资源关系地图（Map）**:
从 Resource 与语义标签的归属关系派生的分层探索视图，用于发现主题群、桥梁与孤立资源；仅支持局部探索与单资源就近增删标签，不持久化画布布局或手工连线。
_Avoid_: 文件树、画布编辑器、关系连线器、资源容器

## Wails Service 与 bindings allowlist

- 只有 `library`、`native` 与 `settings` 可注册 Wails Service 并生成、消费 Interweave Go Service bindings。`remote` 与 `internal` 禁止注册 Wails Service，也不得被前端直接调用或消费其 bindings。Wails runtime bindings 不属于此业务 allowlist。
- `backend/menu/` 拥有事件名、命令契约与菜单 Service（`ReportDisabledCommands`、`GetMenu`、`InvokeMenuItem`），`backend/native/menu/` 只被 `main.go` 装配、不注册 Service。菜单的形状与置灰由 Go 拥有，前端只负责上报禁用集合并在 Windows 端渲染顶栏快照。
- 菜单命令的前端分发在 [`frontend/src/services/menu/index.ts`](./frontend/src/services/menu/index.ts)，可用性上报在 [`frontend/src/services/menu/state.ts`](./frontend/src/services/menu/state.ts)；纯文本剪贴板的前端动作在 [`frontend/src/composables/plainTextClipboard.ts`](./frontend/src/composables/plainTextClipboard.ts)。
- 公开 Go API 变更后运行 `pnpm exec turbo build --filter=@greypan/interweave-frontend` 生成 [`frontend/bindings/`](./frontend/bindings/) 并核对前端类型检查（生成边界见 [`docs/agents/generated-artifacts.md`](../../docs/agents/generated-artifacts.md)）。

## 修改指南

- 添加资源的 preview token 时序（先 `waitForPreview` 等预览就绪、再创建、再释放预览、最后关闭）由资源库添加队列的 controller 拥有，页面只经 `submit` 提交整个队列，不得自组提交循环。token 的发放、驱逐对账与释放由页面持有的 preview lease 统一记账，添加队列与找回弹窗共用同一本 lease。
- 文件选择等可取消操作应明确取消语义。class-mode bindings 已将顶层 Wails slice 返回值规范化为非 nullable 数组，前端应消费生成类型而不重复添加 `?? []`。仅 DTO 中仍为可选或 nullable 的字段按其生成类型处理，且不得手改生成 bindings。
- 文本剪贴板读取走 `runtime.system.readClipboardText`；WebView 的 `navigator.clipboard` 只在浏览器预览适配器里作为回退使用，leaf 组件不直接 import `@wailsio/runtime`。
- 工具条里展开式字段（搜索框、筛选字段等）的开关策略（按在「字段上下文」容器里不收起、簇内点击后把焦点交还字段、被弹层接管焦点时让位）由 `frontend/src/composables/` 里专用的展开式字段 composable 拥有。页面的 header 需要同样行为时，把字段与容器 ref 交给它；判据只用 ref 与 `document.activeElement`，不要在组件里按 `closest('web-ui-…')` 枚举组件类型——header 里的控件会随页面变化。

- 平台、flags 与 bindings 都要在 runtime core 注入之后才读：Go 侧在 `WebViewDidFinishNavigation` 之后才注入 `window._wails`，早于它的 setup 调用读到的是空值。启动序在挂载前等待 runtime 就绪（判据与事件名都只有 runtime 服务一份），所以壳里可以一次性取平台；不要改成「先渲染再补」的响应式重读。
- 界面缩放的档位（90/100/110/120）是 [`backend/settings/`](./backend/settings/) 拥有的一项设置，菜单与设置面板都只改档位：菜单走 service 的 `ZoomIn` / `ZoomOut` / `ZoomReset`，面板走 `UpdateSettings`。窗口缩放只由前端按快照调 `Window.SetZoom`（[`frontend/src/App.vue`](./frontend/src/App.vue)），不要在 Go 里直接调 `window.ZoomIn/Out/Reset`，也不要在前端另存一份档位。
- 窗口拖动区按元素声明，不按坐标：`data-window-drag` 必须挂在**与控件同级**的一层透明底上（`absolute inset-0 -z-10`），只铺容器里没人占的空白；不要给容器挂标记再让控件退出——`--wails-draggable` 会被继承。规则在 [`frontend/src/assets/global.css`](./frontend/src/assets/global.css)。现有拖动面都按这条声明：资源库工具条行内的透明底，与 macOS 侧栏顶部给红绿灯让位的那条区域；页面若要自己的 header 参与拖动，就在里面加一层同样的底，不要在窗口选项里用 `Mac.InvisibleTitleBarHeight`——它按 y 坐标命中整条带子，会把 header 上的按钮一并变成拖窗口。
