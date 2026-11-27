# interweave

使用或修改任何 Wails API 前，先查阅 [Wails 3 官方文档](https://v3.wails.io/reference/overview/)，不依赖 Wails v2 API 或第三方示例。后端边界与持久化见 [ADR-0008](../../docs/adr/0008-interweave-backend.md)、[ADR-0009](../../docs/adr/0009-interweave-sqlite.md) 与 [ADR-0024](../../docs/adr/0024-interweave-native-menu-and-go-owned-settings.md)。

## 架构与 Wails 硬边界

- **Wails Service Allowlist**：只有 `library`、`native`、`settings` 与 `menu` 可注册 Wails Service 并暴露给前端；`backend/remote/` 与 `backend/internal/` **禁止注册 Service 或被前端直接调用**，`backend/native/menu/` 只由 `main.go` 装配。公开 Go API 变更后跑 `pnpm exec turbo build --filter=@greypan/interweave-frontend` 重生 `frontend/bindings/`（见 [`generated-artifacts.md`](../../docs/agents/generated-artifacts.md)）。
- **单应用壳**：[`frontend/src/components/AppLayout.vue`](./frontend/src/components/AppLayout.vue) 独占 `web-ui-layout`，页面需要顶栏时在根节点写 `slot="header"`，不得自带 `web-ui-layout` 或按 route meta 分叉壳（会重建 sidebar 并掐断 icon 动画）。不保留泛化 `@api/*` / `@bindings/*` alias。
- **Runtime 注入时序**：Go 在 `WebViewDidFinishNavigation` 后才注入 `window._wails`，启动序在挂载前等待 runtime 就绪后再一次性读取平台与 bindings，不改成先渲染再响应式重读。
- **窗口拖动区**：`data-window-drag` 必须挂在与控件同级的透明底层（`absolute inset-0 -z-10`），不挂容器（`--wails-draggable` 会继承），也禁止用 `Mac.InvisibleTitleBarHeight`（会把 header 按钮整条变成拖窗口）。
- **剪贴板、缩放与预览租约**：纯文本剪贴板走 `runtime.system`（Go 实现，leaf 组件不直接 import `@wailsio/runtime`）；缩放档位（90/100/110/120）归 `backend/settings/`，窗口缩放只由前端 `App.vue` 调 `Window.SetZoom`（Go 不直接调 `window.Zoom*`）；添加资源的 preview token 租约与 `waitForPreview` 时序由资源库添加队列 controller 统一拥有。
- **展开式字段焦点**：工具条展开式字段的收起/焦点交还策略归专用 composable，只用 ref 与 `document.activeElement` 判断，不枚举 `closest('web-ui-…')`。
- **Bindings 返回类型**：class-mode bindings 已将顶层 Wails slice 规范化为非 nullable 数组，前端直接消费生成类型，不重复写 `?? []`。

## 产品边界与领域词汇

- **产品边界（不得顺手扩大）**：只引用外部内容而不接管（不复制/移动/重命名/删除原文件或网页），移除 Resource 只删库内记录；文件找回须用户主动扫描并确认替换；不做自动归类、自动修复、后台可用性轮询、云同步、内容托管、全文索引/OCR、版本历史、标签层级/别名或自动合并；v1 不迁移旧库、不含 MCP/Agent 写入。不在前端复制领域规则。
- **Resource（资源）**：原子概念对象，含独立标题、短备注、语义标签与 1+ 个 Source。标题仅首次纳入从首个 Source 取默认值，此后仅用户显式编辑，新增/刷新不得覆盖。
- **Source（来源）与首选 Source**：外部访问入口（文件或 URL），多 Source 是备用入口而非版本；每个 Resource 恰有一个首选 Source（首个自动首选，新增不切换，删除首选时最早剩余 Source 递补）。
- **重复 Source**：v1 **不做全局 Source 去重**，每次添加/替换均独立记录；抓取重定向不改写初始 URL。
- **URL 展示分类**：直链图片（扩展名优先，`Content-Type: image/*` 兜底）归 `image`，页面链接保持 `web`；`available` 不拦预览与壁纸入口。
- **Source 可用性与 AvailabilityGate**：持久化 `available: boolean`（无 `unknown`）。URL 新建在 10s 内抓基础元数据（失败仍写入 `false`），打开详情时按需复判（无法判定保留原值）；文件监听所在目录，**所有可用性写入统一经 [`backend/library/watch/`](./backend/library/watch/) 的 `AvailabilityGate`**，调用方不得绕开它落库或发事件。
- **Semantic Tag / Tagging / Map**：Tag 扁平不可变、按标准名自动复用；Tagging 只关联 `resource_id` 与 `tag_id`；Map 为派生探索视图，不持久化画布布局或手工连线。
