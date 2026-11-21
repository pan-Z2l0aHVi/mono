import { createDelayedVisibility } from '@greypan/route-progress'
import { useEffect, useState, useSyncExternalStore } from 'react'

/**
 * 局部 loading / 骨架屏的 250ms 防闪烁 Hook：
 * - `active` 在 250ms 内回到 `false` 时，始终返回 `false`（用户无感知，零闪烁）；
 * - 一旦超过 250ms 显示出来，至少维持 300ms 才隐藏。
 */
export function useDelayedLoading(active: boolean) {
  const [controller] = useState(createDelayedVisibility)
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)

  useEffect(() => {
    if (active) controller.start()
    else controller.done()
  }, [active, controller])

  return snapshot.visible
}
