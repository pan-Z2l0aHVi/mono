# react-web-ui-demo 应用指令

- 这是 `web-ui` 的 React 集成和预览表面；demo 行为不能替代公共组件契约。
- 修改集成或交互后，在真实浏览器验证 React 表面。
- 新增或修改 `src/routes/**` 时，以该目录和 `vite.config.ts` 为 source of truth；运行 `pnpm --filter @greypan/react-web-ui-demo build` 让 TanStack Router 更新 `src/routeTree.gen.ts`，随后核对生成 diff。不得手动编辑路由树。
