/**
 * 跨平台/跨浏览器 Pointer 拖拽手势生命周期管理器
 *
 * 封装：
 * 1. setPointerCapture 安全捕获与 window 兜底监听（防 pointer 丢失/离开视口悬挂）
 * 2. 多点触控副指针与未聚焦指针过滤
 * 3. 意图死区（threshold）与滑动轴向判定
 * 4. 100ms 滑动窗口平滑速度估算（Velocity px/s）
 * 5. Window / Handle 跨层事件去重（防重复采样）
 */

const VELOCITY_WINDOW_MS = 100

export interface DragSample {
  t: number
  x: number
  y: number
}

export interface DragStartInfo {
  pointerId: number
  clientX: number
  clientY: number
  timeStamp: number
}

export interface DragMoveInfo {
  pointerId: number
  clientX: number
  clientY: number
  deltaX: number
  deltaY: number
  velocityX: number
  velocityY: number
  velocity: number // 沿配置主轴（若为 both 则为欧氏速度）
  timeStamp: number
}

export interface DragEndInfo {
  pointerId: number
  clientX: number
  clientY: number
  deltaX: number
  deltaY: number
  velocityX: number
  velocityY: number
  velocity: number
  timeStamp: number
}

export interface DragGestureOptions {
  /** 允许拖拽的轴向，默认 'both' */
  axis?: 'x' | 'y' | 'both'
  /** 拖拽启动的意图死区阈值（像素）。默认 0（即时跟手） */
  threshold?: number
  /** 手势启动回调。返回 false 可取消本次拖拽 */
  onStart?: (info: DragStartInfo, event: PointerEvent) => boolean | void
  /** 拖拽移动回调 */
  onMove?: (info: DragMoveInfo, event: PointerEvent) => void
  /** 正常松手回调 */
  onEnd?: (info: DragEndInfo, event: PointerEvent) => void
  /** 未通过意图阈值的 pointerup 回调，供点击定位类控件提交一次 tap */
  onTap?: (info: DragEndInfo, event: PointerEvent) => void
  /** 手势取消/被打断回调（如 pointercancel、外部强行 cancel） */
  onCancel?: (event?: PointerEvent) => void
}

export interface DragGestureHandle {
  /** 当前是否有正在进行的拖拽手势 */
  isDragging: () => boolean
  /** 外部强制取消当前拖拽（恢复初态并触发 onCancel） */
  cancel: () => void
  /** 彻底销毁手势监听器与解绑 DOM */
  destroy: () => void
}

/**
 * 为指定元素挂载统一的 Pointer 拖拽手势，或在已有的 pointerdown 事件中启动手势
 */
export function attachDragGesture(
  targetOrEvent: HTMLElement | PointerEvent,
  options: DragGestureOptions
): DragGestureHandle {
  const isEvent = typeof PointerEvent !== 'undefined' && targetOrEvent instanceof PointerEvent
  const target: HTMLElement | null = isEvent
    ? (targetOrEvent.currentTarget as HTMLElement | null) || (targetOrEvent.target as HTMLElement | null)
    : (targetOrEvent as HTMLElement)

  const { axis = 'both', threshold = 0, onStart, onMove, onEnd, onTap, onCancel } = options

  let activePointerId: number | null = null
  let startX = 0
  let startY = 0
  let isThresholdPassed = threshold <= 0
  let samples: DragSample[] = []
  let handledMoveEvent: PointerEvent | null = null

  function estimateVelocity(): { vx: number; vy: number; v: number } {
    if (samples.length < 2) return { vx: 0, vy: 0, v: 0 }
    const first = samples[0]
    const last = samples[samples.length - 1]
    const dt = last.t - first.t
    if (dt < 8) return { vx: 0, vy: 0, v: 0 } // 采样跨度不足 8ms 时不可信
    const vx = ((last.x - first.x) / dt) * 1000
    const vy = ((last.y - first.y) / dt) * 1000
    let v = 0
    if (axis === 'x') v = vx
    else if (axis === 'y') v = vy
    else v = Math.hypot(vx, vy)
    return { vx, vy, v }
  }

  function detachWindowListeners() {
    window.removeEventListener('pointermove', handlePointerMove, true)
    window.removeEventListener('pointerup', handlePointerUp, true)
    window.removeEventListener('pointercancel', handlePointerCancel, true)
    window.removeEventListener('lostpointercapture', handlePointerCancel, true)
  }

  function attachWindowListeners() {
    window.addEventListener('pointermove', handlePointerMove, true)
    window.addEventListener('pointerup', handlePointerUp, true)
    window.addEventListener('pointercancel', handlePointerCancel, true)
    window.addEventListener('lostpointercapture', handlePointerCancel, true)
  }

  function detachTargetListeners() {
    if (!target) return
    target.removeEventListener('pointermove', handlePointerMove)
    target.removeEventListener('pointerup', handlePointerUp)
    target.removeEventListener('pointercancel', handlePointerCancel)
    target.removeEventListener('lostpointercapture', handlePointerCancel)
  }

  function attachTargetListeners() {
    if (!target) return
    target.addEventListener('pointermove', handlePointerMove)
    target.addEventListener('pointerup', handlePointerUp)
    target.addEventListener('pointercancel', handlePointerCancel)
    target.addEventListener('lostpointercapture', handlePointerCancel)
  }

  function resetState() {
    if (activePointerId !== null && target && typeof target.hasPointerCapture === 'function') {
      try {
        if (target.hasPointerCapture(activePointerId)) {
          target.releasePointerCapture(activePointerId)
        }
      } catch {
        // ignore
      }
    }
    activePointerId = null
    isThresholdPassed = threshold <= 0
    samples = []
    handledMoveEvent = null
    detachWindowListeners()
    detachTargetListeners()
  }

  function handlePointerDown(e: PointerEvent) {
    if (activePointerId !== null) return
    // 真实触控环境下的多点触控副指针不启动手势（合成事件或鼠标环境缺省时不拦截）
    if (e.pointerType === 'touch' && e.isPrimary === false) return

    const startInfo: DragStartInfo = {
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      timeStamp: e.timeStamp
    }

    if (onStart?.(startInfo, e) === false) return

    activePointerId = e.pointerId
    startX = e.clientX
    startY = e.clientY
    isThresholdPassed = threshold <= 0
    samples = [{ t: e.timeStamp, x: e.clientX, y: e.clientY }]
    handledMoveEvent = null

    attachWindowListeners()
    attachTargetListeners()

    // 仅在无意图死区时立即捕获指针；若存在死区，延迟至确认拖拽后捕获，避免干扰子元素原生点击
    if (isThresholdPassed) {
      try {
        target?.setPointerCapture?.(e.pointerId)
      } catch {
        // 忽略合成指针或不可捕获上下文（如测试环境）
      }
    }
  }

  function handlePointerMove(e: PointerEvent) {
    if (activePointerId !== e.pointerId) return
    if (handledMoveEvent === e) return
    handledMoveEvent = e

    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

    if (!isThresholdPassed) {
      const distance = axis === 'x' ? Math.abs(deltaX) : axis === 'y' ? Math.abs(deltaY) : Math.hypot(deltaX, deltaY)
      if (distance < threshold) return

      // 若限定了 X 轴且 Y 轴位移明显更大，视为滚动意图而非拖拽
      if (axis === 'x' && Math.abs(deltaY) > Math.abs(deltaX)) {
        cancel()
        return
      }
      // 若限定了 Y 轴且 X 轴位移明显更大，放弃拖拽
      if (axis === 'y' && Math.abs(deltaX) > Math.abs(deltaY)) {
        cancel()
        return
      }
      isThresholdPassed = true
      try {
        target?.setPointerCapture?.(e.pointerId)
      } catch {
        // 忽略合成指针
      }
    }

    // 确认拖拽后阻止默认滚动/文字选中
    if (e.cancelable) e.preventDefault()

    const now = e.timeStamp
    samples.push({ t: now, x: e.clientX, y: e.clientY })
    while (samples.length > 2 && now - samples[0].t > VELOCITY_WINDOW_MS) {
      samples.shift()
    }

    const { vx, vy, v } = estimateVelocity()

    const moveInfo: DragMoveInfo = {
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      deltaX,
      deltaY,
      velocityX: vx,
      velocityY: vy,
      velocity: v,
      timeStamp: now
    }

    onMove?.(moveInfo, e)
  }

  function handlePointerUp(e: PointerEvent) {
    if (activePointerId !== e.pointerId) return

    const now = e.timeStamp
    samples.push({ t: now, x: e.clientX, y: e.clientY })
    while (samples.length > 2 && now - samples[0].t > VELOCITY_WINDOW_MS) {
      samples.shift()
    }

    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY
    const { vx, vy, v } = estimateVelocity()

    const endInfo: DragEndInfo = {
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      deltaX,
      deltaY,
      velocityX: vx,
      velocityY: vy,
      velocity: v,
      timeStamp: e.timeStamp
    }

    const hadPassedThreshold = isThresholdPassed
    resetState()

    if (hadPassedThreshold) {
      onEnd?.(endInfo, e)
    } else {
      onTap?.(endInfo, e)
      onCancel?.(e)
    }
  }

  function handlePointerCancel(e: PointerEvent) {
    if (activePointerId !== e.pointerId) return
    resetState()
    onCancel?.(e)
  }

  function cancel() {
    if (activePointerId === null) return
    resetState()
    onCancel?.()
  }

  if (isEvent) {
    handlePointerDown(targetOrEvent)
  } else if (target) {
    target.addEventListener('pointerdown', handlePointerDown)
    target.addEventListener('pointermove', handlePointerMove)
    target.addEventListener('pointerup', handlePointerUp)
    target.addEventListener('pointercancel', handlePointerCancel)
  }

  return {
    isDragging: () => activePointerId !== null,
    cancel,
    destroy: () => {
      cancel()
      if (!isEvent && target) {
        target.removeEventListener('pointerdown', handlePointerDown)
        target.removeEventListener('pointermove', handlePointerMove)
        target.removeEventListener('pointerup', handlePointerUp)
        target.removeEventListener('pointercancel', handlePointerCancel)
      }
    }
  }
}
