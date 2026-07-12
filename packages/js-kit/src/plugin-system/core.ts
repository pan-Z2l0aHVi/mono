export interface Plugin<C extends object, D extends object> {
  readonly use: <U extends object, E extends object>(plugin: Plugin<U, E>) => Plugin<C & U, D & E>
  readonly make: <T extends D>(ctx?: T) => T & C
}

export function definePlugin<C extends object, D extends object>(setup: (ctx: D) => C): Plugin<C, D> {
  function use<U extends object, E extends object>(plugin: Plugin<U, E>): Plugin<C & U, D & E> {
    return definePlugin<C & U, D & E>(ctx => {
      return plugin.make({
        ...ctx,
        ...setup(ctx)
      })
    })
  }

  function make<T extends D>(ctx = {} as T): T & C {
    return {
      ...ctx,
      ...setup(ctx)
    }
  }

  return {
    use,
    make
  }
}

/**
 * 提取插件实例化的类型 (C & D)
 * T 可以是 Plugin 实例，也可以是返回 Plugin 实例的函数
 */
export type PluginMade<T> = T extends (...args: any[]) => Plugin<infer C, infer D>
  ? C & D
  : T extends Plugin<infer C, infer D>
    ? C & D
    : never
