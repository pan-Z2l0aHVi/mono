import type { DetailedHTMLProps, HTMLAttributes } from 'react'

import type {
  WebUiBackTop,
  WebUiButton,
  WebUiButtonGroup,
  WebUiDialog,
  WebUiIcon,
  WebUiInput,
  WebUiInputNumber,
  WebUiLayout
} from '../components'

import type { ExtractProps, OmitLitBase } from './utils'
// 提取 $events 并转化为 React 的 on 事件
type ExtractReactEvents<T> = T extends { readonly $events: infer E }
  ? {
      [K in keyof E as `on${string & K}`]?: (e: E[K]) => void
    }
  : object

export type LitReactWrapper<T> = DetailedHTMLProps<
  ExtractProps<OmitLitBase<T>> & ExtractReactEvents<T> & HTMLAttributes<HTMLElement>,
  HTMLElement
>

export interface WebUiComponents {
  'web-ui-button': LitReactWrapper<WebUiButton>
  'web-ui-button-group': LitReactWrapper<WebUiButtonGroup>
  'web-ui-dialog': LitReactWrapper<WebUiDialog>
  'web-ui-icon': LitReactWrapper<WebUiIcon>
  'web-ui-input': LitReactWrapper<WebUiInput>
  'web-ui-input-number': LitReactWrapper<WebUiInputNumber>
  'web-ui-back-top': LitReactWrapper<WebUiBackTop>
  'web-ui-layout': LitReactWrapper<WebUiLayout>
}

declare module 'react' {
  // oxlint-disable-next-line typescript/no-namespace
  namespace JSX {
    // oxlint-disable-next-line typescript/no-empty-object-type
    interface IntrinsicElements extends WebUiComponents {}
  }
}
