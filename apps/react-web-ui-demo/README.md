# React Web UI Demo

这是 `@greypan/web-ui` 的 React 集成和预览表面，不是公共组件契约的权威来源。公共属性、slot、事件和类型以 `packages/web-ui` 的源码、README、测试和相关 ADR 为准。

## 结构

- `src/routes/`：TanStack Router 页面入口；`routeTree.gen.ts` 是由这些页面派生的路由注册表，生命周期见同目录 `AGENTS.md` 和 [`docs/agents/build.md`](../../docs/agents/build.md)。
- `src/components/`：仅属于 demo 的组合与展示组件。
- `src/type-fixtures/`：React 事件和组件类型集成样例。
- `src/assets/global.css`：应用级样式；组件内部样式仍属于 `web-ui` Shadow DOM。

## Agent 入口

修改 React 集成或交互前先读同目录 `AGENTS.md`，再按任务读取根 `.agents/rules/react.md`、`docs/agents/browser-verification.md` 和 `packages/web-ui/AGENTS.md`。修改组件公共契约时还要回到 `packages/web-ui` 的文档、类型和测试。
