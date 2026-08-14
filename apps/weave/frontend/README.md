# Weave Frontend

这是 `@greypan/weave` 的 Vue WebView 集成表面，属于 private workspace；它验证共享 package 在 Wails 桌面应用中的实际消费方式，不是公共组件契约的权威来源。

## 结构

- `src/pages/`：页面级工作流，包括 library、tags、repair 和 settings。
- `src/components/`：Weave 前端展示和布局组件。
- `src/stores/`：Pinia 状态，领域事实和 Wails API 位于 Go host。
- `src/router.ts`：前端路由。
- `bindings/`：Wails 生成的 TypeScript bindings，不手工修改。

## Agent 入口

修改前端集成或交互前先读同目录 `AGENTS.md`、`apps/weave/AGENTS.md` 和 `docs/agents/browser-verification.md`。修改公共 Web UI 时回到 `packages/web-ui` 的 README、类型、测试和相关 ADR；修改 Wails API 时先查 Wails 3 官方文档，并同时核对 Go host、生成 bindings 和消费端。
