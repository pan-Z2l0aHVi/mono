import type { ComponentOptionsMixin, DefineComponent, HTMLAttributes } from 'vue'

import type {
  WebUiBackTop,
  WebUiButton,
  WebUiButtonGroup,
  WebUiDialog,
  WebUiDropdownDivider,
  WebUiDropdownHeader,
  WebUiDropdownItem,
  WebUiDropdownMenu,
  WebUiIcon,
  WebUiInput,
  WebUiInputNumber,
  WebUiLayout,
  WebUiOption,
  WebUiSelect,
  WebUiTooltip
} from '../components'

import type { ExtractProps, EventListeners, OmitLitBase } from './utils'

// 从 $events 提取 Vue emit 类型
// $events 格式: { input: Event, change: Event }
// Vue emits 格式: { input: (e: Event) => any }
type ExtractVueEmits<T> = T extends { readonly $events: infer E }
  ? { [K in keyof E]: (e: E[K]) => any }
  : Record<string, never>

/**
 * Lit Web Component 的 Vue 包装类型。
 *
 * - Props: 从 LitElement 推导的组件属性 + Vue HTMLAttributes（含原生 DOM 事件）
 * - Emits: 从 $events 接口提取的自定义事件，Volar 可识别 @event 绑定
 */
export type LitVueWrapper<T> = T extends { readonly $events: infer E }
  ? DefineComponent<
      ExtractProps<OmitLitBase<T>>,
      Record<string, never>,
      Record<string, never>,
      Record<string, never>,
      Record<string, never>,
      ComponentOptionsMixin,
      ComponentOptionsMixin,
      ExtractVueEmits<T>
    >
  : DefineComponent<ExtractProps<OmitLitBase<T>>>

export interface WebUiComponents {
  'web-ui-button': LitVueWrapper<WebUiButton>
  'web-ui-button-group': LitVueWrapper<WebUiButtonGroup>
  'web-ui-dialog': LitVueWrapper<WebUiDialog>
  'web-ui-dropdown-divider': LitVueWrapper<WebUiDropdownDivider>
  'web-ui-dropdown-header': LitVueWrapper<WebUiDropdownHeader>
  'web-ui-dropdown-item': LitVueWrapper<WebUiDropdownItem>
  'web-ui-dropdown-menu': LitVueWrapper<WebUiDropdownMenu>
  'web-ui-icon': LitVueWrapper<WebUiIcon>
  'web-ui-input': LitVueWrapper<WebUiInput>
  'web-ui-input-number': LitVueWrapper<WebUiInputNumber>
  'web-ui-select': LitVueWrapper<WebUiSelect>
  'web-ui-option': LitVueWrapper<WebUiOption>
  'web-ui-back-top': LitVueWrapper<WebUiBackTop>
  'web-ui-layout': LitVueWrapper<WebUiLayout>
  'web-ui-tooltip': LitVueWrapper<WebUiTooltip>
}

// === Vue Template 类型补全 ===
// Volar 通过 GlobalComponents 识别 web-ui-* 组件标签

declare module 'vue' {
  // oxlint-disable-next-line typescript/no-empty-object-type
  export interface GlobalComponents extends WebUiComponents {}

  // 为 web-ui 组件添加全部原生 DOM 事件类型
  // 使 <web-ui-input @click @mousedown @keydown> 等有类型补全
  // oxlint-disable-next-line typescript/no-empty-object-type
  interface ComponentCustomProps extends HTMLAttributes {}
}
