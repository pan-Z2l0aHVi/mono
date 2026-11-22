import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext } from '@tanstack/react-router'

import { NotFound } from '@/components/not-found'
import { Root } from '@/components/root'
import { queryClient } from '@/router/query-client'

export interface RouterContext {
  queryClient?: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: ({ context }) => ({
    queryClient: context.queryClient ?? queryClient
  }),
  component: Root,
  notFoundComponent: NotFound
})
