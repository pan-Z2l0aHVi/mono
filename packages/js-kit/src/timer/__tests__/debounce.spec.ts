import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { debounce } from '..'

describe('debounce 测试', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('maxWaitMs < waitMs 时抛错', () => {
    expect(() => debounce(() => {}, { waitMs: 100, maxWaitMs: 50 })).toThrow('cannot be less than')
  })

  it('trailing 模式：静默期后触发最后一次调用', () => {
    const fn = vi.fn<(n: number) => void>()
    const d = debounce(fn, { waitMs: 100, timing: 'trailing' })

    d.call(1)
    d.call(2)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(2)
  })

  it('leading 模式：立即触发，静默期内不重复', () => {
    const fn = vi.fn<(n: number) => void>()
    const d = debounce(fn, { waitMs: 100, timing: 'leading' })

    d.call(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1)

    d.call(2)
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1) // 静默期内不重复

    vi.advanceTimersByTime(50)
    d.call(3)
    expect(fn).toHaveBeenCalledTimes(2) // 静默期结束后再次触发
  })

  it('both 模式：leading 与 trailing 都触发', () => {
    const fn = vi.fn<(n: number) => void>()
    const d = debounce(fn, { waitMs: 100, timing: 'both' })

    d.call(1)
    expect(fn).toHaveBeenCalledTimes(1) // leading 立即触发

    d.call(2)
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2) // trailing 触发最后一次
    expect(fn).toHaveBeenLastCalledWith(2)
  })

  it('flush 立即执行挂起的调用并返回缓存值', () => {
    const fn = vi.fn<(n: number) => number>(() => 42)
    const d = debounce(fn, { waitMs: 100, timing: 'trailing' })

    d.call(1)
    expect(fn).not.toHaveBeenCalled()

    const result = d.flush()
    expect(fn).toHaveBeenCalledTimes(1)
    expect(result).toBe(42)
  })

  it('cancel 取消待执行的调用', () => {
    const fn = vi.fn<(n: number) => void>()
    const d = debounce(fn, { waitMs: 100, timing: 'trailing' })

    d.call(1)
    d.cancel()
    vi.advanceTimersByTime(200)

    expect(fn).not.toHaveBeenCalled()
  })

  it('isPending 反映是否有待执行的调用', () => {
    const fn = vi.fn<(n: number) => void>()
    const d = debounce(fn, { waitMs: 100, timing: 'trailing' })

    expect(d.isPending).toBe(false)
    d.call(1)
    expect(d.isPending).toBe(true)

    vi.advanceTimersByTime(100)
    expect(d.isPending).toBe(false)
  })

  it('cachedValue 返回最近一次调用结果', () => {
    const fn = vi.fn<(n: number) => number>((n: number) => n * 2)
    const d = debounce(fn, { waitMs: 100, timing: 'leading' })

    d.call(2)
    expect(d.cachedValue).toBe(4)
  })
})
