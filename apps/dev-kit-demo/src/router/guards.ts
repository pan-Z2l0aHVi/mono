import { isNavigationFailure, NavigationFailureType } from 'vue-router'
import type { RouteLocationNormalized, Router } from 'vue-router'

import { ensureRouteData } from './prefetch'
import type { routeProgress } from './progress'

type Progress = typeof routeProgress

export function installRouteGuards(router: Router, progress: Progress) {
  const navIds = new WeakMap<RouteLocationNormalized, number>()
  const prefetchErrors = new WeakMap<RouteLocationNormalized, unknown>()
  const settled = new Set<number>()
  let latestId = 0

  function settle(id: number | undefined, run: (id: number) => void) {
    if (id === undefined || id !== latestId || settled.has(id)) return
    settled.add(id)
    if (settled.size > 32) settled.delete(settled.values().next().value as number)
    run(id)
  }

  router.beforeEach((to, from) => {
    if (to.path === from.path && to.fullPath.split('#')[0] === from.fullPath.split('#')[0]) return
    const id = ++latestId
    navIds.set(to, id)
    progress.start(id)
  })

  router.beforeResolve(async (to, from) => {
    if (to.path === from.path && to.fullPath.split('#')[0] === from.fullPath.split('#')[0]) return
    try {
      await ensureRouteData(to.path)
    } catch (error) {
      prefetchErrors.set(to, error)
      return false
    }
  })

  router.afterEach((to, _from, failure) => {
    if (isNavigationFailure(failure, NavigationFailureType.cancelled | NavigationFailureType.duplicated)) return
    settle(navIds.get(to), id => {
      if (!failure) {
        progress.done(id)
        return
      }
      const error = prefetchErrors.get(to) ?? failure
      progress.fail(id, error)
    })
  })

  router.onError((error, to) => {
    settle(navIds.get(to), id => {
      progress.fail(id, error)
    })
  })
}
