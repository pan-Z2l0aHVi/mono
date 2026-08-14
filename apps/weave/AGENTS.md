# Weave 应用指令

在使用或修改任何 Wails API 前，先查阅 Wails 3 官方文档；官方文档可用时不要依赖 Wails v2 API、示例或第三方 API 参考。


## 导航

- Go host、领域服务和 MCP：`apps/weave/*.go`；前端集成：`frontend/src/`。
- 领域模型和长期边界：`docs/adr/0013-0016`；公共 UI 契约仍以 `packages/web-ui` 为准。
- 修改 Go/Wails API 时，先查 Wails 3 官方文档，再核对 Go 测试、frontend bindings 和消费端调用；`frontend/bindings/**` 为生成文件，不手工编辑。
- 修改前端 UI 或交互时，按 `docs/agents/browser-verification.md` 在真实 Wails/浏览器集成表面验证。
