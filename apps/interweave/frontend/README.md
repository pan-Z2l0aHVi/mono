# Interweave Frontend

这是 `@greypan/interweave` 的 Vue WebView 界面，负责把共享 package 接入 Wails 桌面应用。它是 private workspace，不是公共组件契约的权威来源。

页面、路由、状态和服务边界以本目录源码、`vite.config.ts` 和 [`apps/interweave/AGENTS.md`](../AGENTS.md) 为准。业务数据来自桌面 Wails API；浏览器只用于样式调试。

## 运行

从仓库根目录启动 Wails host，同时构建并监听 WebView 的 workspace 依赖：

```bash
pnpm dev:interweave
```

本目录不是独立的 npm、Yarn 或 Bun 项目。依赖安装、workspace 构建和发布都由根 pnpm 与 Turborepo 负责。完整命令与产物说明见 [`apps/interweave/README.md`](../README.md)。

## 开发须知

修改前端交互前，先读 [`apps/interweave/AGENTS.md`](../AGENTS.md)。修改公共 Web UI 时，以 `packages/web-ui` 的 README、类型和测试为准。修改 Wails API 时，先查 Wails 3 官方文档，并同时核对 Go host、生成的 bindings 和前端调用。
