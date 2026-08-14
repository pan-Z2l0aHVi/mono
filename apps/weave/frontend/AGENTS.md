# weave-frontend 应用指令

- 这是 `apps/weave` 的 Vue WebView 集成表面；公共组件契约以 `packages/web-ui` 为准。
- Wails 绑定位于 `../frontend/bindings/**`，由 Wails 生成，不手工编辑；修改 Go API 后先重新生成并核对消费端类型。
- 修改前端页面、store、组件或交互后，按 `docs/agents/browser-verification.md` 在真实浏览器或 Wails 集成表面验证。
- 领域状态和 MCP 行为分别回到 `apps/weave/*.go` 与 ADR-0013 至 ADR-0016，不在前端复制领域规则。
