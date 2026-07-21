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
 * kebab-case 转 PascalCase
 * 'visible-change' → 'VisibleChange'
 * 'input' → 'Input'
 */
type KebabToPascal<S extends string> = S extends `${infer P}-${infer Q}`
  ? `${Capitalize<P>}${KebabToPascal<Q>}`
  : Capitalize<S>

/**
 * 将 EventMap 转换为 on* 事件监听器类型
 * 例如 { input: Event } → { onInput?: (e: Event) => void }
 *      { 'visible-change': CustomEvent<...> } → { onVisibleChange?: (e: CustomEvent<...>) => void }
 */
export type EventListeners<T> = {
  [K in keyof T & string as `on${KebabToPascal<K>}`]?: (e: T[K]) => void
}
