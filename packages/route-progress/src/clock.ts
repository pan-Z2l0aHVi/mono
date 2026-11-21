import { definePlugin } from '@greypan/js-kit'

export interface RouteClock {
  now: () => number
  setTimeout: (fn: () => void, ms: number) => unknown
  clearTimeout: (handle: unknown) => void
}

/** 默认时钟每次调用时才读全局，fake timers 在创建实例后安装也能生效。 */
export const defaultRouteClock: RouteClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: handle => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>)
}

/** 可注入时钟；测试传入自己的实现，业务不传。 */
export function defineRouteClock(clock: RouteClock = defaultRouteClock) {
  return definePlugin<{ clock: RouteClock }, object>(() => ({ clock }))
}
