import type { LitElement } from 'lit'

type Fn = (...args: unknown[]) => unknown

/**
 * 1. 移除属性中的函数
 * 2. 移除 $events 虚拟属性
 * 3. 属性全部设为可选（符合 web component 标准）
 */
export type ExtractProps<T> = {
  [K in keyof T as T[K] extends Fn ? never : K extends '$events' ? never : K]?: T[K]
}

export type OmitLitBase<T> = Omit<T, keyof HTMLElement | keyof LitElement>

/**
 * 从组件 `$events` 接口提取公共事件映射。
 * 无 `$events` 的组件（无公共事件）得到空映射。
 */
export type ComponentEvents<T> = T extends { readonly $events: infer E } ? E : Record<never, never>

/**
 * 事件宿主化：在事件本体上注入组件实例 target/currentTarget 类型。
 * 浏览器组合事件在宿主上重定向后，`event.target` 恒等于宿主元素，因此该收窄零例外。
 * target/currentTarget 标为 readonly，与 DOM `Event` 契约一致。
 */
export type WithHost<T extends EventTarget, E> = E extends Event
  ? E & { readonly target: T; readonly currentTarget: T }
  : E

/**
 * 组件宿主化事件映射：`$events` 的每个条目都收窄 target/currentTarget 到组件实例。
 * React 自定义事件与 Vue emits 均从该映射生成 handler 类型。
 */
export type HostEventMap<T extends HTMLElement> = {
  [K in keyof ComponentEvents<T>]: WithHost<T, ComponentEvents<T>[K]>
}

/**
 * 组件 `$events` 中的 string 事件名。
 * 无公共事件或仅有非 string 键的组件得到 `never`。
 */
export type WebUiEventName<T extends HTMLElement> = keyof ComponentEvents<T> & string

/**
 * 具名 handler 的显式事件类型，用于 Vue 命名 handler 等无法从上下文推导 `$event` 的位置。
 * 用法：`function onChange(e: WebUiEvent<WebUiSelect, 'change'>)`
 */
export type WebUiEvent<T extends HTMLElement, K extends WebUiEventName<T>> = HostEventMap<T>[K]

/**
 * React 自定义事件（kebab-case 事件名）→ `on<event>` 绑定。
 * 标准 DOM 事件（input/change/focus/blur）由 React 的 camelCase handler 提供，
 * 不在适配层生成 lowercase 别名。
 */
export type ReactCustomEventListeners<T extends HTMLElement> = {
  [K in keyof HostEventMap<T> & string as K extends `${string}-${string}` ? `on${K}` : never]?: (
    e: HostEventMap<T>[K]
  ) => void
}
