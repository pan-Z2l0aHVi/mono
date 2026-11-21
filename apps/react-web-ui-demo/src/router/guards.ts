import type { AnyRouter } from '@tanstack/react-router'

import { reportRouteFailure } from './progress'
import type { routeProgress } from './progress'

type Progress = typeof routeProgress

export interface RouteAbortError extends Error {
  readonly __routeAbort: true
  readonly cause: unknown
}

export function createRouteAbortError(cause: unknown): RouteAbortError {
  const error = new Error(cause instanceof Error ? cause.message : 'route load failed') as RouteAbortError
  Object.defineProperty(error, '__routeAbort', { value: true, enumerable: false })
  Object.defineProperty(error, 'cause', { value: cause, enumerable: false })
  return error
}

export function isRouteAbortError(error: unknown): error is RouteAbortError {
  return typeof error === 'object' && error !== null && '__routeAbort' in error
}

/**
 * 延迟跳转 + 进度收口（事件收口路径）：
 * - `onBeforeLoad`：仅在 `pathChanged || (hrefChanged && !hashChanged)` 时启动新 `navId`；
 *   `preloadRoute` 不 emit 该事件，因此 hover 意图预取不会触发顶部进度；
 *   `/` -> `/home` 重定向或快速连点连续触发 `onBeforeLoad` 时，新 `start` 自动覆盖旧 `navId`。
 * - 路由 `beforeLoad`/`loader` 失败时，若存在已就绪的旧位置（`resolvedLocation`），
 *   通过 `noteRouteLoadError` 记录并回退到原位置（留在当前页），由本收口器统一触发 `progress.fail` + `reportRouteFailure`。
 * - `onResolved`：检查 `matches` 是否存在 `status === 'error'` 区分 `done` 与 `fail`。
 */
const routerAbortState = new WeakMap<
  AnyRouter,
  {
    latestId: number
    settled: Set<number>
    revertingHref?: string
    settleFail: (error: unknown) => void
  }
>()

let activeRouter: AnyRouter | undefined

/**
 * 在路由 `beforeLoad` / `loader` 内捕获数据预取失败时调用：
 * - 若当前已有已渲染页面（`fromLocation` 存在且与目标不同），立即收口 `progress.fail` + `toast` 并回退 URL 留在当前页；
 * - 若是首屏直达（无旧页可留），继续抛出错误交由错误边界处理。
 */
export function handleRouteLoadFailure(error: unknown, router: AnyRouter | undefined = activeRouter): never {
  const state = router ? routerAbortState.get(router) : undefined
  const resolved = router?.state.resolvedLocation
  const targetHref = router?.latestLocation?.href
  if (router && state && resolved && resolved.href !== targetHref) {
    state.revertingHref = resolved.href
    state.settleFail(error)
    router.history.replace(resolved.publicHref ?? resolved.href, resolved.state)
  }
  throw createRouteAbortError(error)
}

export function installRouterProgress(router: AnyRouter, progress: Progress) {
  activeRouter = router
  let latestId = 0
  const settled = new Set<number>()

  function rememberSettled(id: number) {
    settled.add(id)
    if (settled.size > 32) settled.delete(settled.values().next().value as number)
  }

  function settleDone() {
    const id = latestId
    if (id === 0 || settled.has(id)) return
    rememberSettled(id)
    progress.done(id)
  }

  function settleFail(error: unknown) {
    const id = latestId
    if (id === 0 || settled.has(id)) return
    rememberSettled(id)
    progress.fail(id, error)
    reportRouteFailure(error)
  }

  const state = {
    get latestId() {
      return latestId
    },
    settled,
    revertingHref: undefined as string | undefined,
    settleFail
  }
  routerAbortState.set(router, state)

  const stopBeforeLoad = router.subscribe('onBeforeLoad', event => {
    const effective = event.pathChanged || (event.hrefChanged && !event.hashChanged)
    if (!effective) return
    // 失败回退触发的二次 onBeforeLoad 不重新开启进度条
    if (state.revertingHref && event.toLocation.href === state.revertingHref) {
      state.revertingHref = undefined
      return
    }
    state.revertingHref = undefined
    const id = ++latestId
    progress.start(id)
  })

  const stopResolved = router.subscribe('onResolved', () => {
    if (state.revertingHref) return
    const errored = router.state.matches.find((m: { status: string }) => m.status === 'error') as
      | { error?: unknown }
      | undefined
    if (errored) {
      settleFail(errored.error)
      return
    }
    settleDone()
  })

  return () => {
    stopBeforeLoad()
    stopResolved()
    routerAbortState.delete(router)
  }
}
