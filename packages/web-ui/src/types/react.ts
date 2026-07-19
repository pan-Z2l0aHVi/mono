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

import type { ExtractProps, EventListeners, OmitLitBase } from './utils'
// React 通过 EventListeners<Events> + HTMLAttributes<HTMLElement> 获取事件类型
export type LitReactWrapper<T> = T extends { readonly $events: infer E }
  ? DetailedHTMLProps<ExtractProps<OmitLitBase<T>> & EventListeners<E> & HTMLAttributes<HTMLElement>, HTMLElement>
  : DetailedHTMLProps<ExtractProps<OmitLitBase<T>> & HTMLAttributes<HTMLElement>, HTMLElement>

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
