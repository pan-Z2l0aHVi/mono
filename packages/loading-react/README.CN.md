# @greypan/loading-react

[![npm version](https://img.shields.io/npm/v/@greypan/loading-react)](https://www.npmjs.com/package/@greypan/loading-react)
[![License: MIT](https://img.shields.io/npm/l/@greypan/loading-react)](https://www.npmjs.com/package/@greypan/loading-react)

> 面向 TanStack Router 进度与可重试 Suspense 内容边界的 React 适配器。

[English](./README.md) | 简体中文

## 安装

```bash
pnpm add @greypan/loading-react @greypan/loading-core @tanstack/react-query @tanstack/react-router react react-error-boundary
```

应用创建一个 `QueryClient`，并将内容边界放在 Provider 内：

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ContentBoundary } from '@greypan/loading-react'

const queryClient = new QueryClient()

<QueryClientProvider client={queryClient}>
  <ContentBoundary skeleton={<ArticleSkeleton />}>
    <Article />
  </ContentBoundary>
</QueryClientProvider>
```

`ContentBoundary` 必须位于 `QueryClientProvider` 内部。重试会先重置 query 错误状态，再重新渲染 Suspense 子树。

## 路由进度

router 挂载后，在根组件调用一次 `useTanStackRouterProgress()`。`onBeforeLoad` 会同步启动 `loading-core` token，早于懒加载路由可能触发的 `vite:preloadError`。

```tsx
function Root() {
  useTanStackRouterProgress()
  return <Outlet />
}
```

若使用全局进度条，在应用入口导入一次 `@greypan/loading-core/progress.css`。时间默认值由 `loading-core` 的 `GlobalProgressController` 管理。

## 导出

- `useTanStackRouterProgress()` 将 TanStack Router 导航事件接入 `globalProgress`。
- `ContentBoundary` 为 Suspense 内容提供延迟 skeleton 与可重试错误边界。
- `DelayedFallback` 立即保留 `minHeight`，并在 `delayMs` 后显示子节点。
- `ContentBoundaryProps` 与 `DelayedFallbackProps` 定义组件选项。
