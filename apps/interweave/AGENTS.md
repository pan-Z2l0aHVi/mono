# interweave

在使用或修改任何 Wails API 前，先查阅 [Wails 3 官方文档](https://v3.wails.io/reference/overview/)。官方文档可用时不要依赖 Wails v2 API、示例或第三方 API 参考。

## 导航

- Go Wails host 入口是 [`main.go`](./main.go)，后端能力边界在 [`backend/`](./backend/)，前端集成在 [`frontend/src/`](./frontend/src/)。
- [`backend/library/`](./backend/library/) 拥有 Resource、Source、语义 tag、Map 与其本地持久化；[`backend/native/`](./backend/native/) 拥有受控的 OS 能力；[`backend/remote/`](./backend/remote/) 仅供 Go 发起出站 HTTP；[`backend/internal/`](./backend/internal/) 只放跨后端模块复用的工具。
- 前端保留模块边界，即 [`frontend/src/`](./frontend/src/) 下的 [`components/`](./frontend/src/components/)、[`pages/`](./frontend/src/pages/)、[`stores/`](./frontend/src/stores/)、[`composables/`](./frontend/src/composables/) 和 [`services/`](./frontend/src/services/)，以及由 `vue-router/vite` 从 [`frontend/src/pages/`](./frontend/src/pages/) 生成的 file-based 路由表。
- 应用壳只有一套：[`frontend/src/components/AppLayout.vue`](./frontend/src/components/AppLayout.vue) 独占 `web-ui-layout` 与 [`frontend/src/components/AppNav.vue`](./frontend/src/components/AppNav.vue)，`RouterView` 只往默认 slot 换页面内容。
- 页面需要顶部工具条时，在多根 fragment 的根节点上写 `slot="header"`，不要自带 `web-ui-layout`，也不要在模板里按 route meta 分叉壳。分叉会让切路由重建 sidebar，掐断正在播放的 icon 画线动画。
- 页面是否已实现以 [`frontend/src/pages/`](./frontend/src/pages/) 下的当前代码为准；未实现页面用 `web-ui-empty` 占位。
- 不保留泛化的 `@api/*` 或 `@bindings/*` alias。第一个公开 Service 生成后，再按实际生成路径只为 `library` 或 `native` 建立显式 alias。

## 领域与产品边界

- 产品与领域词汇以本文件的「领域与产品边界」为权威。后端能力边界与持久化模型读 [ADR-0008](../../docs/adr/0008-interweave-backend-architecture.md) 和 [ADR-0009](../../docs/adr/0009-interweave-sqlite-persistence-wal.md)。已实现行为以 [`backend/library/`](./backend/library/) 及其 Go 测试为真相。纯局部实现不预读这些文档。
- 产品边界（不得顺手扩大的部分）：Interweave 引用外部内容而不接管它，不复制、移动、重命名或删除原始文件与网页，移除 Resource 只删库内记录；不做全盘扫描、自动归类、自动修复、后台可用性轮询、账户、云同步或跨设备同步；文件夹监听只限库内已登记 file source 所在目录，用于同步可用状态，不扩展为全盘或递归扫描；不做内容托管（无 Markdown/富文本工作台）、全文索引、OCR、音视频转写或 Resource 版本历史；tag 只在单个 Resource 上增删，无父子、别名、全局管理 panel 或自动语义合并；MCP 与 Agent 写入不进入 v1。
- 公共 UI 契约仍以 [`packages/web-ui`](../../packages/web-ui) 为准。
- 不在前端复制领域规则。后续 Go 侧实现统一落在 [`backend/`](./backend/)。

**资源（Resource）**:
用户希望长期找回、理解或使用的原子概念对象；保存独立标题、短备注、语义 tag 与一个或多个 Source。
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

**Source 可用性**:
以 `available: boolean` 持久化：`true` 为可用，`false` 为不可用。新建 URL 必须在 10 秒总时限内完成基础元数据抓取再写入；失败或超时仍写入为 `false`，非 HTML 或展示元数据缺失不影响 `true`，后续非元数据数据加载不阻塞写入。新建文件先做轻量 `stat`，成功或失败分别写入 `true` 或 `false`，但都纳入且不读内容或计算 hash。
已登记的 file source 只监听其所在目录：`available` 随文件增删自动翻转并恢复，媒体读取确认不可达时立即改判为 `false`。URL 不做监听，只在用户打开详情时按需重新判定；该次判定无法得出结论时保留原值。
_Avoid_: `unknown`、独立状态枚举、以元数据完整性替代可用性、后台轮询探测、把无法判定写成不可用

**语义 tag（Semantic Tag）**:
用户赋予 Resource 的扁平内容意义。每个 Tag 有不可变内部 `tag_id`；名称经标准化后不可变；标准名称相同即自动复用；没有别名、全局管理 panel 或自动语义合并；操作仅在单个 Resource 上增删 Tagging。tag 无父子、路径、继承或显式 tag 关系；Resource 的关联仅从共享语义 tag 派生。
_Avoid_: 文件夹、目录、类型、状态、tag 别名、自动语义合并

**Tagging**:
一个 Resource 被赋予一个 Tag 的内部归属关系，只引用 `resource_id` 与 `tag_id`；不是特殊 Tag，也不直接向用户展示。
_Avoid_: `ResourceTag`、tag 子类型、以 tag 名称作为关联键

**资源关系地图（Map）**:
从 Resource 与语义 tag 的归属关系派生的分层探索视图，用于发现主题群、桥梁与孤立资源；仅支持局部探索与单资源就近增删 tag，不持久化画布布局或手工连线。
_Avoid_: 文件树、画布编辑器、关系连线器、资源容器

## Wails Service 与 bindings allowlist

- 只有 `library` 与 `native` 可注册 Wails Service 并生成、消费 Interweave Go Service bindings。`remote` 与 `internal` 禁止注册 Wails Service，也不得被前端直接调用或消费其 bindings。Wails runtime bindings 不属于此业务 allowlist。
- [`frontend/bindings/`](./frontend/bindings/) 是生成目录，不手工编辑。公开 Go API 变更后运行 `pnpm exec turbo build --filter=@greypan/interweave-frontend` 生成 bindings，并核对生成 diff 与前端类型检查。

## 修改指南

- 修改 Go/Wails API 时，先查 Wails 3 官方文档，再核对 Go 测试、frontend bindings 和消费端调用。公开 API 变更遵循上文 allowlist 与生成边界。
- 文件选择等可取消操作应明确取消语义。class-mode bindings 已将顶层 Wails slice 返回值规范化为非 nullable 数组，前端应消费生成类型而不重复添加 `?? []`。仅 DTO 中仍为可选或 nullable 的字段按其生成类型处理，且不得手改生成 bindings。
- 修改前端页面、store、组件或交互时，按 [`docs/agents/runtime-verification.md`](../../docs/agents/runtime-verification.md) 在真实 Wails/浏览器集成表面验证。
