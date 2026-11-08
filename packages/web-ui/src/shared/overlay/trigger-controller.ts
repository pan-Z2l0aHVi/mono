/**
 * overlay 开合状态机：手势路由、hover 计时、焦点/外点收起与程序式入口。
 *
 * tooltip / popover / dropdown / select / autocomplete 共用同一套判定：
 *
 * - `trigger` 里的手势决定哪些事件能开合；`none` 只接受 `show()` / `hide()` 与 `open`。
 * - hover 的 show/hide 计时用组件给的 delay，其余手势立即生效。只有 hover 来源的
 *   开合走延迟，这样点击与键盘不会因为 hover 配置而变慢。
 * - hover 收起要求指针离开 trigger 与 panel；启用 focus 时，焦点也须离开。
 *   失焦关闭仅在启用 focus 时生效。
 * - 点 trigger 一律切换；autocomplete 的输入框点击只开不关（`clickOpensOnly`）。
 * - 外点仅对 click 生效，Escape 对所有非 `none` 层生效；`none` 既不响应也不拦截 Escape
 *   （仲裁策略由 `arbitration()` 给出）。
 * - `requestOpen` 带 `automatic` 标记：手势与键盘来源为 true，程序式与声明式为 false。
 *   宿主据此只拦截自动来源，`show()` 与直接写 `open` 始终能开。
 *
 * 组件仍持有 reactive 的 open 状态：这里只决定「何时请求打开/收起」，并通过
 * `requestOpen` / `requestClose` 把来源、是否 instant 与是否派发 `open-change` 交给宿主。
 * 声明式写入（直接赋值 `open`）走 `applyDeclarativeOpen`：静默、不派发事件。
 */
import { hasTriggerGesture, isTriggerNone, type OverlayTriggerGesture } from '@/shared/overlay/trigger-props'

import type { OverlayArbitration } from './open-overlay'

export type TriggerOpenSource =
  | OverlayTriggerGesture
  | 'outside-click'
  | 'focus-out'
  | 'panel-leave'
  | 'imperative'
  | 'declarative'

export interface TriggerOpenMeta {
  source: TriggerOpenSource
  /** 手势或键盘来源；程序式与声明式入口为 false，不受内容门控。 */
  automatic: boolean
  /** 打开时是否免入场动画。 */
  instant: boolean
  /** 是否派发 `open-change`。声明式写入为 false。 */
  notify: boolean
}

export interface TriggerCloseMeta {
  source: TriggerOpenSource
  /** 是否派发 `open-change`。 */
  notify: boolean
}

/** 自动来源指用户手势与键盘；`show()`、`toggle()` 与声明式写入不受内容门控。 */
export function isAutomaticOpenSource(source: TriggerOpenSource): boolean {
  return source !== 'imperative' && source !== 'declarative'
}

export interface TriggerControllerPolicy {
  /** 手势宿主：事件监听挂载点，也是 outside-click / focus 判定的「内」基准。 */
  host: HTMLElement
  /** 当前规范串；trigger 属性可在开启期间改写。 */
  getTrigger(): string
  isDisabled(): boolean
  /** 额外打开条件（readonly 等）。声明式与程序式都受它约束。 */
  canOpen(): boolean
  getOpen(): boolean
  getShowDelay(): number
  getHideDelay(): number
  /** hover 打开是否免入场动画（tooltip：已有提示在场时指针滑入相邻目标）。 */
  hoverOpensInstantly(): boolean
  /** 事件是否落在 panel 内（含 portal 后的 panel 与子层）；通常走 handle.containsEvent。 */
  isInsidePanel(event: Event): boolean
  /** 焦点是否仍在宿主或 panel 内（含 portal）。 */
  hasFocusWithin(): boolean
  /** 打开请求；宿主负责 idempotence 与渲染副作用。 */
  requestOpen(meta: TriggerOpenMeta): void
  /** 收起请求；宿主负责 idempotence。 */
  requestClose(meta: TriggerCloseMeta): void
  /** 缺省 true。menu 自己维护 outside-click 守卫时关掉。 */
  outsideClick?: boolean
  /** 缺省 true。menu 自己维护 focusout 关闭时关掉。 */
  focusOut?: boolean
  /** 缺省 false。autocomplete 的输入框点击只开不关。 */
  clickOpensOnly?: boolean
}

export interface TriggerController {
  connect(): void
  disconnect(): void
  /** trigger 集合改写时调用：清空挂起计时；监听为动态判定，无需重绑。 */
  syncTriggerChange(): void
  /** 清空挂起的 show/hide 计时与焦点复核。 */
  cancelPending(): void
  /** 命令式打开：派发 `open-change`。`none` 下同样可用。 */
  show(options?: { instant?: boolean }): void
  /** 命令式收起：派发 `open-change`。 */
  hide(options?: { instant?: boolean }): void
  toggle(options?: { instant?: boolean }): void
  /** 声明式写入 open：静默，不派发 `open-change`。 */
  applyDeclarativeOpen(open: boolean): void
  /** trigger 点击路由。 */
  handleTriggerClick(event: MouseEvent): void
  /**
   * panel 上的 hover keep-alive 与焦点复核：进入清空收起计时，离开按 hide delay 收起。
   * 返回解绑函数；panel 重建（portal reconfigure）后须对旧 panel 调用。
   */
  bindPanelKeepAlive(panel: HTMLElement): () => void
  /** 本层是否参与 Escape 仲裁：`none` 不参与。 */
  arbitration(): OverlayArbitration
}

/**
 * 「click 在宿主 overlay 之内」的唯一判定：事件路径含宿主（含其 shadow root），
 * 或路径节点植根于宿主 shadow root。portal 后的 panel 不在此判定内，由调用方
 * 经 handle `containsEvent` 补齐。
 */
export function isEventInsideHost(host: HTMLElement, event: Event): boolean {
  for (const node of event.composedPath()) {
    if (node === host || node === host.shadowRoot) return true
    if (node instanceof Node && node.getRootNode() === host.shadowRoot) return true
  }
  return false
}

export function defineTriggerController(policy: TriggerControllerPolicy): TriggerController {
  const { host } = policy

  let showTimer: ReturnType<typeof setTimeout> | undefined
  let hideTimer: ReturnType<typeof setTimeout> | undefined
  let focusCheckFrame: number | undefined
  let hovering = false
  let focusWithin = false

  const clearShowTimer = () => {
    clearTimeout(showTimer)
    showTimer = undefined
  }

  const clearHideTimer = () => {
    clearTimeout(hideTimer)
    hideTimer = undefined
  }

  const cancelFocusCheck = () => {
    if (focusCheckFrame !== undefined) cancelAnimationFrame(focusCheckFrame)
    focusCheckFrame = undefined
  }

  const cancelPending = () => {
    clearShowTimer()
    clearHideTimer()
    cancelFocusCheck()
  }

  const isNone = () => isTriggerNone(policy.getTrigger())

  const canApply = () => !policy.isDisabled() && policy.canOpen()

  const requestOpen = (source: TriggerOpenSource, instant: boolean, notify: boolean) => {
    if (policy.getOpen() || !canApply()) return
    policy.requestOpen({ source, automatic: isAutomaticOpenSource(source), instant, notify })
  }

  const requestClose = (source: TriggerOpenSource, notify = true) => {
    if (!policy.getOpen()) return
    policy.requestClose({ source, notify })
  }

  const focusKeepsOpen = () => focusWithin && hasTriggerGesture(policy.getTrigger(), 'focus')

  const armHide = (source: 'hover' | 'panel-leave') => {
    clearHideTimer()
    hideTimer = setTimeout(
      () => {
        hideTimer = undefined
        if (!policy.getOpen() || policy.isDisabled() || isNone()) return
        if (hovering || focusKeepsOpen()) return
        requestClose(source)
      },
      Math.max(0, policy.getHideDelay())
    )
  }

  const scheduleShow = () => {
    if (policy.getOpen() || !canApply()) return
    const instant = policy.hoverOpensInstantly()
    showTimer = setTimeout(
      () => {
        showTimer = undefined
        if (!hovering || !hasTriggerGesture(policy.getTrigger(), 'hover')) return
        requestOpen('hover', instant, true)
      },
      instant ? 0 : Math.max(0, policy.getShowDelay())
    )
  }

  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    if (policy.isDisabled() || !hasTriggerGesture(policy.getTrigger(), 'hover')) return
    hovering = true
    clearHideTimer()
    clearShowTimer()
    scheduleShow()
  }

  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return
    hovering = false
    clearShowTimer()
    if (!hasTriggerGesture(policy.getTrigger(), 'hover')) return
    if (policy.getOpen() && !focusKeepsOpen()) armHide('hover')
  }

  const isFocusVisible = (event: FocusEvent) => {
    // composedPath 在派发结束后被清空，判定必须在监听器内完成。
    const focused = event.composedPath()[0] ?? event.target
    return focused instanceof Element && focused.matches(':focus-visible')
  }

  const onFocusIn = (event: FocusEvent) => {
    if (policy.isDisabled() || isNone()) return
    focusWithin = true
    if (focusKeepsOpen()) clearHideTimer()
    if (!hasTriggerGesture(policy.getTrigger(), 'focus')) return
    if (!isFocusVisible(event)) return
    requestOpen('focus', true, true)
  }

  const scheduleFocusCheck = () => {
    cancelFocusCheck()
    focusCheckFrame = requestAnimationFrame(() => {
      focusCheckFrame = undefined
      if (!policy.getOpen() || policy.isDisabled() || !hasTriggerGesture(policy.getTrigger(), 'focus')) return
      if (policy.hasFocusWithin()) {
        focusWithin = true
        return
      }
      focusWithin = false
      requestClose('focus-out')
    })
  }

  const onFocusOut = () => {
    if (policy.focusOut === false) return
    if (policy.isDisabled() || !hasTriggerGesture(policy.getTrigger(), 'focus')) return
    focusWithin = false
    clearShowTimer()
    scheduleFocusCheck()
  }

  const onDocumentClick = (event: MouseEvent) => {
    if (policy.outsideClick === false) return
    if (policy.isDisabled() || !hasTriggerGesture(policy.getTrigger(), 'click') || !policy.getOpen()) return
    // 在监听器内部判定：composedPath() 在派发结束后会被清空。
    if (isEventInsideHost(host, event)) return
    if (policy.isInsidePanel(event)) return
    requestClose('outside-click')
  }

  const handleTriggerClick = (event: MouseEvent) => {
    if (policy.isDisabled() || isNone()) return
    if (!hasTriggerGesture(policy.getTrigger(), 'click')) return
    cancelPending()
    if (policy.getOpen()) {
      if (!policy.clickOpensOnly) requestClose('click')
      return
    }
    requestOpen('click', event.detail === 0, true)
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
      hovering = false
      focusWithin = false
    },
    syncTriggerChange: cancelPending,
    cancelPending,
    show(options) {
      cancelPending()
      requestOpen('imperative', options?.instant ?? false, true)
    },
    hide() {
      cancelPending()
      requestClose('imperative')
    },
    toggle(options) {
      if (policy.getOpen()) this.hide()
      else this.show(options)
    },
    applyDeclarativeOpen(open) {
      cancelPending()
      if (!open) {
        requestClose('declarative', false)
        return
      }
      requestOpen('declarative', false, false)
    },
    handleTriggerClick,
    bindPanelKeepAlive(panel: HTMLElement) {
      const onPanelEnter = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return
        if (!hasTriggerGesture(policy.getTrigger(), 'hover')) return
        hovering = true
        clearHideTimer()
      }
      const onPanelLeave = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return
        if (!hasTriggerGesture(policy.getTrigger(), 'hover')) return
        hovering = false
        if (policy.getOpen() && !focusKeepsOpen()) armHide('panel-leave')
      }
      const onPanelFocusIn = () => {
        if (policy.isDisabled() || isNone()) return
        focusWithin = true
        if (focusKeepsOpen()) clearHideTimer()
      }
      const onPanelFocusOut = () => {
        if (policy.focusOut === false) return
        if (policy.isDisabled() || !hasTriggerGesture(policy.getTrigger(), 'focus')) return
        scheduleFocusCheck()
      }
      panel.addEventListener('pointerenter', onPanelEnter)
      panel.addEventListener('pointerleave', onPanelLeave)
      panel.addEventListener('focusin', onPanelFocusIn)
      panel.addEventListener('focusout', onPanelFocusOut)
      return () => {
        panel.removeEventListener('pointerenter', onPanelEnter)
        panel.removeEventListener('pointerleave', onPanelLeave)
        panel.removeEventListener('focusin', onPanelFocusIn)
        panel.removeEventListener('focusout', onPanelFocusOut)
      }
    },
    arbitration() {
      return isNone() ? 'none' : 'escape'
    }
  }
}
