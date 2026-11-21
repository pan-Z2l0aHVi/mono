import { defineRouteClock } from './clock'
import type { RouteClock } from './clock'
import { defineRouteProgressCore } from './core'
import type { RouteProgressCore, RouteProgressOptions } from './core'
import { defineRouteTrickle } from './trickle'
import type { RouteTrickleOptions } from './trickle'

export * from './clock'
export * from './core'
export * from './trickle'

export interface RouteProgressStarterOptions extends RouteProgressOptions, RouteTrickleOptions {
  clock?: RouteClock
}

/** 预组装默认组合：clock → trickle → core。需要扩展时按需组合各 `define*` 插件。 */
export function createRouteProgressStarter(options: RouteProgressStarterOptions = {}): RouteProgressCore {
  const { clock, showDelay, minVisible, ...trickle } = options
  const { progress } = defineRouteClock(clock)
    .use(defineRouteTrickle(trickle))
    .use(defineRouteProgressCore({ showDelay, minVisible }))
    .make()
  return progress
}
