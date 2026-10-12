# vue-web-ui-demo

- 这是 `web-ui` 的 Vue 集成和预览表面；demo 行为不能替代公共组件契约。
- 事件 handler 优先使用推导的 `$event.target`/`currentTarget` 类型；命名 handler 使用 `WebUiEvent<WebUiXxx, 'event'>`，不手写 host 类型。
- 修改集成或交互后，在真实浏览器验证 Vue 表面。
- 示例代码与 API 表由 `docs/examples/web-ui/*.md` 与 `packages/web-ui` 组件源码生成，落点是 `src/generated/`：不得手动编辑，改 markdown 或组件属性后跑 `node scripts/generate-web-ui-examples.mjs`。
