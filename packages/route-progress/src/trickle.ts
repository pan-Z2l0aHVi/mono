import { definePlugin } from '@greypan/js-kit'

export interface RouteTrickle {
  /** 初始可见值：显示瞬间的起点，避免 0% 的空条。 */
  readonly initial: number
  /** 渐近上限，done 之前永不超过。 */
  readonly ceiling: number
  readonly intervalMs: number
  next: (value: number) => number
}

export interface RouteTrickleOptions {
  initial?: number
  ceiling?: number
  intervalMs?: number
}

/**
 * 非匀速缓动（先快后慢的渐近线算法）：
 * - 前段快速推进以给出明确的响应反馈，越接近 ceiling（默认 90%）阻尼越大、步幅按比例衰减；
 * - 严格渐近逼近 `ceiling`（`value + (ceiling - value) * factor`），绝不匀速推进后在 99% 卡死。
 */
export function defineRouteTrickle(options: RouteTrickleOptions = {}) {
  const { initial = 12, ceiling = 90, intervalMs = 200 } = options
  const trickle: RouteTrickle = {
    initial,
    ceiling,
    intervalMs,
    next(value) {
      if (value >= ceiling) return ceiling
      const remaining = ceiling - value
      // 分段阻尼系数：前段快（22% 剩余量），中段缓（12%），末段渐近微移（5%），天然永不越界。
      const factor = value < 45 ? 0.22 : value < 75 ? 0.12 : 0.05
      const nextValue = value + remaining * factor
      return nextValue >= ceiling - 0.05 ? ceiling : Number(nextValue.toFixed(2))
    }
  }
  return definePlugin<{ trickle: RouteTrickle }, object>(() => ({ trickle }))
}
