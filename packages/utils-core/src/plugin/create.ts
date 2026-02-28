/**
 * @example
 * const pina = createPlugin('pina', ctx => ({
 *   store: { a: 1, b: 2 },
 *   setA(v: number) {
 *     ctx.pina.store.a = v
 *   }
 * }))
 * const logger = createPlugin('logger', () => ({
 *   log: (m: string) => console.log(m)
 * }))
 * const appPlugin = createPlugin(app', () => ({
 *   version: '1.0.1'
 * }))
 *   .use(pina)
 *   .use(logger)
 * const app = make(appPlugin)
 *
 * console.log(app.version) // 1.0.1
 * app.ctx.pina.setA(42)
 * console.log(app.ctx.pina.store.a) // 42
 * app.ctx.logger.log('hello')
 * console.log(app.ctx.pina.store) // { a: 42, b: 2 }
 */

export type Context = Record<string, unknown>

export interface Plugin<N extends string, T extends object, E extends Context> {
  readonly name: N
  readonly setup: (ctx: E & Record<N, T>) => T
  readonly _init: (targetCtx: Record<string, unknown>, loadingStack?: Set<string>) => T
  use<M extends string, U extends object, V extends Context>(plugin: Plugin<M, U, V>): Plugin<N, T, E & Record<M, U>>
}

export function createPlugin<N extends string, T extends object, E extends Context = Record<string, never>>(
  name: N,
  setup: (ctx: E & Record<N, T>) => T
): Plugin<N, T, E> {
  const dependencies: Plugin<string, any, any>[] = []

  const inst: Plugin<N, T, E> = {
    name,
    setup,
    use<M extends string, U extends object, V extends Context>(plugin: Plugin<M, U, V>) {
      dependencies.push(plugin)
      return inst as Plugin<N, T, E & Record<M, U>>
    },
    _init(targetCtx, loadingStack = new Set()) {
      if (targetCtx[name]) return targetCtx[name] as T

      if (loadingStack.has(name)) {
        throw new Error(`Circular dependency: ${name}`)
      }
      loadingStack.add(name)

      for (const dep of dependencies) {
        dep._init(targetCtx, loadingStack)
      }

      const instance = setup(targetCtx as E & Record<N, T>)
      targetCtx[name] = instance

      loadingStack.delete(name)
      return instance
    }
  }

  return inst
}
