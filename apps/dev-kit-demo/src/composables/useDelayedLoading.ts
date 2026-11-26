import { createDelayedVisibility } from '@greypan/route-progress'
import { onScopeDispose, readonly, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

/**
 * 局部 loading / 骨架屏的 250ms 防闪烁 Composable：
 * - `active` 在 250ms 内回到 `false` 时，始终返回 `false`（用户无感知，零闪烁）；
 * - 一旦超过 250ms 显示出来，至少维持 300ms 才隐藏。
 */
export function useDelayedLoading(active: MaybeRefOrGetter<boolean>) {
  const controller = createDelayedVisibility()
  const visible = shallowRef(controller.getSnapshot().visible)
  const stop = controller.subscribe(() => {
    visible.value = controller.getSnapshot().visible
  })

  watch(
    () => toValue(active),
    isLoading => {
      if (isLoading) controller.start()
      else controller.done()
    },
    { immediate: true }
  )

  onScopeDispose(stop)
  return readonly(visible)
}
