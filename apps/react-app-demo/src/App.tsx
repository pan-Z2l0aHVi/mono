import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'

import { routeTree } from './routeTree.gen.ts'

const router = createRouter({
  routeTree,
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
