export type ToastType = 'success' | 'info' | 'warning' | 'error'
export type ToastCloseReason = 'auto' | 'manual' | 'programmatic' | 'clear'
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number
  closable?: boolean
  id?: string
  heading?: string
  /** 用于解析最近 web-ui-theme 的触发元素。 */
  target?: Element
  /** 显式挂载容器，优先级高于 target 和主题作用域。 */
  container?: HTMLElement
}

export interface ToastInstanceOptions extends ToastOptions {
  position?: ToastPosition
}

/** 更新已创建 Toast 的文本内容。未传入 heading 时保留原值。 */
export interface ToastMessageUpdateOptions {
  message: string
  heading?: string
}
