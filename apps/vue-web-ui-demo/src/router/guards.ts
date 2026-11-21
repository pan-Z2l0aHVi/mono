import type { QueryClient } from '@tanstack/vue-query'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'
import type { RouteLocationNormalized, Router } from 'vue-router'

import { ensureRouteData } from './prefetch'
import { reportRouteFailure } from './progress'
import type { routeProgress } from './progress'

type Progress = typeof routeProgress

/**
 * 延迟跳转 + 进度收口。全局守卫同时覆盖 RouterLink、router.push/replace 与 popstate：
 * - beforeEach：开始计时；
 * - beforeResolve：此时目标页 chunk 已就绪，再等路由数据，失败则取消导航（留在当前页）；
 * - afterEach / onError：唯一的收口点。
 */
export function installRouteGuards(router: Router, queryClient: QueryClient, progress: Progress) {
  const navIds = new WeakMap<RouteLocationNormalized, number>()
  const prefetchErrors = new WeakMap<RouteLocationNormalized, unknown>()
  const settled = new Set<number>()
  let latestId = 0

  function settle(id: number | undefined, run: (id: number) => void) {
    if (id === undefined || id !== latestId || settled.has(id)) return
    settled.add(id)
    // 只需要去重最近几次；旧 id 本来就会被 latestId 判掉。
    if (settled.size > 32) settled.delete(settled.values().next().value as number)
    run(id)
  }

  router.beforeEach(to => {
    const id = ++latestId
    navIds.set(to, id)
    progress.start(id)
  })

  router.beforeResolve(async to => {
    try {
      await ensureRouteData(queryClient, to.path, to.query)
    } catch (error) {
      prefetchErrors.set(to, error)
      return false
    }
  })

  router.afterEach((to, _from, failure) => {
    // cancelled：被新导航抢占，新 navId 已接管；duplicated：没有走 beforeEach。
    if (isNavigationFailure(failure, NavigationFailureType.cancelled | NavigationFailureType.duplicated)) return
    settle(navIds.get(to), id => {
      if (!failure) {
        progress.done(id)
        return
      }
      const error = prefetchErrors.get(to) ?? failure
      progress.fail(id, error)
      reportRouteFailure(error)
    })
  })

  router.onError((error, to) => {
    settle(navIds.get(to), id => {
      progress.fail(id, error)
      reportRouteFailure(error)
    })
  })
}
