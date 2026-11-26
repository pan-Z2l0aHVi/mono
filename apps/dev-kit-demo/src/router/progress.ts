import { createRouteProgressStarter } from '@greypan/route-progress'

/** 全局唯一的跳转进度实例（默认 250ms 延迟启动 + 300ms 最短停留 + 220ms 100% 冲刺保底）：守卫写入，`RouteProgressBar` 订阅。 */
export const routeProgress = createRouteProgressStarter()
