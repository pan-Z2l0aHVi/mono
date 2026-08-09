export * from '@/components/avatar'
export * from '@/components/back-top'
export * from '@/components/badge'
export * from '@/components/button'
export * from '@/components/button-group'
export * from '@/components/checkbox'
export * from '@/components/checkbox-group'
export * from '@/components/context-menu'
export * from '@/components/dialog'
export * from '@/components/drawer'
export * from '@/components/dropdown-divider'
export * from '@/components/dropdown-header'
export * from '@/components/dropdown-item'
export * from '@/components/dropdown'
export * from '@/components/empty'
export * from '@/components/icon'
export * from '@/components/input'
export * from '@/components/input-number'
export * from '@/components/layout'
export * from '@/components/option'
export * from '@/components/popover'
export * from '@/components/radio'
export * from '@/components/radio-group'
export * from '@/components/segmented'
export * from '@/components/segmented-trigger'
export * from '@/components/select'
export * from '@/components/slider'
export * from '@/components/spinner'
export * from '@/components/textarea'
export * from '@/components/theme'
export * from '@/components/toast'
export * from '@/components/svg-draw-lines'
export * from '@/components/switch'
export * from '@/components/tooltip'

// 公共事件类型：供 Vue 命名 handler 等无法从上下文推导 $event 的位置显式标注。
export type { WebUiEvent } from '@/types/utils'

// 从各组件模块的 HTMLElementTagNameMap 全局声明派生全部 web-ui 标签映射。
// 框架类型适配器（React/Vue）通过 mapped type 生成组件标签，无需手写组件清单。
export type WebUiElementMap = {
  [K in keyof HTMLElementTagNameMap as K extends `web-ui-${string}` ? K : never]: HTMLElementTagNameMap[K]
}
