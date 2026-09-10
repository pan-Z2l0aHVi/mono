import { definePlugin } from '@greypan/js-kit'

/**
 * 异步 positioning 的代数令牌。一次定位请求启动前取得 generation；
 * 新请求或 close/reconfigure 后 invalidate，迟到 promise 不得再写 DOM。
 */
export interface OverlayPositioningGeneration {
  next(): number
  invalidate(): void
  isCurrent(generation: number): boolean
}

export const defineOverlayPositioningGeneration = () =>
  definePlugin<OverlayPositioningGeneration, Record<never, never>>(() => {
    let generation = 0

    return {
      next() {
        return ++generation
      },

      invalidate() {
        ++generation
      },

      isCurrent(candidate: number) {
        return candidate === generation
      }
    }
  })
