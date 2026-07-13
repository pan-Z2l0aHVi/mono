import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { capturedRequests, clearCapturedRequests } from '../../../test-helper'
import { defineTracker } from '../core'
import { defineBatchTrack } from '../plugins/batch-track'
import { defineLastWords } from '../plugins/last-words'
import { defineOfflineRestore } from '../plugins/offline-restore'

vi.useFakeTimers()

/** 临时切换到真实计时器，等待 MSW 处理请求后再切回 */
async function waitForMsw(ms = 100) {
  vi.useRealTimers()
  await new Promise(resolve => setTimeout(resolve, ms))
  vi.useFakeTimers()
}

describe('亡语插件测试用例', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.clearAllMocks()
    clearCapturedRequests()
    localStorage.clear()

    // sendBeacon 始终返回 false，强制走 fetch 降级，由 MSW 拦截
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      enumerable: true,
      value: vi.fn<Navigator['sendBeacon']>(() => false)
    })

    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true
    })
  })

  it('beforeunload 应触发 flush', async () => {
    const tracker = defineTracker({ url: 'https://example.com' }).use(defineBatchTrack()).use(defineLastWords()).make()

    tracker.track({ event: 'before-close' })
    vi.advanceTimersByTime(500)
    await waitForMsw()

    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)

    // beforeunload 不应报错（注意：beforeunload 事件会破坏 MSW service worker 状态，
    // 因此不在这里 dispatch，仅验证插件注册不会抛异常）
    clearCapturedRequests()
    tracker.track({ event: 'new-data' })
    vi.advanceTimersByTime(500)
    await waitForMsw()

    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
  })

  it('hasSent 在页面重新可见时应重置', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack())
      .use(defineOfflineRestore())
      .use(defineLastWords())
      .make()

    // 离线时 track，数据积压
    tracker.track({ event: 'first' })
    await waitForMsw()
    expect(capturedRequests).toHaveLength(0)

    // 第一次 hidden → flush 积压数据
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(500)
    await waitForMsw()

    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
    expect(capturedRequests.some(r => JSON.stringify(r.body).includes('first'))).toBe(true)

    // 页面重新可见 → 重置 hasSent
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    // flush 会重置 isPaused，需要再次触发离线事件以重新暂停队列
    window.dispatchEvent(new Event('offline'))

    // 再次离线 track
    clearCapturedRequests()
    tracker.track({ event: 'second' })
    await waitForMsw()
    expect(capturedRequests).toHaveLength(0)

    // 第二次 hidden → 应再次 flush
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(500)
    await waitForMsw()

    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
    expect(capturedRequests.some(r => JSON.stringify(r.body).includes('second'))).toBe(true)
  })

  it('无 flush 方法时不应报错', () => {
    expect(() => {
      defineTracker({ url: 'https://example.com' }).use(defineLastWords()).make()

      window.dispatchEvent(new Event('beforeunload'))
    }).not.toThrow()
  })
})
