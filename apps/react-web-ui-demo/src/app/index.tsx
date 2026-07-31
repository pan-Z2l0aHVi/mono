import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'

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
  basepath: import.meta.env.BASE_URL,
  defaultPreload: 'intent',
  scrollRestoration: true
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
  interface StaticDataRouteOption {
    icon?: string
  }
}

export default function App() {
  return (
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
}
