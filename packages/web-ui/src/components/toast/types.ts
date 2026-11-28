export type ToastType = 'success' | 'info' | 'warning' | 'error'
export type ToastCloseReason = 'auto' | 'manual' | 'programmatic' | 'clear'
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface ToastOptions {
  /** 正文；可省略。快捷入口的第一个字符串参数写进 heading，正文留给可选细节。 */
  message?: string
  type?: ToastType
  duration?: number
  closable?: boolean
  // 合并键：传入相同 id 的后续调用更新同一条 toast，而不是再建一条。
  id?: string
  /** 标题（粗体单行）；`toast.success/info/warning/error(text)` 的 text 写在这里。 */
  heading?: string
  // 用于解析最近 web-ui-theme 的触发元素。
  target?: Element
  // 显式挂载容器，优先级高于 target 和主题作用域。
  container?: HTMLElement
}

export interface ToastInstanceOptions extends ToastOptions {
  position?: ToastPosition
}
