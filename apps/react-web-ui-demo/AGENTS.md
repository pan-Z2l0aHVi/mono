# react-web-ui-demo 应用指令

- 私有 React 19 demo，使用 TanStack Router 与 Zustand；不发布 npm 包，部署到 GitHub Pages。
- 样式优先使用 Tailwind v4 工具类；仅在 Tailwind 无法表达的场景才使用 CSS 兜底。
- 路由树 `routeTree.gen.ts` 为自动生成文件，不应手动编辑。
- 交互与响应式行为需在真实浏览器验证（见根 `AGENTS.md`「浏览器验证」）。
- 启动：`pnpm dev:react-web-ui-demo`。
