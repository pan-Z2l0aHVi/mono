# @greypan/route-progress

> 框架无关的路由跳转进度与通用延迟显隐状态机，供 workspace 内的 React 与 Vue 应用适配。

这是私有 workspace 包，不发布到 npm；在 workspace 应用中通过 `workspace:*` 协议引入。本包不依赖 DOM、React、Vue 或任何路由库，各应用通过 `subscribe` 与 `getSnapshot` 把状态快照绑定到顶部进度条或局部 loading / 骨架屏。

## 快速开始

### 全局路由进度

```ts
import { createRouteProgressStarter } from '@greypan/route-progress'

const progress = createRouteProgressStarter()
const unsubscribe = progress.subscribe(() => {
  const snapshot = progress.getSnapshot()
  // snapshot.visible / snapshot.value / snapshot.phase
})

progress.start(1)
progress.done(1)
unsubscribe()
```

### 局部延迟显隐

```ts
import { createDelayedVisibility } from '@greypan/route-progress'

const visibility = createDelayedVisibility()
visibility.start(1) // 250ms 后变为可见，显示后至少停留 300ms
visibility.done(1)
```

## 组合插件与默认时序

本包基于 `@greypan/js-kit` 的 `definePlugin` 组织，可直接使用预组装工厂，也可按需组合底层插件：

- **全局路由进度**：`defineRouteClock` → `defineRouteTrickle`（先快后慢渐近线，止于 90%）→ `defineRouteProgressCore`（默认 `showDelay: 250`、`minVisible: 300`、`completeHold: 220`），预组装入口为 `createRouteProgressStarter(options?)`。
- **局部延迟显隐**：`defineRouteClock` → `defineDelayedVisibility`（默认 `showDelay: 250`、`minVisible: 300`），预组装入口为 `createDelayedVisibility(options?)`。

`getSnapshot()` 返回稳定引用，仅在状态变化时替换，可直接配合 React `useSyncExternalStore` 或 Vue 响应式状态使用。新的 `start(id)` 会使旧任务的 `done` / `fail` 自动失效。

## 验证

```bash
pnpm --filter @greypan/route-progress build
pnpm --filter @greypan/route-progress test
```
