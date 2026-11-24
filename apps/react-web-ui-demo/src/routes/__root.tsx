import { routeExampleDocs } from '@greypan/doc-demo-kit'
import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext } from '@tanstack/react-router'

import { NotFound } from '@/components/not-found'
import { Root } from '@/components/root'
import { ensureExampleDocs } from '@/i18n/locale'
import { handleRouteLoadFailure } from '@/router/guards'
import { queryClient } from '@/router/query-client'

export interface RouterContext {
  queryClient?: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context, location, preload }) => {
    const docs = routeExampleDocs(location.pathname)
    if (docs.length > 0) {
      try {
        await ensureExampleDocs(docs)
      } catch (error) {
        if (preload) throw error
        handleRouteLoadFailure(error)
      }
    }
    return {
      queryClient: context.queryClient ?? queryClient
    }
  },
  component: Root,
  notFoundComponent: NotFound
})
