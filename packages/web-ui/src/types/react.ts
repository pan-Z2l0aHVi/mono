import type { DetailedHTMLProps, HTMLAttributes } from 'react'

import type {
  WebUiAvatar,
  WebUiBackTop,
  WebUiBadge,
  WebUiButton,
  WebUiButtonGroup,
  WebUiCheckbox,
  WebUiCheckboxGroup,
  WebUiContextMenu,
  WebUiDialog,
  WebUiDrawer,
  WebUiEmpty,
  WebUiDropdownDivider,
  WebUiDropdownHeader,
  WebUiDropdownItem,
  WebUiDropdownMenu,
  WebUiIcon,
  WebUiInput,
  WebUiInputNumber,
  WebUiLayout,
  WebUiOption,
  WebUiPopover,
  WebUiRadio,
  WebUiRadioGroup,
  WebUiSegmented,
  WebUiSegmentedTrigger,
  WebUiSelect,
  WebUiSlider,
  WebUiSpinner,
  WebUiTextarea,
  WebUiToast,
  WebUiSwitch,
  WebUiTooltip
} from '../components'

import type { ExtractProps, EventListeners, OmitLitBase } from './utils'
// React 通过 EventListeners<Events> + HTMLAttributes<HTMLElement> 获取事件类型
export type LitReactWrapper<T> = T extends { readonly $events: infer E }
  ? DetailedHTMLProps<ExtractProps<OmitLitBase<T>> & EventListeners<E> & HTMLAttributes<HTMLElement>, HTMLElement>
  : DetailedHTMLProps<ExtractProps<OmitLitBase<T>> & HTMLAttributes<HTMLElement>, HTMLElement>

export interface WebUiComponents {
  'web-ui-avatar': LitReactWrapper<WebUiAvatar>
  'web-ui-back-top': LitReactWrapper<WebUiBackTop>
  'web-ui-badge': LitReactWrapper<WebUiBadge>
  'web-ui-button': LitReactWrapper<WebUiButton>
  'web-ui-button-group': LitReactWrapper<WebUiButtonGroup>
  'web-ui-checkbox': LitReactWrapper<WebUiCheckbox>
  'web-ui-checkbox-group': LitReactWrapper<WebUiCheckboxGroup>
  'web-ui-context-menu': LitReactWrapper<WebUiContextMenu>
  'web-ui-dialog': LitReactWrapper<WebUiDialog>
  'web-ui-drawer': LitReactWrapper<WebUiDrawer>
  'web-ui-empty': LitReactWrapper<WebUiEmpty>
  'web-ui-dropdown-divider': LitReactWrapper<WebUiDropdownDivider>
  'web-ui-dropdown-header': LitReactWrapper<WebUiDropdownHeader>
  'web-ui-dropdown-item': LitReactWrapper<WebUiDropdownItem>
  'web-ui-dropdown-menu': LitReactWrapper<WebUiDropdownMenu>
  'web-ui-icon': LitReactWrapper<WebUiIcon>
  'web-ui-input': LitReactWrapper<WebUiInput>
  'web-ui-input-number': LitReactWrapper<WebUiInputNumber>
  'web-ui-select': LitReactWrapper<WebUiSelect>
  'web-ui-slider': LitReactWrapper<WebUiSlider>
  'web-ui-spinner': LitReactWrapper<WebUiSpinner>
  'web-ui-option': LitReactWrapper<WebUiOption>
  'web-ui-popover': LitReactWrapper<WebUiPopover>
  'web-ui-radio': LitReactWrapper<WebUiRadio>
  'web-ui-radio-group': LitReactWrapper<WebUiRadioGroup>
  'web-ui-segmented': LitReactWrapper<WebUiSegmented>
  'web-ui-segmented-trigger': LitReactWrapper<WebUiSegmentedTrigger>
  'web-ui-layout': LitReactWrapper<WebUiLayout>
  'web-ui-switch': LitReactWrapper<WebUiSwitch>
  'web-ui-textarea': LitReactWrapper<WebUiTextarea>
  'web-ui-toast': LitReactWrapper<WebUiToast>
  'web-ui-tooltip': LitReactWrapper<WebUiTooltip>
}

declare module 'react' {
  // oxlint-disable-next-line typescript/no-namespace
  namespace JSX {
    // oxlint-disable-next-line typescript/no-empty-object-type
    interface IntrinsicElements extends WebUiComponents {}
  }
}
