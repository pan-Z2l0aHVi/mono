import type { FetchQueryOptions, QueryClient } from '@tanstack/vue-query'
import type { LocationQuery, Router, RouteLocationRaw } from 'vue-router'

export type RoutePrefetcher = (
  query: LocationQuery
) => Array<FetchQueryOptions<unknown, unknown, unknown, readonly unknown[]>>

// 集中式路由数据预取注册表：后续页面需要路由级预取数据时按路径登记即可。
const prefetchers: Record<string, RoutePrefetcher> = {}

function normalize(path: string) {
  return path.length > 1 ? path.replace(/\/$/, '') : path
}

/** 路由跳转前必须就绪的数据；真 SWR：首次无缓存阻塞等待，已有缓存（哪怕过期）立即切页并在后台静默 revalidate。 */
export function ensureRouteData(queryClient: QueryClient, path: string, query: LocationQuery) {
  const options = prefetchers[normalize(path)]?.(query) ?? []
  return Promise.all(options.map(item => queryClient.ensureQueryData({ ...item, revalidateIfStale: true })))
}

const intentSeen = new Set<string>()

/**
 * 意图预取（hover / focus / touchstart）：解析 matched 组件触发 chunk 下载，同时预热数据。
 * 同一个目标只做一次；任何失败静默，真正的失败由跳转时的守卫呈现。
 */
export function prefetchRouteIntent(router: Router, queryClient: QueryClient, to: RouteLocationRaw) {
  const resolved = router.resolve(to)
  if (intentSeen.has(resolved.fullPath)) return
  intentSeen.add(resolved.fullPath)

  for (const record of resolved.matched) {
    const component = record.components?.default
    if (typeof component === 'function' && !('displayName' in component) && !('__vccOpts' in component)) {
      void (component as () => Promise<unknown>)().catch(() => intentSeen.delete(resolved.fullPath))
    }
  }
  const options = prefetchers[normalize(resolved.path)]?.(resolved.query) ?? []
  for (const item of options) void queryClient.prefetchQuery(item)
}
