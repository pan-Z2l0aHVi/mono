# Interweave Frontend

这是 `@greypan/interweave` 的 Vue WebView 集成表面，属于 private workspace；它验证共享 package 在 Wails 桌面应用中的实际消费方式，不是公共组件契约的权威来源。

页面、路由、状态、服务边界与生成的 bindings 会随应用迭代调整，以本目录源码、`vite.config.ts` 和 [`apps/interweave/AGENTS.md`](../AGENTS.md) 为准，不在 README 中逐项列举。前端只使用桌面 Wails API 作为业务数据源；普通浏览器仅用于样式调试，不提供 fixture、demo 或 mock 数据。

## 运行

从仓库根目录启动 Wails host，并同时构建、监听 WebView 的 workspace 依赖：

```bash
pnpm dev:interweave
```

本目录不是独立的 npm、Yarn 或 Bun 项目，依赖安装、workspace 构建与发布编排都由根 pnpm 和 Turborepo 负责。完整命令与产物说明见 [`apps/interweave/README.md`](../README.md)。

## Agent 入口

修改前端集成或交互前先读 [`apps/interweave/AGENTS.md`](../AGENTS.md) 和 [`docs/agents/runtime-verification.md`](../../../docs/agents/runtime-verification.md)。修改公共 Web UI 时回到 `packages/web-ui` 的 README、类型、测试和相关 ADR；修改 Wails API 时先查 Wails 3 官方文档，并同时核对 Go host、生成 bindings 和消费端。
