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
