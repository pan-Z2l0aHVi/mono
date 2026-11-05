# React Web UI Demo

这是 `@greypan/web-ui` 的 React 集成和预览应用。它展示组件在真实 React 应用中的用法，并提供可交互预览。

公共属性、slot、事件和类型以 [`packages/web-ui`](../../packages/web-ui) 的源码、README 和测试为准，demo 行为不替代公共契约。

## 运行

在仓库根目录启动该 demo 及其 workspace 依赖：

```bash
pnpm dev:react-web-ui-demo
```

不要只运行包内 `pnpm dev` 来验证跨包集成，它不会构建和监听本地依赖包。环境准备见 [`CONTRIBUTING.md`](../../CONTRIBUTING.md)。

## 开发须知

- 示例代码与 API 表由 `packages/web-ui/docs/*.md` 生成到 `src/generated/`，不要手改。改完 markdown 后，dev 或 build 会自动重新生成。
- 路由以 `src/routes/**` 和 `vite.config.ts` 为准，不要手改 `src/routeTree.gen.ts`。
- 界面文案在源码中写中文，译文在 `src/locales/<locale>.po`。增删文案后在应用目录运行 `pnpm exec wuchale --clean`。

更多说明见同目录 [`AGENTS.md`](./AGENTS.md)。
