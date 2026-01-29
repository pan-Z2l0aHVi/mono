import type { DefineComponent } from 'vue'

import type { WebUiBackTop, WebUiButton, WebUiLayout } from '..'
import type { ExtractProps, OmitLitBase } from './utils'

// 提取 $events 并转化为 Vue on 事件
// 使用 Capitalize 让事件在 Vue 模板中获得更好的驼峰/短横线兼容支持
// 例如：识别 onVisibleChange 或 onVisible-change 格式
type ExtractVueEvents<T> = T extends { readonly $events: infer E }
  ? {
      [K in keyof E as `on${Capitalize<string & K>}`]?: (e: E[K]) => void
    }
  : object

export type VueWrapper<T> = DefineComponent<ExtractProps<OmitLitBase<T>> & ExtractVueEvents<T>>

export interface WebUiComponents {
  'web-ui-button': VueWrapper<WebUiButton>
  'web-ui-back-top': VueWrapper<WebUiBackTop>
  'web-ui-layout': VueWrapper<WebUiLayout>
}
