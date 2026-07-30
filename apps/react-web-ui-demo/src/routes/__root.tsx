import { createRootRoute } from '@tanstack/react-router'

import { NotFound } from '@/components/not-found'
import { Root } from '@/components/root'

export const Route = createRootRoute({
  component: Root,
  notFoundComponent: NotFound
})
