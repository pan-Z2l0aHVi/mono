# dev-kit-demo

- 这是 `@greypan/js-kit` 与 `@greypan/browser-kit` 的合并文档与交互示例站，技术栈复用 `apps/vue-web-ui-demo`（不含未使用的 `pinia` 与 `@tanstack/vue-query`）。
- 文档语料来自 `packages/js-kit/docs/*.md(.CN.md)` 与 `packages/browser-kit/docs/*.md(.CN.md)`，由 `@greypan/md-to-meta` 生成到 `src/generated/`（`exec: []`，仅含纯 `ts` / `js` 围栏）。
- 定制交互面板通过 `src/demos/registry.ts` 按 `${pkg}/${module}#${demoId}` 挂载，示例标识来自围栏 `meta`（如 `demo=parse-url`），不得按标题序号或数组下标绑定。
- 站内文档键统一带包命名空间（`js-kit/<module>`、`browser-kit/<module>`、`js-kit/CHANGELOG`、`browser-kit/CHANGELOG`），避免同名模块碰撞。
- `history-nav` 沙盒位于独立纯 TS Vite 多页入口 `sandbox/history-nav.html`（由 `tsconfig.sandbox.json` 校验，排除出 `wuchale` 与 `unplugin-auto-import`）。
