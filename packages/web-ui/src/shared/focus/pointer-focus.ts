/**
 * 指针输入期间的 focus ring 抑制。
 *
 * Safari 等浏览器在 pointer 点击后仍可能让 `:focus-visible` 命中新聚焦元素，
 * 导致点击打开 drawer/dialog 时内部按钮自动出现 focus ring。这里记录最近一次
 * 指针输入，并在 focusin 时给聚焦元素打 `data-wui-pointer-focus` 标记；组件样式
 * 用该标记将 focus ring 透明化，键盘导航（Tab/方向键等）会清除标记并恢复可见。
 */

const POINTER_FOCUS_WINDOW_MS = 1000

let installed = false
let lastPointerAt = 0
let pointerActive = false

function markPointer() {
  pointerActive = true
  lastPointerAt = Date.now()
}

function markKeyboard() {
  pointerActive = false
  lastPointerAt = 0
}

function onPointerDown() {
  markPointer()
}

function onKeyDown(event: KeyboardEvent) {
  if (
    event.key === 'Tab' ||
    event.key.startsWith('Arrow') ||
    event.key === 'Enter' ||
    event.key === ' ' ||
    event.key === 'Home' ||
    event.key === 'End' ||
    event.key === 'PageUp' ||
    event.key === 'PageDown'
  ) {
    markKeyboard()
  }
}

function onFocusIn(event: FocusEvent) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return

  if (pointerActive && Date.now() - lastPointerAt <= POINTER_FOCUS_WINDOW_MS) {
    target.dataset.wuiPointerFocus = 'true'
    const root = target.getRootNode()
    if (root instanceof ShadowRoot && root.host instanceof HTMLElement) {
      root.host.dataset.wuiPointerFocus = 'true'
    }
  } else {
    target.removeAttribute('data-wui-pointer-focus')
    const root = target.getRootNode()
    if (root instanceof ShadowRoot && root.host instanceof HTMLElement) {
      root.host.removeAttribute('data-wui-pointer-focus')
    }
  }
}

/**
 * 安装一次全局 pointer/keyboard/focus 监听。重复调用幂等。
 */
export function installPointerFocusSuppression(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {}
  if (installed) return () => {}
  installed = true

  // 只用 document 一份 capture 监听：shadow DOM 内的 pointerdown/keydown/focusin
  // 都会 composed 冒泡到 document，避免 window/document 双份导致同一事件处理两次。
  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('keydown', onKeyDown, true)
  document.addEventListener('focusin', onFocusIn, true)

  return () => {
    installed = false
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('keydown', onKeyDown, true)
    document.removeEventListener('focusin', onFocusIn, true)
  }
}

/**
 * 测试辅助：清除指针输入状态，避免用例间泄漏。
 */
export function resetPointerFocusState(): void {
  markKeyboard()
}
