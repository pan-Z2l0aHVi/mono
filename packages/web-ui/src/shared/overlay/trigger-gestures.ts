/**
 * trigger 手势接线：anchored overlay 组件（tooltip / popover 等）共用的
 * hover / focus / click 事件路由与簿记。
 *
 * `trigger-props.ts` 只归一化取值；这里承接它的下一段——每种手势接哪些事件、
 * show/hide 计时、instant-open 标记与 outside-click 判定。组件不再各自维护
 * `_syncTriggerListeners` / `_showTimer` / `_hideTimer`，只通过 policy 提供
 * 真正分叉的策略（delay 来源、hover 即开判定、focus-out 时序）。
 *
 * 监听常驻、判定动态：手势 handler 内部用 `hasMode()` 读取当前 trigger 集合，
 * trigger 属性改写时无需重绑监听，只需 `syncTriggerChange()` 清空挂起计时。
 * open 状态仍由宿主持有：`requestOpen` / `requestClose` 必须是幂等入口
 * （未开启时 `requestClose` no-op），user-change 标记归宿主。
 */
import { hasTriggerMode, type OverlayTriggerMode } from '@/shared/overlay/trigger-props'

/** 打开/收起请求的来源；宿主可用于区分语义（manual 手势忽略自动收起等）。 */
export type TriggerGestureSource = 'hover' | 'focus' | 'outside-click' | 'focus-out' | 'panel-leave'

export interface TriggerGesturePolicy {
  /** 手势宿主：事件监听挂载点，也是 outside-click 判定的「内」基准。 */
  host: HTMLElement
  /** 当前 trigger 集合的动态判定；trigger 属性可在开启期间改写。 */
  hasMode(mode: OverlayTriggerMode): boolean
  isDisabled(): boolean
  isOpen(): boolean
  /** hover 进入的打开等待；0 表示立即。 */
  hoverShowDelay(): number
  /** hover 打开是否免入场动画（tooltip：已有提示在场时指针滑入相邻目标）。 */
  hoverOpensInstantly(): boolean
  /** hover 离开（trigger 与 panel 同源）的收起等待。 */
  hoverHideDelay(): number
  /**
   * focusin 时是否清空挂起的收起计时。tooltip 为 true（悬停转聚焦不打断在场提示）；
   * popover 为 false——它的收起计时一旦挂上，聚焦不取消。
   */
  cancelPendingHideOnFocusEnter(): boolean
  /** 事件是否落在宿主的 panel 内（含 portal 后的 panel）；典型实现走 handle.containsEvent。 */
  isInsidePanel(event: MouseEvent): boolean
  /** 打开请求；`instant` 由宿主解释为免入场动画。 */
  requestOpen(source: TriggerGestureSource, options: { instant: boolean }): void
  /** 收起请求；未开启时必须 no-op（否则 user-change 标记会污染下一次开合）。 */
  requestClose(source: TriggerGestureSource): void
  /**
   * 焦点离开策略。缺省：focus 手势下取消挂起的打开计时并立即收起。
   * 需要延迟复查（`:focus-within` 重判）的组件覆写之。
   */
  onFocusOut?(): void
}

export interface TriggerGestureController {
  connect(): void
  disconnect(): void
  /** trigger 集合改写时调用：清空挂起计时；监听为动态判定，无需重绑。 */
  syncTriggerChange(): void
  /** 清空挂起的 show/hide 计时（宿主 click 入口与 disabled 收敛共用）。 */
  cancelPending(): void
  /**
   * panel 上的 hover keep-alive：进入清空收起计时，离开按 `hoverHideDelay` 收起。
   * 返回解绑函数；panel 重建（portal reconfigure）后须对旧 panel 调用。
   */
  bindPanelKeepAlive(panel: HTMLElement): () => void
}

/**
 * 「click 在宿主 overlay 之内」的唯一判定：事件路径含宿主（含其 shadow root），
 * 或路径节点植根于宿主 shadow root。portal 后的 panel 不在此判定内，由调用方
 * 经 handle `containsEvent` 补齐。
 */
export function isEventInsideHost(host: HTMLElement, event: MouseEvent): boolean {
  for (const node of event.composedPath()) {
    if (node === host || node === host.shadowRoot) return true
    if (node instanceof Node && node.getRootNode() === host.shadowRoot) return true
  }
  return false
}

export function defineTriggerGestures(policy: TriggerGesturePolicy): TriggerGestureController {
  const { host } = policy

  let showTimer: ReturnType<typeof setTimeout> | undefined
  let hideTimer: ReturnType<typeof setTimeout> | undefined

  const cancelPending = () => {
    clearTimeout(showTimer)
    clearTimeout(hideTimer)
    showTimer = undefined
    hideTimer = undefined
  }

  const armHide = (source: TriggerGestureSource) => {
    hideTimer = setTimeout(() => policy.requestClose(source), policy.hoverHideDelay())
  }

  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    if (policy.isDisabled() || !policy.hasMode('hover')) return
    clearTimeout(hideTimer)
    // instant 在进入时刻判定，不等计时到点（tooltip 的 isRepeat 同此）。
    const instant = policy.hoverOpensInstantly()
    showTimer = setTimeout(() => policy.requestOpen('hover', { instant }), instant ? 0 : policy.hoverShowDelay())
  }

  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    if (policy.isDisabled() || !policy.hasMode('hover')) return
    clearTimeout(showTimer)
    armHide('hover')
  }

  const onFocusIn = (event: FocusEvent) => {
    if (policy.isDisabled() || !policy.hasMode('focus')) return
    // composedPath 在派发结束后被清空，判定必须在监听器内完成。
    const focusedElement = event.composedPath()[0] ?? event.target
    if (!(focusedElement instanceof Element) || !focusedElement.matches(':focus-visible')) return
    if (policy.cancelPendingHideOnFocusEnter()) clearTimeout(hideTimer)
    if (policy.isOpen()) return
    policy.requestOpen('focus', { instant: true })
  }

  const onFocusOut = () => {
    if (policy.onFocusOut) {
      policy.onFocusOut()
      return
    }
    if (!policy.hasMode('focus')) return
    clearTimeout(showTimer)
    policy.requestClose('focus-out')
  }

  const onDocumentClick = (event: MouseEvent) => {
    if (!policy.isOpen() || !policy.hasMode('click')) return
    // 在监听器内部判定：composedPath() 在派发结束后会被清空。宿主 shadow 内（含
    // trigger）走 isEventInsideHost；portal 后的 panel 挂在宿主 overlay 容器里，走 handle。
    if (isEventInsideHost(host, event)) return
    if (policy.isInsidePanel(event)) return
    policy.requestClose('outside-click')
  }

  return {
    connect() {
      host.addEventListener('pointerenter', onPointerEnter)
      host.addEventListener('pointerleave', onPointerLeave)
      host.addEventListener('focusin', onFocusIn)
      host.addEventListener('focusout', onFocusOut)
      document.addEventListener('click', onDocumentClick)
    },
    disconnect() {
      host.removeEventListener('pointerenter', onPointerEnter)
      host.removeEventListener('pointerleave', onPointerLeave)
      host.removeEventListener('focusin', onFocusIn)
      host.removeEventListener('focusout', onFocusOut)
      document.removeEventListener('click', onDocumentClick)
      cancelPending()
    },
    syncTriggerChange: cancelPending,
    cancelPending,
    bindPanelKeepAlive(panel: HTMLElement) {
      const onPanelEnter = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return
        if (!policy.hasMode('hover')) return
        clearTimeout(hideTimer)
      }
      const onPanelLeave = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return
        if (!policy.hasMode('hover')) return
        armHide('panel-leave')
      }
      panel.addEventListener('pointerenter', onPanelEnter)
      panel.addEventListener('pointerleave', onPanelLeave)
      return () => {
        panel.removeEventListener('pointerenter', onPanelEnter)
        panel.removeEventListener('pointerleave', onPanelLeave)
      }
    }
  }
}
