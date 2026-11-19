# app-scrollbars

- 这是私有 workspace 包，只承载 app 级的覆盖式 scrollbar 配置；不发布、不被 `web-ui` 依赖。公共 UI 契约仍以 [`packages/web-ui`](../web-ui) 为准。
- 静止档颜色归 `@greypan/web-ui`：`.os-theme-macos` 读 `--wui-scrollbar-handle`，本包不复制同名声明。hover / active 是覆盖式 scrollbar 独有的状态，才由本包用 `--app-scrollbar-handle-*` 提供。
- 选择器与分档结构以 `src/style.css` 为准；改选择器或 token 名时同步 `src/__tests__/index.spec.ts`。
- 不用 `::-webkit-scrollbar`：它会放弃平台的覆盖式 scrollbar 并固定占一条布局宽度。
- 样式经入口 `import './style.css'` 带入；不提供 `./style.css` subpath，app 不得单独引用样式。打包行为以 `vite.config.ts` 为准。
- 改 API 或 token 时同步 `README.md`、`README.CN.md` 与 app 侧调用点。
- 单测读 web-ui 的 theme `style.css` 校验静止档回退值；该文件列入 `turbo.json` 的 test inputs，改 web-ui token 会重跑本包测试。
