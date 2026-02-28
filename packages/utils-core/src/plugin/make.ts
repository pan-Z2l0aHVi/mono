import { type Context, type Plugin } from './create'

export type PluginInstance<N extends string, T extends object, E extends Context> = T & {
  readonly ctx: E & Record<N, T>
}

// 直接实例化当前插件
// 能够调用当前插件提供的所有属性和方法
export function make<N extends string, T extends object, E extends Context>(
  plugin: Plugin<N, T, E>
): PluginInstance<N, T, E> {
  const runtimeCtx: Record<string, unknown> = {}

  plugin._init(runtimeCtx)

  const instance = runtimeCtx[plugin.name]

  if (!instance) {
    throw new Error(`[Plugin Error] 插件 ${plugin.name} 初始化失败，未能在上下文中找到实例。`)
  }

  if (typeof instance === 'object' && instance !== null) {
    Object.defineProperty(instance, 'ctx', {
      value: runtimeCtx,
      enumerable: false,
      writable: false,
      configurable: true
    })
  }

  return instance as PluginInstance<N, T, E>
}
