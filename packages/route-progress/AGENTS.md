# route-progress

`@greypan/route-progress` 是 react/vue web-ui demo 共享的、框架无关的路由跳转进度与通用延迟显隐状态机；私有包，不发布。

- 只放状态机与时序：不依赖 DOM、React、Vue、router。各 app 自己接路由事件或局部异步状态，并用 `subscribe` / `getSnapshot` 把快照绑到 `web-ui-progress` 或局部骨架屏。
- 组织方式是 `@greypan/js-kit` 的 `definePlugin` 组合：
  - 全局路由进度：`defineRouteClock` → `defineRouteTrickle`（非匀速先快后慢渐近线，止于 90%）→ `defineRouteProgressCore`（默认 `showDelay: 250`、`minVisible: 300`、`completeHold: 220`），`createRouteProgressStarter` 是预组装入口。
  - 局部延迟显隐：`defineRouteClock` → `defineDelayedVisibility`（默认 `showDelay: 250`、`minVisible: 300`），`createDelayedVisibility` 供局部 loading / 异步渲染组件 / 骨架屏复用同一套 250ms 防闪烁契约。
- 时间只经注入的 `clock` 读取，测试用 fake timers 或自定义 clock，不直接依赖真实等待。
- `getSnapshot()` 必须返回稳定引用，仅在状态变更时替换（`useSyncExternalStore` 依赖这一点）；改状态转换前先看 `src/__tests__` 里的时序契约（250ms 显示门槛、300ms 最短停留、220ms 100% 冲刺保底停留、停留期重入、`fail` 复位、`navId` 失效）。
- 导航或任务标识 `navId` / `taskId` 由调用方生成并保证递增或唯一；新 `start` 会使旧任务的 `done` / `fail` 失效。
- 测试放 `src/__tests__/*.spec.ts`，用包自己的 `vp test run`。
