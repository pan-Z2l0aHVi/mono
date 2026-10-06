import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { debounce } from '..'

describe('debounce 测试', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('maxWaitMs < waitMs 时立即抛错，不返回一个行为错误的 debounce', () => {
    // 两个窗口互相矛盾时静默接受会得到「永远不触发 trailing」的实例，构造期拒绝更安全
    expect(() => debounce(() => {}, { waitMs: 100, maxWaitMs: 50 })).toThrow('cannot be less than')
  })

  it('trailing：连续调用只在静默期结束后触发一次，用最后一次的参数', () => {
    const fn = vi.fn<(n: number) => void>()
    const d = debounce(fn, { waitMs: 100, timing: 'trailing' })

    d.call(1)
    d.call(2)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(2)
  })

  it('leading：首次立即触发，静默期内后续调用被吞掉', () => {
    const fn = vi.fn<(n: number) => void>()
    const d = debounce(fn, { waitMs: 100, timing: 'leading' })

    d.call(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1)

    d.call(2)
    vi.advanceTimersByTime(99)
    expect(fn).toHaveBeenCalledTimes(1)

    // 静默期结束后重新武装，下一次调用立即触发
    vi.advanceTimersByTime(1)
    d.call(3)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith(3)
  })

  it('both：窗口内首尾各触发一次，首触发用首参数、尾触发用末参数', () => {
    const fn = vi.fn<(n: number) => void>()
    const d = debounce(fn, { waitMs: 100, timing: 'both' })

    d.call(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenLastCalledWith(1)

    d.call(2)
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith(2)
  })

  it('maxWaitMs：持续调用超过上限时提前触发，不无限推迟', () => {
    // 无 maxWaitMs 时这串调用要等到最后一次调用后满 100ms 才触发——那正是
    // maxWaitMs 要防的饥饿。
    const fn = vi.fn<(n: number) => void>()
    const d = debounce(fn, { waitMs: 100, maxWaitMs: 250, timing: 'trailing' })

    for (let i = 0; i < 5; i++) {
      d.call(i)
      vi.advanceTimersByTime(80)
    }

    // 上限在 t=250 强制结算，携带触发时刻之前最后一次调用的参数（t=240 的那一次）
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenLastCalledWith(3)

    // t=320 的最后一次调用另起一个静默窗口，在 t=420 结算
    vi.advanceTimersByTime(19)
    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith(4)
  })

  it('flush 立即执行挂起的调用，并返回这次调用的返回值', () => {
    const fn = vi.fn<(n: number) => number>((n: number) => n * 2)
    const d = debounce(fn, { waitMs: 100, timing: 'trailing' })

    d.call(1)
    expect(fn).not.toHaveBeenCalled()

    // 页面卸载等场景靠 flush 拿到挂起调用的结果，因此 flush 必须返回本次的值而非旧缓存
    expect(d.flush()).toBe(2)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1)

    // 已被 flush 消费，待执行状态清空
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('flush 在没有挂起调用时返回 undefined 且不额外触发', () => {
    const fn = vi.fn<(n: number) => number>((n: number) => n * 2)
    const d = debounce(fn, { waitMs: 100, timing: 'trailing' })

    expect(d.flush()).toBeUndefined()
    expect(fn).not.toHaveBeenCalled()
  })

  it('cancel 丢弃挂起调用并复位，之后的调用重新按完整窗口等待', () => {
    const fn = vi.fn<(n: number) => void>()
    const d = debounce(fn, { waitMs: 100, timing: 'trailing' })

    d.call(1)
    d.cancel()
    vi.advanceTimersByTime(200)
    expect(fn).not.toHaveBeenCalled()
    expect(d.isPending).toBe(false)

    d.call(2)
    vi.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenLastCalledWith(2)
  })

  it('isPending 精确反映挂起状态', () => {
    const fn = vi.fn<(n: number) => void>()
    const d = debounce(fn, { waitMs: 100, timing: 'trailing' })

    expect(d.isPending).toBe(false)
    d.call(1)
    expect(d.isPending).toBe(true)

    vi.advanceTimersByTime(99)
    expect(d.isPending).toBe(true)

    vi.advanceTimersByTime(1)
    expect(d.isPending).toBe(false)
  })

  it('cachedValue 返回最近一次已触发调用的返回值', () => {
    const fn = vi.fn<(n: number) => number>((n: number) => n * 2)
    const d = debounce(fn, { waitMs: 100, timing: 'leading' })

    expect(d.cachedValue).toBeUndefined()
    d.call(2)
    expect(d.cachedValue).toBe(4)
  })
})
