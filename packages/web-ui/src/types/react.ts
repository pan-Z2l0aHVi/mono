import type { DetailedHTMLProps, HTMLAttributes } from 'react'

import type { WebUiElementMap } from '../components'

import type { ExtractProps, OmitLitBase, ReactCustomEventListeners } from './utils'

/**
 * Lit Web Component 的 React 包装类型。
 *
 * - 标准 DOM 事件（input/change/focus/blur）使用 React 惯用 camelCase handler，
 *   `currentTarget` 收窄为组件实例（`target` 遵循 React SyntheticEvent 语义，不承诺）。
 * - kebab-case 自定义事件（open-change/toast-close）生成精确的 `on<event>` 绑定。
 * - 与 `HTMLAttributes<T>` 全量交叉：组件自身属性与通用 HTML 属性（含原生事件）共存，
 *   重叠键类型相容（如 `placeholder`），组件类型在交叉中自然生效；`ref` 保持具体元素类型。
 */
export type LitReactWrapper<T extends HTMLElement> = DetailedHTMLProps<
  ExtractProps<OmitLitBase<T>> & ReactCustomEventListeners<T> & HTMLAttributes<T>,
  T
>

// React 从 WebUiElementMap 派生全部标签，无需手写组件清单。
export type WebUiComponents = {
  [K in keyof WebUiElementMap]: LitReactWrapper<WebUiElementMap[K]>
}

declare module 'react' {
  // oxlint-disable-next-line typescript/no-namespace
  namespace JSX {
    // oxlint-disable-next-line typescript/no-empty-object-type
    interface IntrinsicElements extends WebUiComponents {}
  }
}
