import { definePlugin } from '@greypan/js-kit'

import { attachDragGesture, dampOverscroll, type DragGestureHandle } from '@/shared/gesture'
import { prefersReducedMotion } from '@/shared/theme/reduced-motion'

import type { DrawerPlacement } from './index'

/*
 * 释放后的拖拽关闭判定：
 *
 * - 基准校准：drawer 关闭手势层的 `calibrateOnFirstMove`，以 `pointerdown` 作为位移零点与
 *   判定起点，保留按下到首个 move 之间的初始位移，避免极短快速轻扫被吞掉第一帧而无法触发。
 *   （`stageOrigin` 在 `pointerdown` 初始化，enter-full 吸附时重设。）
 * - 距离：**自抓取瞬间起的净位移**超过 drawer 尺寸的 35%（`DRAG_CLOSE_RATIO`，下限 10px）。
 *   用净位移而不是绝对位置：从弹回/收尾途中重新抓取时，抓取瞬间停在哪里都不算「已经拖过阈值」。
 *   尺寸量不到时（0）由下限兜底，保证退化场景不会因为阈值 0 而「动一下就关」。
 * - 甩动：闭合方向速度**达到** 350px/s（`DRAG_FLICK_VELOCITY`，含等号），取整段净速度、
 *   手势层滑窗速度与 120ms 内末次正向 move 速度（`DRAG_RECENT_VELOCITY_WINDOW_MS`）中的最大值，
 *   避免快速轻扫或松手瞬间短暂停顿把速度压低。净速度分母钳到 50ms；时长为 0 且无移动速度时取 0，
 *   防止把「测不到时长」误判为一次甩动。
 * - 方向：净位移未朝闭合方向（`<= 0`）时一律弹回。
 * - 改主意：拖拽期内基于闭合方向峰值位移（`swipePeakCloseDisp`）与曾否明显反向拉出
 *   （`swipeSawOutward`）判定回撤——从峰值回撤满 10px 或先反向拉出 10px 再回扫时标记取消，
 *   甩动分支据此拒绝关闭，同时忽略 1-2px 释放微抖；位移重新越过关闭距离阈值时清除标记，
 *   即「已经拖过距离阈值」不受回撤影响。见 `trackSwipeCancel`。
 * - 过冲阻尼：闭合方向全额 1:1 跟手，反向按 `dampOverscroll` 平方根压缩。阻尼作用于
 *   **本次手势的增量**，再叠加抓取瞬间的基准位移；对总位移做阻尼会连基准一起压缩，
 *   元素不再接着视觉位置走。
 */
const DRAG_CLOSE_RATIO = 0.35
const DRAG_MIN_CLOSE_DISTANCE = 10
const DRAG_FLICK_VELOCITY = 350
const DRAG_MIN_VELOCITY_SPAN_MS = 50
const DRAG_RECENT_VELOCITY_WINDOW_MS = 120
const DRAG_REVERSE_CANCEL_THRESHOLD = 10
const DRAG_REQUEST_WINDOW_MS = 120

// fullable 两段手势阈值（固定 px，不随尺寸比例缩放）。
const FULL_ENTER_TRAVEL = 96
const FULL_EXIT_TRAVEL = 96

// 收尾过渡参数。时长由释放瞬间剩余距离与速度共定，上下限分别兜住极慢与极快甩动；
// 两条曲线对应弹簧预设的阻尼比——close（ζ≈1.05）无过冲，rebound（ζ≈0.74）保留约 3% 过冲。
const SETTLE_MIN_MS = 180
const SETTLE_MAX_MS = 420
const SETTLE_EASE_CLOSE = 'cubic-bezier(0.32, 0.72, 0, 1)'
const SETTLE_EASE_REBOUND = 'cubic-bezier(0.22, 1.3, 0.36, 1)'
const SETTLE_MIN_VELOCITY = 1
const SETTLE_GRACE_MS = 80

/*
 * header / footer 让开给「可点控件」的选择器（上下 placement 专用）。
 */
const HEADER_FOOTER_INTERACTIVE_SELECTOR = [
  'button',
  'input',
  'select',
  'textarea',
  'label',
  'summary',
  'a[href]',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="radio"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="slider"]',
  '[role="spinbutton"]'
].join(',')

export function getPlacementDragAxis(placement: DrawerPlacement): 'x' | 'y' {
  return placement === 'left' || placement === 'right' ? 'x' : 'y'
}

// 位移正方向 = drawer 的闭合方向（拖出屏幕为正）。
export function getPlacementCloseSign(placement: DrawerPlacement): number {
  switch (placement) {
    case 'right':
    case 'bottom':
      return 1
    case 'left':
    case 'top':
      return -1
  }
}

export interface DrawerDragAdapter {
  getHost: () => HTMLElement
  getDialog: () => HTMLDialogElement | null
  getMotionLayer: () => HTMLElement | null
  getPlacement: () => DrawerPlacement
  isOpen: () => boolean
  isDraggable: () => boolean
  isFullable: () => boolean
  isControlled: () => boolean
  onDragStateChange: (dragging: boolean) => void
  onRequestClose: () => void
  onNestedRecalculate: () => void
}

export interface DrawerDragController {
  isDragging: () => boolean
  isAwaitingWriteback: () => boolean
  handlePointerDown: (e: PointerEvent) => void
  handleSectionPointerDown: (e: PointerEvent) => void
  handleTransitionEnd: (e: TransitionEvent) => void
  syncControlledOpen: (open: boolean) => void
  handleNativeCloseWhileOpen: () => boolean
  collapseForNested: (depth: number) => void
  reset: (options?: { keepFullClass?: boolean }) => void
  destroy: () => void
}

/**
 * 封装 drawer 的拖拽关闭、fullable 两段式状态机、惯性收尾（settle）与受控回写等待。
 */
export const defineDrawerDragController = () =>
  definePlugin<DrawerDragController, DrawerDragAdapter>(adapter => {
    let dragGesture: DragGestureHandle | null = null
    // pointerdown 时刻已存在的闭合方向位移（从弹回动画中抓取时非 0）。
    let dragInitialOffset = 0
    let dragOffset = 0
    // 关闭方向达到过的峰值未阻尼位移，用于判定真实回撤（避免 1px 微抖误判）。
    let swipePeakCloseDisp = 0
    // 本段手势是否曾明显朝打开方向拉出（防先拉出再反向回扫误关）。
    let swipeSawOutward = false
    // 已判定为「改主意」，甩动分支据此拒绝关闭。
    let swipeCancelled = false
    // 末次有效移动的闭合方向速度与时间戳：避免松开按键前短暂停顿把瞬时速度归零。
    let lastMoveVelocity = 0
    let lastMoveTime = 0

    /*
     * fullable 两段手势的状态：
     *
     * - `stage` 决定 onMove 走哪个分支；'full' 跨手势持久（full 态松手弹回后仍 full），
     *   复位只经 `reset()`。
     * - `stageOrigin` 是本段手势的指针轴零点：在 `pointerdown` 初始化，enter-full 时重设——
     *   两次拉动（base→full→exit）的判定零点因此随吸附点换段。
     * - `baseDragSize` 是 base 阶段的判定尺寸：exit-full 后 280ms 宽度回位窗口内，
     *   阈值不读过渡中的中途值。判定一律走 `judgeSize()`，禁止裸读本字段。
     * - `fullArmed` 在 pointerdown 一次性判定，是 enter 与甩动展开共用的唯一开关。
     */
    let stage: 'base' | 'full' = 'base'
    let stageOrigin: number | null = null
    let baseDragSize = 0
    let fullArmed = false
    let exitedFull = false

    let settleFinish: (() => void) | null = null
    let settleTimer: ReturnType<typeof setTimeout> | undefined
    // controlled：弹簧到闭合位后等待 Consumer 回写 open；超时未回写则弹回。
    let dragAwaitWriteback = false
    let dragRequestTimer: ReturnType<typeof setTimeout> | undefined

    const isDragging = () => dragGesture?.isDragging() ?? false
    const isAwaitingWriteback = () => dragAwaitWriteback

    const syncDragInert = () => {
      adapter.onDragStateChange(isDragging())
    }

    const measureDragSize = () => {
      const dialog = adapter.getDialog()
      if (!dialog) return 0
      return getPlacementDragAxis(adapter.getPlacement()) === 'x' ? dialog.offsetWidth : dialog.offsetHeight
    }

    // 手势会话内冻结的 base 尺寸优先，清零后回落实时测量。
    const judgeSize = () => baseDragSize || measureDragSize()

    const dragCloseThreshold = (size: number) => Math.max(size * DRAG_CLOSE_RATIO, DRAG_MIN_CLOSE_DISTANCE)

    const readDrawerInset = (dialog: HTMLDialogElement) => {
      const raw = getComputedStyle(dialog).getPropertyValue('--wui-internal-drawer-inset')
      const parsed = Number.parseFloat(raw)
      return Number.isFinite(parsed) ? parsed : 0
    }

    const dragCloseDistance = (dialog: HTMLDialogElement) => judgeSize() + readDrawerInset(dialog)

    const postExitFullDelta = (raw: number) => {
      if (raw <= FULL_EXIT_TRAVEL) return dampOverscroll(raw)
      return FULL_EXIT_TRAVEL + Math.sqrt(raw - FULL_EXIT_TRAVEL)
    }

    const cancelDragAwait = () => {
      if (dragRequestTimer !== undefined) {
        clearTimeout(dragRequestTimer)
        dragRequestTimer = undefined
      }
      dragAwaitWriteback = false
    }

    const applyDragOffset = (dialog: HTMLDialogElement, offset: number) => {
      const placement = adapter.getPlacement()
      const axis = getPlacementDragAxis(placement)
      const value = offset * getPlacementCloseSign(placement)
      const motionLayer = adapter.getMotionLayer()
      if (motionLayer) {
        motionLayer.style.transform = axis === 'x' ? `translateX(${value}px)` : `translateY(${value}px)`
      }
      const size = judgeSize()
      const progress = size > 0 ? Math.min(1, Math.max(0, offset / size)) : 0
      dialog.style.setProperty('--wui-internal-drag-backdrop-opacity', String(1 - progress))
    }

    const clearDragStyles = (dialog: HTMLDialogElement) => {
      adapter.getMotionLayer()?.style.removeProperty('transform')
      dialog.style.removeProperty('--wui-internal-drag-backdrop-opacity')
    }

    const abortSettle = () => {
      settleFinish = null
      if (settleTimer !== undefined) {
        clearTimeout(settleTimer)
        settleTimer = undefined
      }
      const dialog = adapter.getDialog()
      if (!dialog) return
      dialog.classList.remove('is-settling')
      dialog.style.removeProperty('--wui-internal-settle-duration')
      dialog.style.removeProperty('--wui-internal-settle-easing')
    }

    const finishSettle = () => {
      const finish = settleFinish
      if (!finish) return
      abortSettle()
      finish()
    }

    const settleDuration = (distance: number, velocity: number) => {
      const ms = (distance / Math.max(Math.abs(velocity), SETTLE_MIN_VELOCITY)) * 1000
      return Math.min(SETTLE_MAX_MS, Math.max(SETTLE_MIN_MS, ms))
    }

    const startSettle = (
      dialog: HTMLDialogElement,
      offset: number,
      backdropOpacity: number,
      duration: number,
      easing: string,
      onDone: () => void
    ) => {
      abortSettle()
      const placement = adapter.getPlacement()
      const axis = getPlacementDragAxis(placement)
      const sign = getPlacementCloseSign(placement)
      dialog.style.setProperty('--wui-internal-settle-duration', `${duration}ms`)
      dialog.style.setProperty('--wui-internal-settle-easing', easing)
      const motionLayer = adapter.getMotionLayer()
      if (motionLayer) {
        motionLayer.style.transform = axis === 'x' ? `translateX(${offset * sign}px)` : `translateY(${offset * sign}px)`
      }
      dialog.style.setProperty('--wui-internal-drag-backdrop-opacity', String(backdropOpacity))
      dialog.classList.add('is-settling')
      dialog.classList.remove('is-dragging')

      settleFinish = onDone
      settleTimer = setTimeout(() => finishSettle(), duration + SETTLE_GRACE_MS)
    }

    const settleRebound = (dialog: HTMLDialogElement, velocity: number, from: number) => {
      dragOffset = 0
      const finishRebound = () => {
        clearDragStyles(dialog)
      }
      if (prefersReducedMotion(adapter.getHost()) || Math.abs(from) < 1) {
        dialog.classList.remove('is-dragging')
        finishRebound()
        return
      }
      startSettle(dialog, 0, 1, settleDuration(Math.abs(from), velocity), SETTLE_EASE_REBOUND, finishRebound)
    }

    const handleDragWritebackTimeout = () => {
      dragRequestTimer = undefined
      if (!dragAwaitWriteback || !adapter.isOpen() || isDragging()) {
        dragAwaitWriteback = false
        return
      }
      dragAwaitWriteback = false
      const dialog = adapter.getDialog()
      if (!dialog) return
      dialog.classList.add('is-visible')
      settleRebound(dialog, 0, dragCloseDistance(dialog))
    }

    const closeFromDrag = () => {
      adapter.onRequestClose()
      if (adapter.isControlled()) {
        dragAwaitWriteback = true
        dragRequestTimer = setTimeout(handleDragWritebackTimeout, DRAG_REQUEST_WINDOW_MS)
      }
    }

    const settleToClose = (dialog: HTMLDialogElement, velocity: number) => {
      const from = dragOffset
      dragOffset = 0
      const to = dragCloseDistance(dialog)

      const finishClose = () => {
        if (adapter.isControlled()) {
          applyDragOffset(dialog, to)
        } else {
          dialog.classList.remove('is-visible')
          clearDragStyles(dialog)
        }
        closeFromDrag()
      }

      if (prefersReducedMotion(adapter.getHost()) || Math.abs(to - from) < 1) {
        dialog.classList.remove('is-dragging')
        finishClose()
        return
      }

      startSettle(dialog, to, 0, settleDuration(Math.abs(to - from), velocity), SETTLE_EASE_CLOSE, finishClose)
    }

    const reset = (options: { keepFullClass?: boolean } = {}) => {
      stage = 'base'
      stageOrigin = null
      baseDragSize = 0
      fullArmed = false
      if (!isDragging()) exitedFull = false
      if (!options.keepFullClass) adapter.getDialog()?.classList.remove('is-full')
    }

    const transitionToFullState = (dialog: HTMLDialogElement, origin: number | null, resetVisualOffset: boolean) => {
      stage = 'full'
      stageOrigin = origin
      dragInitialOffset = 0
      swipePeakCloseDisp = 0
      swipeSawOutward = false
      swipeCancelled = false
      lastMoveVelocity = 0
      lastMoveTime = 0
      if (resetVisualOffset) {
        dragOffset = 0
        applyDragOffset(dialog, 0)
      }
      dialog.classList.add('is-full')
    }

    const exitFull = (dialog: HTMLDialogElement) => {
      stage = 'base'
      exitedFull = true
      dialog.classList.remove('is-full', 'is-drag-close')
    }

    const collapseForNested = (depth: number) => {
      if (depth <= 0 || stage !== 'full' || isDragging()) return
      const dialog = adapter.getDialog()
      if (!dialog) return
      dialog.classList.add('is-size-instant')
      dialog.classList.remove('is-full')
      void dialog.offsetWidth
      dialog.classList.remove('is-size-instant')
      reset()
    }

    const settleNestedFullAfterDrag = (dialog: HTMLDialogElement) => {
      if (!dialog.classList.contains('is-nested-lower')) return
      if (stage === 'full') collapseForNested(1)
      adapter.onNestedRecalculate()
    }

    const trackSwipeCancel = (displacement: number) => {
      if (displacement <= -DRAG_REVERSE_CANCEL_THRESHOLD) {
        swipeSawOutward = true
      }
      if (displacement > swipePeakCloseDisp) {
        swipePeakCloseDisp = displacement
      }

      if (displacement > dragCloseThreshold(judgeSize())) {
        swipeCancelled = false
        return
      }

      if (
        (swipeSawOutward && displacement > 0) ||
        (swipePeakCloseDisp > 0 && swipePeakCloseDisp - displacement >= DRAG_REVERSE_CANCEL_THRESHOLD)
      ) {
        swipeCancelled = true
      }
    }

    const cancelActive = () => {
      if (!isDragging()) return
      dragGesture?.destroy()
      dragGesture = null
      syncDragInert()
      const dialog = adapter.getDialog()
      if (!dialog) return
      dialog.classList.remove('is-dragging', 'is-drag-close')
      clearDragStyles(dialog)
    }

    const isInteractivePath = (e: PointerEvent) => {
      const path = typeof e.composedPath === 'function' ? e.composedPath() : [e.target]
      for (const node of path) {
        if (node instanceof Element && node.matches(HEADER_FOOTER_INTERACTIVE_SELECTOR)) return true
      }
      return false
    }

    const handlePointerDown = (e: PointerEvent) => {
      if (!adapter.isOpen() || !adapter.isDraggable() || isDragging()) return
      if (e.isPrimary === false) return

      const dialog = adapter.getDialog()
      if (!dialog || !dialog.classList.contains('is-visible')) return

      const placement = adapter.getPlacement()
      const axis = getPlacementDragAxis(placement)
      const closeSign = getPlacementCloseSign(placement)

      const motionLayer = adapter.getMotionLayer()
      const currentTransform = motionLayer ? getComputedStyle(motionLayer).transform : 'none'
      const axisValue =
        currentTransform && currentTransform !== 'none' && typeof DOMMatrixReadOnly === 'function'
          ? new DOMMatrixReadOnly(currentTransform)[axis === 'x' ? 'm41' : 'm42']
          : 0

      abortSettle()
      cancelDragAwait()

      dragInitialOffset = axisValue * closeSign
      dragOffset = dragInitialOffset
      const axisPos = axis === 'x' ? e.clientX : e.clientY
      swipePeakCloseDisp = 0
      swipeSawOutward = false
      swipeCancelled = false
      lastMoveVelocity = 0
      lastMoveTime = e.timeStamp
      exitedFull = false

      const hasSizeTransition =
        typeof dialog.getAnimations === 'function' &&
        dialog.getAnimations().some(animation => {
          const property = (animation as Animation & { propertyName?: string }).propertyName
          return property === 'width' || property === 'height'
        })
      fullArmed = adapter.isFullable() && adapter.isDraggable() && Math.abs(dragInitialOffset) < 1
      stageOrigin = axisPos
      baseDragSize = stage === 'full' || hasSizeTransition ? baseDragSize || measureDragSize() : measureDragSize()

      dialog.classList.add('is-dragging')
      applyDragOffset(dialog, dragOffset)

      dragGesture = attachDragGesture(e, {
        axis,
        calibrateOnFirstMove: false,
        cancelOnLostCapture: false,
        onMove: info => {
          const currentPlacement = adapter.getPlacement()
          const currentAxis = getPlacementDragAxis(currentPlacement)
          const currentSign = getPlacementCloseSign(currentPlacement)
          const movePos = currentAxis === 'x' ? info.clientX : info.clientY
          if (stageOrigin === null) stageOrigin = movePos
          const raw = (movePos - stageOrigin) * currentSign
          dragOffset = dragInitialOffset + dampOverscroll(raw)

          const nestedLower = dialog.classList.contains('is-nested-lower')
          if (stage === 'full') {
            if (raw >= 0) {
              dragOffset = dragInitialOffset + raw
              if (raw >= FULL_EXIT_TRAVEL) {
                exitFull(dialog)
              }
            }
          } else if (!exitedFull && fullArmed && !nestedLower && raw <= -FULL_ENTER_TRAVEL) {
            transitionToFullState(dialog, movePos, true)
          }

          if (stage === 'base' && exitedFull) {
            dragOffset = dragInitialOffset + postExitFullDelta(raw)
          }

          trackSwipeCancel(raw)
          const moveVelocity = (currentAxis === 'x' ? info.velocityX : info.velocityY) * currentSign
          if (moveVelocity !== 0) {
            lastMoveVelocity = moveVelocity
            lastMoveTime = info.timeStamp
          }

          const dragSize = judgeSize()
          const dragDisplacement = dragOffset - dragInitialOffset
          dialog.classList.toggle(
            'is-drag-close',
            stage === 'base' && !exitedFull && dragDisplacement > dragCloseThreshold(dragSize)
          )
          applyDragOffset(dialog, dragOffset)
        },
        onEnd: info => {
          dragGesture = null
          syncDragInert()
          dialog.classList.remove('is-dragging', 'is-drag-close')
          settleNestedFullAfterDrag(dialog)

          const currentPlacement = adapter.getPlacement()
          const currentAxis = getPlacementDragAxis(currentPlacement)
          const currentSign = getPlacementCloseSign(currentPlacement)
          const nestedLower = dialog.classList.contains('is-nested-lower')

          const size = judgeSize()
          const velocity = (currentAxis === 'x' ? info.velocityX : info.velocityY) * currentSign
          const displacement = dragOffset - dragInitialOffset
          const netVelocity =
            info.duration > 0 ? (displacement / Math.max(info.duration, DRAG_MIN_VELOCITY_SPAN_MS)) * 1000 : 0
          const recentMoveVelocity =
            info.timeStamp - lastMoveTime <= DRAG_RECENT_VELOCITY_WINDOW_MS ? lastMoveVelocity : 0
          const flickVelocity = Math.max(netVelocity, velocity, recentMoveVelocity)

          const flicked = displacement > 0 && flickVelocity >= DRAG_FLICK_VELOCITY && !swipeCancelled
          const shouldClose = !exitedFull && (displacement > dragCloseThreshold(size) || flicked)

          if (stage === 'full') {
            settleRebound(dialog, velocity, dragOffset)
            return
          }

          if (
            fullArmed &&
            !exitedFull &&
            !shouldClose &&
            !swipeCancelled &&
            !nestedLower &&
            Math.min(velocity, recentMoveVelocity) <= -DRAG_FLICK_VELOCITY &&
            dragOffset <= 0
          ) {
            const from = dragOffset
            transitionToFullState(dialog, null, false)
            settleRebound(dialog, velocity, from)
            return
          }

          if (shouldClose) settleToClose(dialog, velocity)
          else settleRebound(dialog, velocity, dragOffset)
        },
        onCancel: () => {
          dragGesture = null
          syncDragInert()
          dialog.classList.remove('is-dragging', 'is-drag-close')
          settleNestedFullAfterDrag(dialog)
          settleRebound(dialog, 0, dragOffset)
        }
      })

      syncDragInert()
    }

    const handleSectionPointerDown = (e: PointerEvent) => {
      const placement = adapter.getPlacement()
      if (placement !== 'top' && placement !== 'bottom') return
      const section = (e.currentTarget as HTMLElement | null)?.closest('.wui-drawer-header, .wui-drawer-footer')
      const isHeader = section?.classList.contains('wui-drawer-header') ?? false
      if (placement === 'bottom' && !isHeader) return
      if (placement === 'top' && isHeader) return
      if (adapter.getDialog()?.classList.contains('is-nested-lower')) return
      if (isInteractivePath(e)) return
      handlePointerDown(e)
    }

    const handleTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'transform') {
        finishSettle()
      }
    }

    const syncControlledOpen = (open: boolean) => {
      if (isDragging() && !open) cancelActive()
      reset({ keepFullClass: !open })
      if (dragAwaitWriteback) {
        cancelDragAwait()
        const dialog = adapter.getDialog()
        if (dialog && !open) {
          dialog.classList.remove('is-visible')
          clearDragStyles(dialog)
        } else if (dialog && open) {
          settleRebound(dialog, 0, dragCloseDistance(dialog))
        }
      }
      if (!open && !isDragging()) {
        abortSettle()
        const dialog = adapter.getDialog()
        if (dialog) clearDragStyles(dialog)
      }
    }

    const handleNativeCloseWhileOpen = () => {
      if (!dragAwaitWriteback) return false
      cancelDragAwait()
      return true
    }

    const destroy = () => {
      dragGesture?.destroy()
      dragGesture = null
      abortSettle()
      cancelDragAwait()
      reset({ keepFullClass: true })
    }

    return {
      isDragging,
      isAwaitingWriteback,
      handlePointerDown,
      handleSectionPointerDown,
      handleTransitionEnd,
      syncControlledOpen,
      handleNativeCloseWhileOpen,
      collapseForNested,
      reset,
      destroy
    }
  })
