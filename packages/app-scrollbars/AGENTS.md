# app-scrollbars

- 这是私有 workspace 包，只承载 app 级的覆盖式 scrollbar 配置；不发布、不被 `web-ui` 依赖。公共 UI 契约仍以 [`packages/web-ui`](../web-ui) 为准。
- 静止档颜色归 `@greypan/web-ui`：`.os-theme-macos` 读 `--wui-scrollbar-handle`，本包不复制同名声明。hover / active 是覆盖式 scrollbar 独有的状态，才由本包用 `--app-scrollbar-handle-*` 提供。
- 主题分档写在 `web-ui-theme[resolved-appearance]` 上；文档级 scrollbar 在 theme 元素之外，靠 `html:has()` 覆盖。改选择器或 token 名时同步 `src/__tests__/index.spec.ts`。
- 不用 `::-webkit-scrollbar`：它会放弃平台的覆盖式 scrollbar 并固定占一条布局宽度。
- 样式由入口 `import './style.css'` 带入，`vp pack` 的 `css.inject` 保留这条 import；不提供 `./style.css` subpath，也不要让 app 单独引用样式。
- 改 API 或 token 时同步 `README.md`、`README.CN.md` 与 app 侧调用点。
