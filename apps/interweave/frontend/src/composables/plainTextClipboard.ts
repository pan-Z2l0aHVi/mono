/**
 * 「复制为纯文本 / 粘贴为纯文本」的 WebView 侧动作。
 *
 * 选区与插入点只在 WebView 里可见，Go 读不到；剪贴板的系统写入/读取则统一走 Go，
 * 避免 WebView 的 navigator.clipboard 受安全上下文与权限约束。分工因此是：
 * 复制 = 前端取选区 + Go 写剪贴板，粘贴 = Go 读剪贴板 + 前端插入到焦点处。
 */

/** 当前文档里是否有可编辑的焦点目标；没有就不能「插到光标处」。 */
const EDITABLE_SELECTOR = 'input, textarea, [contenteditable="true"], [contenteditable=""]'

/**
 * 取当前选区文本。
 *
 * 先看焦点：web-ui 的编辑控件封在自己的 shadow root 里，`document.activeElement` 只会
 * 是 host，必须下钻到 `shadowRoot.activeElement` 才拿得到那个 input/textarea 的选区。
 * 只有焦点不在文本控件上时才退回 `window.getSelection()`（页面正文的选区）。
 */
export function readSelectionText(root: Document = document): string {
  const active = deepestActiveElement(root)
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    const start = active.selectionStart ?? 0
    const end = active.selectionEnd ?? 0
    return active.value.slice(start, end)
  }
  return root.getSelection()?.toString() ?? ''
}

/** 沿着 shadow root 的 activeElement 链下钻，拿到真正持有焦点的元素。 */
export function deepestActiveElement(root: Document = document): Element | null {
  let current: Element | null = root.activeElement
  while (current?.shadowRoot?.activeElement) current = current.shadowRoot.activeElement
  return current
}

/**
 * 判断焦点是否落在可编辑元素上。用同一条下钻链：编辑控件封在 web-ui 的 shadow root 里，
 * activeElement 只会是 shadow host，host 上的 closest() 不跨 shadow 边界。
 */
export function hasEditableFocus(root: Document = document): boolean {
  const active = deepestActiveElement(root)
  return active instanceof HTMLElement && (active.isContentEditable || active.matches(EDITABLE_SELECTOR))
}

/**
 * 把文本插到当前焦点处。只在 hasEditableFocus 为真时调用：
 * execCommand('insertText') 在没有可编辑目标时会静默失败，那是「什么都没发生」，
 * 调用方需要提前给出提示。
 *
 * 用 execCommand 而不是 ClipboardEvent 合成：合成事件需要 DataTransfer 写入权限，
 * 而 execCommand 的 insertText 仍被 Chromium / WebKit 支持，且会正常进入 undo 栈。
 */
export function insertTextAtFocus(text: string, root: Document = document): boolean {
  if (!hasEditableFocus(root)) return false
  return root.execCommand('insertText', false, text)
}
