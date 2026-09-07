import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineControllableInterval } from '..'

describe('timer 测试', () => {
  describe('ControllableInterval', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('应当能正常循环执行', () => {
      const cb = vi.fn<() => void>()
      const timer = defineControllableInterval({ callback: cb, interval: 1000 }).make()
      timer.start()

      vi.advanceTimersByTime(3500)
      expect(cb).toHaveBeenCalledTimes(3)
      timer.stop()
    })

    it('暂停后不应触发回调', () => {
      const cb = vi.fn<() => void>()
      const timer = defineControllableInterval({ callback: cb, interval: 1000 }).make()
      timer.start()

      vi.advanceTimersByTime(500)
      timer.pause()
      vi.advanceTimersByTime(1000)

      expect(cb).not.toHaveBeenCalled()
      timer.stop()
    })

    it('恢复后应先补全剩余时间', () => {
      const cb = vi.fn<() => void>()
      const timer = defineControllableInterval({ callback: cb, interval: 1000 }).make()
      timer.start()

      vi.advanceTimersByTime(800) // 此时还剩 200ms
      timer.pause()

      timer.resume()
      vi.advanceTimersByTime(150)
      expect(cb).not.toHaveBeenCalled() // 还没到 200ms，不触发

      vi.advanceTimersByTime(60) // 超过 200ms 了
      expect(cb).toHaveBeenCalledTimes(1)
      timer.stop()
    })

    it('暂停中手动 tick 只触发一次回调且不改变暂停状态', () => {
      const cb = vi.fn<() => void>()
      const timer = defineControllableInterval({ callback: cb, interval: 1000 }).make()
      timer.start()

      vi.advanceTimersByTime(500)
      timer.pause()

      timer.tick(200)
      vi.advanceTimersByTime(200)
      expect(cb).toHaveBeenCalledTimes(1)

      // 暂停态未被 tick 打破：回调后不会自动续周期
      vi.advanceTimersByTime(2000)
      expect(cb).toHaveBeenCalledTimes(1)

      // 暂停状态机完好：仍按剩余时间恢复
      timer.resume()
      vi.advanceTimersByTime(300) // 剩余 500ms 未到
      expect(cb).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(200)
      expect(cb).toHaveBeenCalledTimes(2)
      timer.stop()
    })

    it('暂停中手动 tick 后 resume 不双调度', () => {
      const cb = vi.fn<() => void>()
      const timer = defineControllableInterval({ callback: cb, interval: 1000 }).make()
      timer.start()

      vi.advanceTimersByTime(800) // 剩余 200ms
      timer.pause()

      timer.tick(5000) // 挂起的手动触发（t=800+5000）
      timer.resume() // 必须清理挂起的手动句柄，只按剩余周期重启
      vi.advanceTimersByTime(200)
      expect(cb).toHaveBeenCalledTimes(1)

      // t=5800 处旧的手动句柄已被取消，此后只按 1000ms 周期触发（t=2000..5800 共 4 次）
      vi.advanceTimersByTime(4800)
      expect(cb).toHaveBeenCalledTimes(5)
      timer.stop()
    })

    it('运行中手动 tick 取消原周期句柄，不双调度', () => {
      const cb = vi.fn<() => void>()
      const timer = defineControllableInterval({ callback: cb, interval: 1000 }).make()
      timer.start()

      vi.advanceTimersByTime(500)
      timer.tick(100) // 提前到 t=600 触发，原 t=1000 的句柄应被清理
      vi.advanceTimersByTime(100)
      expect(cb).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(400) // t=1000：旧句柄若残留会在此多触发一次
      expect(cb).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(600) // t=1600：新周期
      expect(cb).toHaveBeenCalledTimes(2)
      timer.stop()
    })
  })
})
