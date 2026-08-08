import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { capturedRequests, clearCapturedRequests, settleCapturedRequests } from '../../../test-helper'
import { defineTracker } from '../core'
import { defineBatchTrack } from '../plugins/batch-track'
import { defineLastWords } from '../plugins/last-words'
import { defineOfflineRestore } from '../plugins/offline-restore'

vi.useFakeTimers()

/** 临时切换到真实计时器，等待 MSW 捕获指定数量的请求后再切回。 */
async function waitForMsw(minCount = 1, timeout = 1000) {
  vi.useRealTimers()
  const start = Date.now()
  while (capturedRequests.length < minCount && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  vi.useFakeTimers()
}

describe('亡语插件测试用例', () => {
  beforeEach(async () => {
    // 上一用例的在途请求可能在本用例断言窗口才落地，排空后再清空。
    await settleCapturedRequests()

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

  it('track 数据按 batch 周期发送，插件注册不抛异常', async () => {
    // 真实 beforeunload 会在浏览器进入卸载流程时让 keepalive fetch 挂起，
    // 阻塞后续用例（MSW handler 无法完成），因此这里不派发 beforeunload；
    // beforeunload 触发的是 flush 路径，由下方 flush 用例覆盖。
    const tracker = defineTracker({ url: 'https://example.com' }).use(defineBatchTrack()).use(defineLastWords()).make()

    tracker.track({ event: 'before-close' })
    vi.advanceTimersByTime(500)
    await waitForMsw()

    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)

    // 插件注册后仍可继续 track，不应报错
    clearCapturedRequests()
    tracker.track({ event: 'new-data' })
    vi.advanceTimersByTime(500)
    await waitForMsw()

    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
  })

  it('flush 立即发送积压数据（beforeunload 内部调用的路径）', async () => {
    const tracker = defineTracker({ url: 'https://example.com' }).use(defineBatchTrack()).use(defineLastWords()).make()

    tracker.track({ event: 'queued' })
    tracker.flush()
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
