# @greypan/loading-react

[![npm version](https://img.shields.io/npm/v/@greypan/loading-react)](https://www.npmjs.com/package/@greypan/loading-react)
[![License: MIT](https://img.shields.io/npm/l/@greypan/loading-react)](https://www.npmjs.com/package/@greypan/loading-react)

> React adapters for TanStack Router progress and retryable Suspense content boundaries.

English | [简体中文](./README.CN.md)

## Install

```bash
pnpm add @greypan/loading-react @greypan/loading-core @tanstack/react-query @tanstack/react-router react react-error-boundary
```

The application creates one `QueryClient` and provides it above the content boundary:

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

`ContentBoundary` must be inside `QueryClientProvider`. Its retry resets the query error state before rendering the suspended subtree again.

## Router progress

Call `useTanStackRouterProgress()` once in the root component after the router is mounted. `onBeforeLoad` starts the `loading-core` token synchronously, before lazy route loading can dispatch `vite:preloadError`.

```tsx
function Root() {
  useTanStackRouterProgress()
  return <Outlet />
}
```

Import `@greypan/loading-core/progress.css` once in the application entry if the global progress bar is used. Timing defaults belong to `GlobalProgressController` in `loading-core`.

## Exports

- `useTanStackRouterProgress()` wires TanStack Router navigation events to `globalProgress`.
- `ContentBoundary` renders a delayed skeleton and retryable error boundary for Suspense content.
- `DelayedFallback` reserves `minHeight` immediately and reveals its children after `delayMs`.
- `ContentBoundaryProps` and `DelayedFallbackProps` describe component options.
