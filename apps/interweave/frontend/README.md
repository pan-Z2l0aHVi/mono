# Interweave Frontend

这是 `@greypan/interweave` 的 Vue WebView 集成表面，属于 private workspace；它验证共享 package 在 Wails 桌面应用中的实际消费方式，不是公共组件契约的权威来源。

## 结构

- `src/components/`：通用应用壳；当前仅保留无业务内容的 `AppLayout`。
- `src/pages/`：资源库、标签、Map 和设置的页面挂载点；当前均无内容实现。
- `src/stores/`：Pinia 注入和未来领域状态的统一入口；当前不保存业务状态。
- `src/router.ts`：前端路由骨架。
- `src/assets/`：前端全局基础样式。
- `bindings/`：Wails 生成的 TypeScript bindings，不手工修改；应用只消费 `backend/library` 与 `backend/native` 暴露的 Interweave Go Service bindings，Wails runtime bindings 不受此业务边界限制。

## Agent 入口

修改前端集成或交互前先读同目录 `AGENTS.md`、`apps/interweave/AGENTS.md` 和 `docs/agents/browser-verification.md`。修改公共 Web UI 时回到 `packages/web-ui` 的 README、类型、测试和相关 ADR；修改 Wails API 时先查 Wails 3 官方文档，并同时核对 Go host、生成 bindings 和消费端。
