# vue-web-ui-demo

- `web-ui` 的 Vue 集成预览站；demo 行为不替代公共组件契约，改动集成或交互后须在真实浏览器验证。
- **事件类型**：优先使用推导的 `$event.target`/`currentTarget`；命名 handler 使用 `WebUiEvent<WebUiXxx, 'event'>`，不手写 host 类型。
- **生成物禁手改**：`typed-router.d.ts`、`auto-imports.d.ts` 与 `src/generated/**` 由 Vite 插件自动生成（见 [`generated-artifacts.md`](../../docs/agents/generated-artifacts.md)）；本端 `exec: ['vue']`，wuchale 提取必须排除 `src/generated/**`，增删壳文案后跑 `pnpm exec wuchale --clean`。
- **Shell 状态归属**：主题/动效/侧栏状态由 `@greypan/doc-demo-kit` 的 `createShellState` 拥有，不自建并行持久化或事件过滤（断点判定 `useMobile` 留本 app，见 [ADR-0023](../../docs/adr/0023-layout-controlled-mobile.md)）。
- **路由与预取**：`vite.config.ts` 的 `importMode` 只让 `pages/home` 同步（首屏 `/` 重定向到 `/home`）；数据依赖登记在 `src/router/prefetch.ts`（不用 `definePage` 引用外部 `queryOptions`），预取用 `revalidateIfStale: true`；不在 `beforeResolve` 收口，统一在 `afterEach`/`onError` 且忽略 `cancelled`/`duplicated`；失败 toast 文案留在 `route-progress-bar.vue` 供 wuchale 抽取；页面级不用 `<Suspense>`，局部 loading 走 `useDelayedLoading`。
