import { createFileRoute } from '@tanstack/react-router'

import { changelogSummaryQuery, parseFakeFetchOptions } from '@/queries/changelog'
import { handleRouteLoadFailure } from '@/router/guards'

import { Changelog } from '../components/changelog'

export const Route = createFileRoute('/changelog')({
  staticData: { title: 'Changelog' },
  loaderDeps: ({ search }) => parseFakeFetchOptions(search as Record<string, unknown>),
  loader: async ({ context, deps, preload }) => {
    try {
      // 真 SWR：首次无缓存时阻塞跳转；已有缓存（哪怕已过 staleTime）立即返回旧缓存切页，同时后台静默 revalidate
      return await context.queryClient.ensureQueryData({
        ...changelogSummaryQuery(deps),
        revalidateIfStale: true
      })
    } catch (error) {
      if (preload) throw error
      handleRouteLoadFailure(error)
    }
  },
  component: Changelog
})
