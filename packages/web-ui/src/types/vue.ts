import type { ComponentOptionsMixin, DefineComponent, EmitsToProps, HTMLAttributes, PublicProps } from 'vue'

import type { WebUiElementMap } from '../components'

import type { ComponentEvents, ExtractProps, OmitLitBase, WithHost } from './utils'

// 从 $events 提取 Vue emits：每个条目 → (e: 宿主化事件) => void。
// Vue 经 EmitsToProps 将 emits 映射为 on<Event> props，模板 @event 绑定由此解析。
type VueEmits<T extends HTMLElement> = T extends { readonly $events: infer E }
  ? { [K in keyof E]: (e: WithHost<T, E[K]>) => void }
  : Record<never, never>

// 与 emit 重名的原生 handler（如 emit input → onInput）从局部 HTMLAttributes 中排除，
// 使 @event 精确解析到 emit，不再与原生事件类型形成联合。
type VueNativeAttrs<T extends HTMLElement> = Omit<HTMLAttributes, `on${Capitalize<keyof ComponentEvents<T> & string>}`>

type VueProps<T extends HTMLElement> = ExtractProps<OmitLitBase<T>> & VueNativeAttrs<T>

// 复刻 Vue 内部 ResolveProps：组件 props + emits 派生的 on<Event> props。
// 显式传入 Props 参数，才能在 DefineComponent 尾部注入 TypeEl。
// 空 emits（无 $events 的组件）不应用 EmitsToProps，避免产生 on${string} 索引签名。
type VueResolvedProps<T extends HTMLElement> = Readonly<VueProps<T>> &
  (VueEmits<T> extends Record<string, never> ? unknown : EmitsToProps<VueEmits<T>>)

/**
 * Lit Web Component 的 Vue 包装类型。
 *
 * - Props: 组件属性 + 局部 HTMLAttributes（含原生 DOM 事件），不污染其他 Vue 组件
 * - Emits: 从 $events 提取的宿主化事件，Volar 可识别 @event 绑定
 * - TypeEl: 模板 ref/$el 类型为具体 Custom Element 实例
 * - 不再全局扩展 ComponentCustomProps
 */
export type LitVueWrapper<T extends HTMLElement> = DefineComponent<
  VueProps<T>,
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  ComponentOptionsMixin,
  ComponentOptionsMixin,
  VueEmits<T>,
  string,
  PublicProps,
  VueResolvedProps<T>,
  Record<never, never>,
  Record<never, never>,
  Record<never, never>,
  Record<never, never>,
  string,
  Record<never, never>,
  true,
  Record<never, never>,
  T
>

// Vue 从 WebUiElementMap 派生全部标签，无需手写组件清单。
export type WebUiComponents = {
  [K in keyof WebUiElementMap]: LitVueWrapper<WebUiElementMap[K]>
}

declare module 'vue' {
  // oxlint-disable-next-line typescript/no-empty-object-type
  export interface GlobalComponents extends WebUiComponents {}
}
