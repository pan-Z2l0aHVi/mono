# app-scrollbars

私有 app 级覆盖式 scrollbar 配置包，与 `@greypan/web-ui` 并列且不被其依赖。

- **静止色归 `web-ui`**：`.os-theme-macos` 读 `--wui-scrollbar-handle`（不复制声明），仅 hover/active 由本包提供 `--app-scrollbar-handle-*`。
- **禁用 `::-webkit-scrollbar`**：会放弃平台覆盖式 scrollbar 并固定占布局宽度。
- 样式经主入口 `import './style.css'` 带入，不提供 `./style.css` subpath；改选择器或 token 名同步 `src/__tests__/index.spec.ts` 与 `README*.md`。
