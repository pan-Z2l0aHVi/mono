import type { WebUiOption } from '@/components/option'
import { overlayComposition } from '@/shared/overlay/composition'

/**
 * combobox 开合与 option 交互的共享骨架（select / autocomplete）。
 *
 * 与 option-portal 的边界约定一致：交互语义的"差异点"经回调注入，
 * 这里收口两组件逐行复制的生命周期不变量——
 * - open/close 状态迁移顺序：guard → 状态翻转 → open-change 派发 →
 *   激活钩子 → scroll-lock 配对 → portal 模式的 rAF 延迟 openOverlay
 * - close 路径：before-close 钩子（portal 内容先收敛）→ 激活清理 →
 *   scroll-lock 释放 → closeOverlay（关闭后使 portal 引用失效）
 * - option 四事件监听对的绑定/解绑
 * - focusout 的 rAF :focus-within 复核
 * - 键盘导航的环绕游标算法
 */

export interface ComboboxOpenHooks {
  /** 是否允许打开（disabled / readonly 等由组件判断）。 */
  canOpen(): boolean
  getIsOpen(): boolean
  setIsOpen(open: boolean): void
  dispatchOpenChange(): void
  syncScrollLock(open: boolean): void
  /** 是否 portal 模式（决定 openOverlay 是否延迟到下一帧）。 */
  isPortal(): boolean
  openOverlay(isKeyboardNavigation: boolean): void
  closeOverlay(): void
  /** 打开时的激活项初始化（键盘导航取选中/首项，指针打开保留现状）。 */
  onOpen?(isKeyboardNavigation: boolean): void
  /** 关闭前钩子：autocomplete 需先把 light DOM 新增节点收敛进当前 portal content。 */
  onBeforeClose?(): void
  /** 关闭时清理激活状态（清 _activeIndex 与 active 属性）。 */
  onAfterClose?(): void
}

export interface ComboboxOpenController {
  open(isKeyboardNavigation?: boolean): void
  close(): void
}

export function createComboboxOpenController(hooks: ComboboxOpenHooks): ComboboxOpenController {
  function open(isKeyboardNavigation = false) {
    if (hooks.canOpen() === false || hooks.getIsOpen()) return
    hooks.setIsOpen(true)
    hooks.dispatchOpenChange()
    hooks.onOpen?.(isKeyboardNavigation)
    hooks.syncScrollLock(true)
    if (hooks.isPortal()) {
      requestAnimationFrame(() => {
        if (hooks.getIsOpen()) hooks.openOverlay(isKeyboardNavigation)
      })
    } else {
      hooks.openOverlay(isKeyboardNavigation)
    }
  }

  function close() {
    if (!hooks.getIsOpen()) return
    hooks.onBeforeClose?.()
    hooks.setIsOpen(false)
    hooks.dispatchOpenChange()
    hooks.onAfterClose?.()
    hooks.syncScrollLock(false)
    hooks.closeOverlay()
  }

  return { open, close }
}

export interface OptionListenerHandlers {
  onClick: (event: Event) => void
  onPointerOver: (event: PointerEvent) => void
  onPointerDown: (event: PointerEvent) => void
  onUpdate: () => void
}

/** option 四事件监听对的绑定/解绑；两组件的 handler 签名一致，仅实现不同。 */
export function createOptionListenerBinding(handlers: OptionListenerHandlers) {
  function bind(option: WebUiOption) {
    option.addEventListener('click', handlers.onClick)
    option.addEventListener('pointerover', handlers.onPointerOver)
    option.addEventListener('pointerdown', handlers.onPointerDown)
    option.addEventListener('option-update', handlers.onUpdate)
  }
  function unbind(option: WebUiOption) {
    option.removeEventListener('click', handlers.onClick)
    option.removeEventListener('pointerover', handlers.onPointerOver)
    option.removeEventListener('pointerdown', handlers.onPointerDown)
    option.removeEventListener('option-update', handlers.onUpdate)
  }
  return { bind, unbind }
}

/**
 * focusout 关闭复核：焦点是否真的离开了宿主与面板。
 * rAF 等待 click/pointerdown 相关的焦点迁移完成后再判定。
 */
export function handleComboboxFocusOut(
  host: HTMLElement,
  getPanel: () => HTMLElement | null | undefined,
  getIsOpen: () => boolean,
  close: () => void
): void {
  requestAnimationFrame(() => {
    const panel = getPanel()
    if (getIsOpen() && !host.matches(':focus-within') && !(panel && overlayComposition.hasFocusWithin(panel))) {
      close()
    }
  })
}

/**
 * 环绕游标：在 enabled 列表内按 delta 移动；从 -1（无激活）向下取首项、向上取末项。
 * 返回在 enabled 中的下一索引；调用方负责换算回全量 options 索引。
 */
export function nextWrappingIndex(enabledCount: number, currentIdx: number, delta: number): number {
  if (enabledCount === 0) return -1
  let nextIdx = currentIdx + delta
  if (nextIdx < 0) nextIdx = enabledCount - 1
  if (nextIdx >= enabledCount) nextIdx = 0
  return nextIdx
}
