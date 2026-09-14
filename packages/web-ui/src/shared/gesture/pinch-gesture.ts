/**
 * 跨平台/跨浏览器 Pointer 双指捏合手势生命周期管理器
 *
 * 封装：
 * 1. 活动指针表与「第二指就位即进入手势」的判定（首指仍留给并行的单指手势）
 * 2. window 兜底监听（防指针离开元素或移出视口导致手势悬挂）
 * 3. 两指距离比例与中点位移计算
 * 4. 起始距离过近时的基准重置（两指贴着落下不会产生比例跳变）
 *
 * 本模块只产出几何信息；比例与中点如何映射为缩放和平移由消费方决定。
 */

/** 基准距离下限（px）：低于此值不产出比例，等两指拉开后以新基准重新开始。 */
const MIN_BASE_DISTANCE = 16

export interface PinchStartInfo {
  /** 基准两指距离（px），恒 >= MIN_BASE_DISTANCE */
  distance: number
  /** 两指中点（client 坐标） */
  centerX: number
  centerY: number
}

export interface PinchMoveInfo {
  /** 当前距离与基准距离之比；> 1 为放大，< 1 为缩小 */
  ratio: number
  distance: number
  centerX: number
  centerY: number
  /** 中点相对基准中点的位移（px） */
  deltaX: number
  deltaY: number
}

export interface PinchGestureOptions {
  /** 两指就位且距离达到基准时触发；指针增删导致端点变化时会以新基准再次触发 */
  onStart?: (info: PinchStartInfo, event: PointerEvent) => void
  onMove?: (info: PinchMoveInfo, event: PointerEvent) => void
  /** 指针少于两个导致手势结束时触发 */
  onEnd?: (event: PointerEvent) => void
  /** 手势被 pointercancel 或 destroy 打断时触发 */
  onCancel?: (event?: PointerEvent) => void
}

export interface PinchGestureHandle {
  isPinching: () => boolean
  /** 主动清空指针表并结束手势（打断时触发 onCancel） */
  cancel: () => void
  /** 移除监听并结束手势 */
  destroy: () => void
}

interface TrackedPointer {
  x: number
  y: number
}

/**
 * 为元素挂载双指捏合手势。第二指在该元素上按下即进入手势，
 * 首指的按下事件不受影响，可由单指手势管理器并行接管。
 */
export function attachPinchGesture(target: HTMLElement, options: PinchGestureOptions): PinchGestureHandle {
  const { onStart, onMove, onEnd, onCancel } = options

  const pointers = new Map<number, TrackedPointer>()
  let baseDistance = 0
  let baseCenterX = 0
  let baseCenterY = 0
  let pinching = false

  function attachWindowListeners() {
    window.addEventListener('pointermove', handlePointerMove, true)
    window.addEventListener('pointerup', handlePointerEnd, true)
    window.addEventListener('pointercancel', handlePointerEnd, true)
  }

  function detachWindowListeners() {
    window.removeEventListener('pointermove', handlePointerMove, true)
    window.removeEventListener('pointerup', handlePointerEnd, true)
    window.removeEventListener('pointercancel', handlePointerEnd, true)
  }

  function reset() {
    pointers.clear()
    baseDistance = 0
    baseCenterX = 0
    baseCenterY = 0
    pinching = false
    detachWindowListeners()
  }

  /** 恰好两个指针时返回捏合两端的中点与距离；其余数量不产出几何。 */
  function geometry(): { distance: number; centerX: number; centerY: number } | null {
    if (pointers.size !== 2) return null
    const iterator = pointers.values()
    const first = iterator.next().value as TrackedPointer
    const second = iterator.next().value as TrackedPointer
    return {
      distance: Math.hypot(first.x - second.x, first.y - second.y),
      centerX: (first.x + second.x) / 2,
      centerY: (first.y + second.y) / 2
    }
  }

  /** 以当前几何重建基准；距离达到下限才派发 onStart，否则留待拉开后重建。 */
  function rebase(event: PointerEvent) {
    const current = geometry()
    if (!current) {
      baseDistance = 0
      return
    }
    baseDistance = current.distance
    baseCenterX = current.centerX
    baseCenterY = current.centerY
    if (baseDistance >= MIN_BASE_DISTANCE) onStart?.(current, event)
  }

  function handlePointerDown(event: PointerEvent) {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    attachWindowListeners()

    if (pointers.size < 2) return
    if (pointers.size > 2) {
      baseDistance = 0
      return
    }

    pinching = true
    rebase(event)
  }

  function handlePointerMove(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (!pinching) return

    if (baseDistance < MIN_BASE_DISTANCE) {
      rebase(event)
      return
    }

    const current = geometry()
    if (!current) return

    onMove?.(
      {
        ratio: current.distance / baseDistance,
        distance: current.distance,
        centerX: current.centerX,
        centerY: current.centerY,
        deltaX: current.centerX - baseCenterX,
        deltaY: current.centerY - baseCenterY
      },
      event
    )
  }

  function handlePointerEnd(event: PointerEvent) {
    if (!pointers.delete(event.pointerId)) return
    if (pointers.size === 0) detachWindowListeners()

    if (pointers.size >= 2) {
      // 指针增删换了端点，旧基准会让比例跳变；二指仍在则重建。
      if (pinching) rebase(event)
      return
    }

    const wasPinching = pinching
    pinching = false
    baseDistance = 0
    if (!wasPinching) return

    if (event.type === 'pointercancel') onCancel?.(event)
    else onEnd?.(event)
  }

  function cancel() {
    const wasPinching = pinching
    reset()
    if (wasPinching) onCancel?.()
  }

  target.addEventListener('pointerdown', handlePointerDown)

  return {
    isPinching: () => pinching,
    cancel,
    destroy: () => {
      target.removeEventListener('pointerdown', handlePointerDown)
      cancel()
    }
  }
}
