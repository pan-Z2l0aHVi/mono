import { defineRouteClock } from './clock'
import type { RouteClock } from './clock'
import { defineRouteProgressCore } from './core'
import type { RouteProgressCore, RouteProgressOptions } from './core'
import { defineDelayedVisibility } from './delayed-visibility'
import type { DelayedVisibilityCore, DelayedVisibilityOptions } from './delayed-visibility'
import { defineRouteTrickle } from './trickle'
import type { RouteTrickleOptions } from './trickle'

export * from './clock'
export * from './core'
export * from './delayed-visibility'
export * from './trickle'

export interface RouteProgressStarterOptions extends RouteProgressOptions, RouteTrickleOptions {
  clock?: RouteClock
}

/** 预组装默认组合：clock → trickle → core。需要扩展时按需组合各 `define*` 插件。 */
export function createRouteProgressStarter(options: RouteProgressStarterOptions = {}): RouteProgressCore {
  const { clock, showDelay, minVisible, completeHold, ...trickle } = options
  const { progress } = defineRouteClock(clock)
    .use(defineRouteTrickle(trickle))
    .use(defineRouteProgressCore({ showDelay, minVisible, completeHold }))
    .make()
  return progress
}

export interface DelayedVisibilityStarterOptions extends DelayedVisibilityOptions {
  clock?: RouteClock
}

/** 预组装通用延迟显隐控制器（默认 250ms 延迟显示 + 300ms 最短停留），供局部 loading / 骨架屏复用。 */
export function createDelayedVisibility(options: DelayedVisibilityStarterOptions = {}): DelayedVisibilityCore {
  const { clock, showDelay, minVisible } = options
  const { visibility } = defineRouteClock(clock).use(defineDelayedVisibility({ showDelay, minVisible })).make()
  return visibility
}
