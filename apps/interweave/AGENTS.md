# Interweave 应用指令

在使用或修改任何 Wails API 前，先查阅 Wails 3 官方文档；官方文档可用时不要依赖 Wails v2 API、示例或第三方 API 参考。

## 导航

- Go Wails host：`main.go`；后端能力边界：`backend/`；前端集成：`frontend/src/`。当前只保留骨架，不保留业务实现。
- `backend/library/` 拥有 Resource、Source、语义标签、Map 与其本地持久化；`backend/native/` 拥有受控的 OS 能力；`backend/remote/` 仅供 Go 发起出站 HTTP；`backend/internal/` 仅放跨后端模块复用的工具。
- 仅 `library` 与 `native` 可注册 Wails Service 并生成 Interweave Go Service bindings。`remote` 与 `internal` 禁止注册 Wails Service 或被前端直接调用；Wails runtime bindings 不属于此业务 allowlist。
- 产品、Resource/Source、语义标签、Map、MCP 或后端能力边界：先按需读取 `docs/product.md` 与 ADR-0017/0018/0019；纯局部实现不预读完整产品文档。
- 公共 UI 契约仍以 `packages/web-ui` 为准。
- 修改 Go/Wails API 时，先查 Wails 3 官方文档，再核对 Go 测试、frontend bindings 和消费端调用；`frontend/bindings/**` 为生成文件，不手工编辑。公开 API 变更后运行 `pnpm --filter @greypan/interweave-frontend build` 生成 bindings，并核对生成 diff 与前端类型检查。
- Wails 对外集合契约：查询或列表 API 的空结果必须从 Go 返回非 nil 的零长度 slice，使 transport 编码为 `[]`；不要把 `null` 扩散到 Pinia store 后逐处写 `?? []`，也不要手改生成 bindings。文件选择等可取消操作应明确取消语义；若前端不区分取消与空选择，也必须在 Go 边界规范为 `[]`，并用 Go 测试覆盖空集合编码。
- 修改前端 UI 或交互时，按 `docs/agents/browser-verification.md` 在真实 Wails/浏览器集成表面验证。
