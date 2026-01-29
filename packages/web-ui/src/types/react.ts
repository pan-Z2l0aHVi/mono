import type { DetailedHTMLProps, HTMLAttributes } from 'react'

import type { WebUiBackTop, WebUiButton, WebUiLayout } from '..'
import type { ExtractProps, OmitLitBase } from './utils'
// 提取 $events 并转化为 React 的 on 事件
type ExtractReactEvents<T> = T extends { readonly $events: infer E }
  ? {
      [K in keyof E as `on${string & K}`]?: (e: E[K]) => void
    }
  : object

export type ReactWrapper<T> = DetailedHTMLProps<
  ExtractProps<OmitLitBase<T>> & ExtractReactEvents<T> & HTMLAttributes<HTMLElement>,
  HTMLElement
>

export interface WebUiComponents {
  'web-ui-button': ReactWrapper<WebUiButton>
  'web-ui-back-top': ReactWrapper<WebUiBackTop>
  'web-ui-layout': ReactWrapper<WebUiLayout>
}
