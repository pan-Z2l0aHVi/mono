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

/** 渐近式伪进度：每步走剩余距离的 10%，至少 0.5，永不越过 ceiling。 */
export function defineRouteTrickle(options: RouteTrickleOptions = {}) {
  const { initial = 8, ceiling = 90, intervalMs = 200 } = options
  const trickle: RouteTrickle = {
    initial,
    ceiling,
    intervalMs,
    next: value => Math.min(ceiling, value + Math.max(0.5, (ceiling - value) * 0.1))
  }
  return definePlugin<{ trickle: RouteTrickle }, object>(() => ({ trickle }))
}
