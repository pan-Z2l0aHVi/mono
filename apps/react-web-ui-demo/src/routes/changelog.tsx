import { createFileRoute } from '@tanstack/react-router'

import { changelogSummaryQuery, parseFakeFetchOptions } from '@/queries/changelog'
import { handleRouteLoadFailure } from '@/router/guards'

import { Changelog } from '../components/changelog'

export const Route = createFileRoute('/changelog')({
  staticData: { title: 'Changelog' },
  loaderDeps: ({ search }) => parseFakeFetchOptions(search as Record<string, unknown>),
  loader: async ({ context, deps, preload }) => {
    try {
      return await context.queryClient.ensureQueryData(changelogSummaryQuery(deps))
    } catch (error) {
      if (preload) throw error
      handleRouteLoadFailure(error)
    }
  },
  component: Changelog
})
