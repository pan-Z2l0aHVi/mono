# vue-web-ui-demo

- 这是 `web-ui` 的 Vue 集成和预览表面；demo 行为不能替代公共组件契约。
- 事件 handler 优先使用推导的 `$event.target`/`currentTarget` 类型；命名 handler 使用 `WebUiEvent<WebUiXxx, 'event'>`，不手写 host 类型。
- 修改集成或交互后，在真实浏览器验证 Vue 表面。
- 示例代码与 API 表由 `packages/web-ui/docs/*.md` 生成到 `src/generated/`：不得手改；改完 markdown 由 `vite.config.ts` 挂的 `mdToMeta` 在 dev 与 build 重新生成。API 表字段手写在语料里，组件源码不参与生成——改了组件属性要人一起改表，没有脚本提醒。壳文案的 wuchale 提取必须排除这些生成物。本端 `exec: ['vue']`，只有 `.vue` 围栏落成可执行 SFC；围栏字节、落盘文件与页面 `<pre>` 必须一致。产物命名、布局与清单见 [`docs/agents/generated-artifacts.md`](../../docs/agents/generated-artifacts.md)。
- shell 状态（主题 / 动效 / 侧栏 collapsed / open / 宽度的持久化、校验、`sidebar-*-change` 事件过滤与 mobile 派生）由 `@greypan/doc-demo-kit` 的 `createShellState` 拥有，应用壳只做快照绑定与渲染；不得自建并行的持久化或事件过滤逻辑，断点判定例外（`useMobile` 留在 app，ADR-0023）。
- 路由层：非首屏页面懒加载（`vite.config.ts` 的 `importMode` 只让 `pages/home` 同步，首屏是 `/` 重定向到的 `/home`，不是 `index`）；跳转延迟到目标 chunk 与路由数据都就绪后才提交，由 `src/router/guards.ts` 的全局守卫统一覆盖 `RouterLink`、`router.push/replace` 与 popstate。进度状态机在 `@greypan/route-progress`，顶部条是 `src/app/route-progress-bar.vue`；失败文案与 toast 留在该 `.vue` 里，才会被 wuchale 抽取。
- 路由数据依赖登记在 `src/router/prefetch.ts` 的注册表（不用 `definePage` 宏引用外部 `queryOptions`）。`cancelled`（被新导航抢占）与 `duplicated` 不报失败；不在 `beforeResolve` 内直接收口，统一在 `afterEach` / `onError`。导航侧链接用 `AppRouterLink`，它在 hover / focus / touchstart 时做意图预取，不触发顶部进度。
- 页面级不用 `<Suspense>`；页面内次要数据用 vue-query 的 `isPending` 骨架态。模拟请求可用 `?delay=<ms>`、`?fail=1` 调节（见 `src/queries/changelog.ts`）。
