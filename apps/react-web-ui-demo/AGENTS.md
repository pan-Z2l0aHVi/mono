# react-web-ui-demo

- `web-ui` 的 React 集成预览站；demo 行为不替代公共组件契约，改动集成或交互后须在真实浏览器验证。
- **插件顺序硬边界**：`unpluginWebComponents` 必须排在 `react()` 之前，否则自定义元素导入注入失效。
- **生成物禁手改**：`src/routeTree.gen.ts` 与 `src/generated/**` 由 Vite 插件自动生成（见 [`generated-artifacts.md`](../../docs/agents/generated-artifacts.md)）；本端 `exec: ['tsx']`，改组件 API 须同步修改 `packages/web-ui/docs/*.md`。
- **壳文案（wuchale）**：源码只写中文，`src/locales/*.po` 为入库译文源；增删壳文案后在本目录跑 `pnpm exec wuchale --clean`（dev/build 只编译不抽取，见 [`build.md`](../../docs/agents/build.md)）。
- **Shell 状态归属**：主题/动效/侧栏状态由 `@greypan/doc-demo-kit` 的 `createShellState` 拥有，`Root` 不自建并行持久化或事件过滤（断点判定 `useMobile` 留本 app，见 [ADR-0023](../../docs/adr/0023-layout-controlled-mobile.md)）。
- **路由与加载**：仅 `/home/` 同步加载，其余路由懒加载并由 `ensureQueryData({ revalidateIfStale: true })` 做真 SWR（不引入第三方 KeepAlive）；页面级不用 `<Suspense>`，局部 loading 统一走 `useDelayedLoading`。
