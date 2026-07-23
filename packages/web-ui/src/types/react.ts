import type { DetailedHTMLProps, HTMLAttributes } from 'react'

import type {
  WebUiBackTop,
  WebUiButton,
  WebUiButtonGroup,
  WebUiCheckbox,
  WebUiCheckboxGroup,
  WebUiDialog,
  WebUiDrawer,
  WebUiDropdownDivider,
  WebUiDropdownHeader,
  WebUiDropdownItem,
  WebUiDropdownMenu,
  WebUiIcon,
  WebUiInput,
  WebUiInputNumber,
  WebUiLayout,
  WebUiOption,
  WebUiRadio,
  WebUiRadioGroup,
  WebUiSelect,
  WebUiSwitch,
  WebUiTooltip
} from '../components'

import type { ExtractProps, EventListeners, OmitLitBase } from './utils'
// React 通过 EventListeners<Events> + HTMLAttributes<HTMLElement> 获取事件类型
export type LitReactWrapper<T> = T extends { readonly $events: infer E }
  ? DetailedHTMLProps<ExtractProps<OmitLitBase<T>> & EventListeners<E> & HTMLAttributes<HTMLElement>, HTMLElement>
  : DetailedHTMLProps<ExtractProps<OmitLitBase<T>> & HTMLAttributes<HTMLElement>, HTMLElement>

export interface WebUiComponents {
  'web-ui-button': LitReactWrapper<WebUiButton>
  'web-ui-button-group': LitReactWrapper<WebUiButtonGroup>
  'web-ui-checkbox': LitReactWrapper<WebUiCheckbox>
  'web-ui-checkbox-group': LitReactWrapper<WebUiCheckboxGroup>
  'web-ui-dialog': LitReactWrapper<WebUiDialog>
  'web-ui-drawer': LitReactWrapper<WebUiDrawer>
  'web-ui-dropdown-divider': LitReactWrapper<WebUiDropdownDivider>
  'web-ui-dropdown-header': LitReactWrapper<WebUiDropdownHeader>
  'web-ui-dropdown-item': LitReactWrapper<WebUiDropdownItem>
  'web-ui-dropdown-menu': LitReactWrapper<WebUiDropdownMenu>
  'web-ui-icon': LitReactWrapper<WebUiIcon>
  'web-ui-input': LitReactWrapper<WebUiInput>
  'web-ui-input-number': LitReactWrapper<WebUiInputNumber>
  'web-ui-select': LitReactWrapper<WebUiSelect>
  'web-ui-option': LitReactWrapper<WebUiOption>
  'web-ui-radio': LitReactWrapper<WebUiRadio>
  'web-ui-radio-group': LitReactWrapper<WebUiRadioGroup>
  'web-ui-back-top': LitReactWrapper<WebUiBackTop>
  'web-ui-layout': LitReactWrapper<WebUiLayout>
  'web-ui-switch': LitReactWrapper<WebUiSwitch>
  'web-ui-tooltip': LitReactWrapper<WebUiTooltip>
}

declare module 'react' {
  // oxlint-disable-next-line typescript/no-namespace
  namespace JSX {
    // oxlint-disable-next-line typescript/no-empty-object-type
    interface IntrinsicElements extends WebUiComponents {}
  }
}
