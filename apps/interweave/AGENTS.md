# Interweave 应用指令

在使用或修改任何 Wails API 前，先查阅 Wails 3 官方文档；官方文档可用时不要依赖 Wails v2 API、示例或第三方 API 参考。

## 导航

- Go host、领域服务和 MCP：`apps/interweave/*.go`；前端集成：`frontend/src/`。
- 产品、Resource/Source、语义标签、Map 或 MCP 路线：先按需读取 `docs/product.md` 与 ADR-0017/0018；纯局部实现不预读完整产品文档。
- 公共 UI 契约仍以 `packages/web-ui` 为准。
- 修改 Go/Wails API 时，先查 Wails 3 官方文档，再核对 Go 测试、frontend bindings 和消费端调用；`frontend/bindings/**` 为生成文件，不手工编辑。公开 API 变更后运行 `pnpm --filter @greypan/interweave-frontend build` 生成 bindings，并核对生成 diff 与前端类型检查。
- 文件选择等可取消操作应明确取消语义；class-mode bindings 已将顶层 Wails slice 返回值规范化为非 nullable 数组，前端应消费生成类型而不重复添加 `?? []`；仅 DTO 中仍为可选或 nullable 的字段按其生成类型处理，且不得手改生成 bindings。
- 修改前端 UI 或交互时，按 `docs/agents/browser-verification.md` 在真实 Wails/浏览器集成表面验证。
