import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineControllableInterval } from '..'

describe('defineControllableInterval 测试', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('start 后按周期循环触发，stop 后不再触发', () => {
    const cb = vi.fn<() => void>()
    const timer = defineControllableInterval({ callback: cb, interval: 1000 }).make()

    timer.start()
    vi.advanceTimersByTime(3500)
    expect(cb).toHaveBeenCalledTimes(3)

    timer.stop()
    vi.advanceTimersByTime(5000)
    expect(cb).toHaveBeenCalledTimes(3)
  })

  it('回调内部调 stop 后定时器不再复活', () => {
    // 回归：stop() 若在回调内部被调用，回调返回后的续期决策读到的是 stop 刚复位的
    // isPaused=false，于是重新 setTimeout——定时器在 stop 之后继续触发，违背 stop 的含义。
    // 既有 7 条用例都把 stop() 放在测试收尾清理，没有一条验证过 stop() 本身的效果。
    const cb = vi.fn<() => void>()
    const timer = defineControllableInterval({ callback: cb, interval: 1000 }).make()
    cb.mockImplementation(() => timer.stop())

    timer.start()
    vi.advanceTimersByTime(1000)
    expect(cb).toHaveBeenCalledTimes(1)

    // 远超一个周期：若定时器复活，这里会第二次触发
    vi.advanceTimersByTime(5000)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('resume 补完暂停前的剩余时间，而不是重新计满一个周期', () => {
    // 这是本定时器区别于普通 setInterval 的核心契约：暂停 800ms 后只剩 200ms，
    // 回到前台时应立刻触发，而不是让用户再干等一个完整周期
    const cb = vi.fn<() => void>()
    const timer = defineControllableInterval({ callback: cb, interval: 1000 }).make()

    timer.start()
    vi.advanceTimersByTime(800)
    timer.pause()

    timer.resume()
    vi.advanceTimersByTime(199)
    expect(cb).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(cb).toHaveBeenCalledTimes(1)

    timer.stop()
  })

  it('pause 发生在回调刚触发之后时，剩余时间回落到完整周期', () => {
    // 暂停时若当前周期已经走完，remainingTime 为 0，resume 用 `remainingTime || interval`
    // 退回完整周期——不能沿用上一次那个 0 而导致回调不触发
    const cb = vi.fn<() => void>()
    const timer = defineControllableInterval({ callback: cb, interval: 1000 }).make()

    timer.start()
    vi.advanceTimersByTime(1000)
    expect(cb).toHaveBeenCalledTimes(1)

    timer.pause()
    timer.resume()

    vi.advanceTimersByTime(999)
    expect(cb).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    expect(cb).toHaveBeenCalledTimes(2)

    timer.stop()
  })

  it('pause 期间不触发回调', () => {
    const cb = vi.fn<() => void>()
    const timer = defineControllableInterval({ callback: cb, interval: 1000 }).make()

    timer.start()
    vi.advanceTimersByTime(500)
    timer.pause()
    vi.advanceTimersByTime(1000)

    expect(cb).not.toHaveBeenCalled()
    timer.stop()
  })

  it('pause 中的手动 tick 触发一次，且不自动续周期', () => {
    const cb = vi.fn<() => void>()
    const timer = defineControllableInterval({ callback: cb, interval: 1000 }).make()

    timer.start()
    vi.advanceTimersByTime(500)
    timer.pause()

    timer.tick(200)
    vi.advanceTimersByTime(200)
    expect(cb).toHaveBeenCalledTimes(1)

    // tick 不代表「恢复」，回调之后不应自我续期
    vi.advanceTimersByTime(2000)
    expect(cb).toHaveBeenCalledTimes(1)

    timer.stop()
  })

  it('运行中手动 tick 提前触发后，原周期句柄被清理，不双调度', () => {
    // 泄漏旧句柄会让每个周期回调两次，轮询类定时器上会翻倍请求
    const cb = vi.fn<() => void>()
    const timer = defineControllableInterval({ callback: cb, interval: 1000 }).make()

    timer.start()
    vi.advanceTimersByTime(500)
    timer.tick(100)

    vi.advanceTimersByTime(100)
    expect(cb).toHaveBeenCalledTimes(1)

    // 原定的 t=1000 若仍在队列上，这里会多触发一次
    vi.advanceTimersByTime(400)
    expect(cb).toHaveBeenCalledTimes(1)

    // tick() 重设了 lastStartTime，新周期从 t=600 起算
    vi.advanceTimersByTime(600)
    expect(cb).toHaveBeenCalledTimes(2)
    timer.stop()
  })

  it('pause 中的手动 tick 在 resume 时被清理，不补触发', () => {
    // 挂起的手动句柄若泄漏到 resume 之后，会在早已过去的时点突然补一次回调
    const cb = vi.fn<() => void>()
    const timer = defineControllableInterval({ callback: cb, interval: 1000 }).make()

    timer.start()
    vi.advanceTimersByTime(800)
    timer.pause()
    timer.tick(5000)
    timer.resume()

    // resume 后剩余 200ms 处是第一个触发点
    vi.advanceTimersByTime(200)
    expect(cb).toHaveBeenCalledTimes(1)

    // 之后每 1000ms 一次：t=1200..5200 共 5 次
    vi.advanceTimersByTime(4800)
    expect(cb).toHaveBeenCalledTimes(5)
    timer.stop()
  })

  it('stop 之后手动 tick 会重新挂起一次回调（tick 不受 stop 约束）', () => {
    // tick 是公开能力且无条件重新调度，与 start/resume 的状态机相互独立。
    // 这里钉住当前行为：调用方若依赖「stop 后彻底静默」，不能靠 tick 达成。
    const cb = vi.fn<() => void>()
    const timer = defineControllableInterval({ callback: cb, interval: 1000 }).make()

    timer.start()
    timer.stop()
    vi.advanceTimersByTime(2000)
    expect(cb).not.toHaveBeenCalled()

    timer.tick(10)
    vi.advanceTimersByTime(10)
    expect(cb).toHaveBeenCalledTimes(1)

    // 非暂停态下回调会自动续周期
    vi.advanceTimersByTime(1000)
    expect(cb).toHaveBeenCalledTimes(2)
    timer.stop()
  })
})
