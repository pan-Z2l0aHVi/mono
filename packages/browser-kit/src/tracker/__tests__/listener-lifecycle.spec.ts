import { definePlugin } from '@greypan/js-kit'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineLastWords } from '../plugins/last-words'
import { defineOfflineRestore } from '../plugins/offline-restore'
import { definePageErrors } from '../plugins/page-errors'

const cleanups: Array<() => void> = []
afterEach(() => {
  for (const stop of cleanups.splice(0)) stop()
  vi.restoreAllMocks()
})

describe('tracker 插件监听器生命周期', () => {
  it.each([false, true])('组合 stop 释放全部插件，顺序反转=%s', reverse => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const ctx = {
      pause: vi.fn<() => void>(),
      resume: vi.fn<() => void>(),
      flush: vi.fn<() => void>(),
      track: vi.fn<(data: object) => void>(),
      computeDataSize: () => 0,
      stop: vi.fn<() => void>()
    }
    const base = definePlugin(() => ctx)
    const plugin = reverse
      ? base.use(definePageErrors()).use(defineLastWords()).use(defineOfflineRestore())
      : base.use(defineOfflineRestore()).use(defineLastWords()).use(definePageErrors())
    const tracker = plugin.make()
    cleanups.push(tracker.stop)
    const dispatch = (message: string) => {
      window.dispatchEvent(new Event('offline'))
      window.dispatchEvent(new Event('online'))
      window.dispatchEvent(new Event('pagehide'))
      window.dispatchEvent(new ErrorEvent('error', { message }))
    }
    dispatch('active fixture error')
    expect(ctx.pause).toHaveBeenCalledTimes(1)
    expect(ctx.resume).toHaveBeenCalledTimes(1)
    expect(ctx.flush).toHaveBeenCalledTimes(1)
    expect(ctx.track).toHaveBeenCalledTimes(1)

    tracker.stop()
    tracker.stop()
    // 重新武装退出事件的闸门，避免 hasSent 掩盖未释放的监听器。
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    dispatch('stopped fixture error')
    expect(ctx.stop).toHaveBeenCalledTimes(1)
    expect(ctx.pause).toHaveBeenCalledTimes(1)
    expect(ctx.resume).toHaveBeenCalledTimes(1)
    expect(ctx.flush).toHaveBeenCalledTimes(1)
    expect(ctx.track).toHaveBeenCalledTimes(1)
  })

  it('停止一个实例后，另一个实例仍响应 online', () => {
    const first = { pause: vi.fn<() => void>(), resume: vi.fn<() => void>() }
    const second = { pause: vi.fn<() => void>(), resume: vi.fn<() => void>() }
    const a = defineOfflineRestore().make(first)
    const b = defineOfflineRestore().make(second)
    cleanups.push(a.stop, b.stop)
    a.stop()
    window.dispatchEvent(new Event('online'))
    expect(first.resume).not.toHaveBeenCalled()
    expect(second.resume).toHaveBeenCalledOnce()
  })
})
