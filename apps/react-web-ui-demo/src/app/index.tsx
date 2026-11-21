import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'

import { LocaleProvider } from '@/i18n/locale'
import { installRouterProgress } from '@/router/guards'
import { routeProgress } from '@/router/progress'
import { queryClient } from '@/router/query-client'
import { routeTree } from '@/routeTree.gen.ts'

// GitHub Pages 子路径 SPA
// 通过其根 404 页面在 `redirect` 中保留了未匹配的 history 路由。
// 在 TanStack 路由器读取浏览器位置之前替换。
if (import.meta.env.PROD) {
  const redirectedRoute = new URLSearchParams(window.location.search).get('redirect')
  if (redirectedRoute?.startsWith('/')) {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
    window.history.replaceState(null, '', `${basePath}${redirectedRoute}`)
  }
}

const router = createRouter({
  routeTree,
  context: { queryClient },
  basepath: import.meta.env.BASE_URL,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  // 关闭默认 1000ms 的 pending 视图切换，慢 loader 期间保持旧页面不动，由全局顶部条呈现等待。
  defaultPendingMs: Infinity,
  scrollRestoration: true
})

installRouterProgress(router, routeProgress)

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
  interface StaticDataRouteOption {
    title?: string
  }
}

export default function App() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <RouterProvider router={router} />
        </LocaleProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
