# vue-web-ui-demo 应用指令

- 私有 Vue 3 demo，使用 Vue Router 与 Pinia；不发布 npm 包，部署到 GitHub Pages。
- 样式优先使用 Tailwind v4 工具类；仅在 Tailwind 无法表达的场景才使用 CSS 兜底。
- 事件处理优先使用推导的 `$event.target`/`currentTarget` 类型；命名 handler 用 `WebUiEvent<WebUiXxx, 'event'>` 标注，不手写 `HTMLElement & { ... }`。
- 交互与响应式行为需在真实浏览器验证（见根 `AGENTS.md`「浏览器验证」）。
- 启动：`pnpm dev:vue-web-ui-demo`。
