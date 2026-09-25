# Interweave Frontend

这是 `@greypan/interweave` 的 Vue WebView 集成表面，属于 private workspace；它验证共享 package 在 Wails 桌面应用中的实际消费方式，不是公共组件契约的权威来源。

## 结构

- `src/components/`：应用壳与资源库组件。
- `src/pages/`：资源库、标签、Map、设置页面，以及路由 `/prototype/interweave-shell` 的独立 prototype 页。
- `src/composables/`：历史导航与资源库运行时组合式函数。
- `src/services/library/`：资源库 Wails API adapter；普通浏览器没有 Wails bridge，因此不加载业务数据。
- `src/stores/`：Pinia 注入与资源库展示状态。
- `src/router.ts`：前端路由。
- `src/assets/`：前端全局基础样式。
- `bindings/`：Wails 生成的 TypeScript bindings，不手工修改；应用只消费 `backend/library` 与 `backend/native` 暴露的 Interweave Go Service bindings，Wails runtime bindings 不受此业务边界限制。

## 运行时边界

Interweave 前端只使用桌面 Wails API 作为业务数据源。普通浏览器仅用于样式调试，`/#/library` 在没有 Wails bridge 时显示空态，不提供 fixture、demo 或 mock 数据。prototype 页使用自身声明的本地数据，与生产运行时无关。

## Agent 入口

修改前端集成或交互前先读同目录 `AGENTS.md`、`apps/interweave/AGENTS.md` 和 `docs/agents/browser-verification.md`。修改公共 Web UI 时回到 `packages/web-ui` 的 README、类型、测试和相关 ADR；修改 Wails API 时先查 Wails 3 官方文档，并同时核对 Go host、生成 bindings 和消费端。
