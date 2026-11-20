# loading-react

- 本包只消费应用创建并经 `QueryClientProvider` 注入的 `QueryClient`，不创建 `QueryClient`。
- `ContentBoundary` 必须放在 `QueryClientProvider` 之内。它依赖 `QueryErrorResetBoundary` 提供的 `reset` 清除 query 错误缓存；脱离 provider 时重试语义失效。
- `useTanStackRouterProgress` 在 router 挂载后调用一次，放在根组件。`onBeforeLoad` 同步启动 token 是进度条早于 `vite:preloadError` 的唯一保证，不要改为异步或延迟到 `useEffect`。
- delay、pending 等时间常量以 `loading-core` 的 `GlobalProgressController` 默认值为准，本包不复制这些默认值。

## 词汇

**内容边界（content boundary）**：由 `ContentBoundary` 持有的 Suspense 与错误恢复边界；重试通过 `QueryErrorResetBoundary` 清理 query 错误状态。
_Avoid_: 查询容器、数据卡片

**延迟骨架（delayed fallback）**：`DelayedFallback` 在延迟窗口内只保留 `minHeight` 占位，窗口结束后才显示 skeleton。
_Avoid_: 延迟加载器、骨架屏容器

**导航 token**：由 `loading-core` 的 `globalProgress.begin()` 创建、由路由生命周期结束的 `ProgressToken`；本包不拥有独立进度状态机。
_Avoid_: 路由锁、进度实例
