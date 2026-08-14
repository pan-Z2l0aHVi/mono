# Vue Web UI Demo

这是 `@greypan/web-ui` 的 Vue 集成和预览表面，不是公共组件契约的权威来源。公共属性、slot、事件和类型以 `packages/web-ui` 的源码、README、测试和相关 ADR 为准。

## 结构

- `src/app/`：应用入口和全局布局。
- `src/components/`：仅属于 demo 的组合与展示组件。
- `src/pages/`：页面级集成表面。
- `src/stores/`：demo 的 Pinia 状态。
- `src/type-fixtures/`：Vue 事件和组件类型集成样例。
- `auto-imports.d.ts`、`typed-router.d.ts`：生成类型，不手工修改。

## Agent 入口

修改 Vue 集成或交互前先读同目录 `AGENTS.md`，再按任务读取 `docs/agents/browser-verification.md` 和 `packages/web-ui/AGENTS.md`。命名 handler 的事件类型应沿用 `WebUiEvent`，不要手写 host 类型；修改公共契约时回到 `packages/web-ui` 的文档、类型和测试。
