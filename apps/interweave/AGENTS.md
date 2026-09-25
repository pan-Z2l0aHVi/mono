# Interweave 应用指令

在使用或修改任何 Wails API 前，先查阅 [Wails 3 官方文档](https://v3.wails.io/reference/overview/)；官方文档可用时不要依赖 Wails v2 API、示例或第三方 API 参考。

## 导航

- Go Wails host：`main.go`；后端能力边界：`backend/`；前端集成：`frontend/src/`。当前只保留骨架，不保留业务实现。
- `backend/library/` 拥有 Resource、Source、语义标签、Map 与其本地持久化；`backend/native/` 拥有受控的 OS 能力；`backend/remote/` 仅供 Go 发起出站 HTTP；`backend/internal/` 仅放跨后端模块复用的工具。
- 前端骨架（`frontend/src/` 的 `components/`、`pages/`、`stores/`、`composables/` 与 `router.ts`）保留其模块边界。四个业务页面（Library/Tags/Map/Settings）仍是 3 行挂载点骨架；唯一例外是 `src/pages/prototype/InterweaveShellPrototypePage.vue`（路由 `/prototype/interweave-shell`，`meta: { prototype: true }`），它是已实现内容的 prototype 页。
- 不保留泛化的 `@api/*` 或 `@bindings/*` alias；第一个公开 Service 生成后，再按实际生成路径只为 `library` 或 `native` 建立显式 alias。

## 领域与产品边界

- 产品与领域词汇（Resource、Source、首选 Source、重复策略、Source 可用状态、URL 规范化与抓取时限、语义标签与 Tagging、Map、v1 起点）的权威是 [`CONTEXT.md`](../../CONTEXT.md) 的「Interweave 产品与领域词汇」节；后端能力边界与持久化模型读 [ADR-0008](../../docs/adr/0008-interweave-backend-architecture.md)/[ADR-0009](../../docs/adr/0009-interweave-sqlite-persistence-wal.md)；已实现行为以 `backend/library/**` 及其 Go 测试为真相。纯局部实现不预读这些文档。
- 产品边界（不得顺手扩大的部分）：Interweave 引用外部内容而不接管它——不复制、移动、重命名或删除原始文件与网页，移除 Resource 只删库内记录；不做全盘扫描、自动归类、自动修复、后台可用性轮询、账户、云同步或跨设备同步；文件夹监听只限库内已登记 file source 所在目录，用于同步可用状态，不扩展为全盘或递归扫描；不做内容托管（无 Markdown/富文本工作台）、全文索引、OCR、音视频转写或 Resource 版本历史；标签只在单个 Resource 上增删，无父子、别名、全局管理面板或自动语义合并；MCP 与 Agent 写入不进入 v1。
- 公共 UI 契约仍以 `packages/web-ui` 为准。
- 不在前端复制领域规则；后续 Go 侧实现统一落在 `apps/interweave/backend/`。

## Wails Service 与 bindings allowlist

- 仅 `library` 与 `native` 可注册 Wails Service 并生成/消费 Interweave Go Service bindings；`remote` 与 `internal` 禁止注册 Wails Service，也不得被前端直接调用或消费其 bindings；Wails runtime bindings 不属于此业务 allowlist。
- `frontend/bindings/**` 为生成文件，不手工编辑。公开 Go API 变更后运行 `pnpm --filter @greypan/interweave-frontend build` 生成 bindings，并核对生成 diff 与前端类型检查。

## 修改指南

- 修改 Go/Wails API 时，先查 Wails 3 官方文档，再核对 Go 测试、frontend bindings 和消费端调用。公开 API 变更遵循上文 allowlist 与生成边界。
- 文件选择等可取消操作应明确取消语义；class-mode bindings 已将顶层 Wails slice 返回值规范化为非 nullable 数组，前端应消费生成类型而不重复添加 `?? []`；仅 DTO 中仍为可选或 nullable 的字段按其生成类型处理，且不得手改生成 bindings。
- 修改前端页面、store、组件或交互时，按 `docs/agents/browser-verification.md` 在真实 Wails/浏览器集成表面验证。
