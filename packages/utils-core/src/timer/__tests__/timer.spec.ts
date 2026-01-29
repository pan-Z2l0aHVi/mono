import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ControllableInterval } from '..'

describe('timer 单元测试', () => {
  describe('ControllableInterval', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('应当能正常循环执行', () => {
      const cb = vi.fn()
      const timer = new ControllableInterval(cb, 1000)
      timer.start()

      vi.advanceTimersByTime(3500)
      expect(cb).toHaveBeenCalledTimes(3)
      timer.stop()
    })

    it('暂停后不应触发回调', () => {
      const cb = vi.fn()
      const timer = new ControllableInterval(cb, 1000)
      timer.start()

      vi.advanceTimersByTime(500)
      timer.pause()
      vi.advanceTimersByTime(1000)

      expect(cb).not.toHaveBeenCalled()
      timer.stop()
    })

    it('恢复后应先补全剩余时间', () => {
      const cb = vi.fn()
      const timer = new ControllableInterval(cb, 1000)
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
  })
})
