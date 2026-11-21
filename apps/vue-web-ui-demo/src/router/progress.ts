import { createRouteProgressStarter } from '@greypan/route-progress'

/** 全局唯一的跳转进度实例：守卫写入，`RouteProgressBar` 订阅。 */
export const routeProgress = createRouteProgressStarter({ showDelay: 120, minVisible: 300 })

const failureListeners = new Set<(error: unknown) => void>()

/** 订阅导航失败；文案与 toast 由壳组件持有，这样走 wuchale 抽取而不是在 ts 里写死。 */
export function onRouteFailure(listener: (error: unknown) => void) {
  failureListeners.add(listener)
  return () => {
    failureListeners.delete(listener)
  }
}

export function reportRouteFailure(error: unknown) {
  for (const listener of failureListeners) listener(error)
}
