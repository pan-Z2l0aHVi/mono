export type Next = () => Promise<void>
export type Middleware<T = unknown> = (ctx: T, next: Next) => Promise<void>

export function compose<T = unknown>(...fns: Middleware<T>[]): Middleware<T> {
  return async function dispatch(ctx: T, next: Next, i = 0): Promise<void> {
    if (!fns.length) return next()
    const fn = fns[i]
    if (!fn) return next()
    return fn(
      ctx,
      // 为什么不是 () => dispatch(ctx, next, i + 1)？
      // 利用闭包防止中间件重复调用 next
      (() => {
        let called = false
        return async () => {
          if (called) throw new Error('Should not call "await next()" multiple times!')
          called = true
          await dispatch(ctx, next, i + 1)
        }
      })()
    )
  }
}
