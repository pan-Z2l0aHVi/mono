import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { capturedRequests, clearCapturedRequests } from '../../../test-helper'
import { defineTracker } from '../core'
import { defineOfflineRestore } from '../plugins/offline-restore'

vi.useFakeTimers()

/** 临时切换到真实计时器，等待 MSW 处理请求后再切回 */
async function waitForMsw(ms = 100) {
  vi.useRealTimers()
  await new Promise(resolve => setTimeout(resolve, ms))
  vi.useFakeTimers()
}

describe('离线恢复上报插件测试用例', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    clearCapturedRequests()

    // sendBeacon 始终返回 false，强制走 fetch 降级路径，由 MSW 拦截
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      enumerable: true,
      value: () => false
    })

    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true
    })
  })

  it('离线时不应发送数据（暂停 loop）', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })

    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore()).make()

    tracker.track({ action: 'offline-event' })
    await waitForMsw()

    expect(capturedRequests).toHaveLength(0)
  })

  it('离线后重连恢复：online 事件触发 resume', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })

    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore()).make()

    tracker.track({ action: 'first' })
    tracker.track({ action: 'second' })
    await waitForMsw()

    expect(capturedRequests).toHaveLength(0)

    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitForMsw()

    expect(capturedRequests.length).toBeGreaterThan(0)
  })

  it('在线时正常发送', async () => {
    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore()).make()

    tracker.track({ event: 'click' })
    await waitForMsw()

    expect(capturedRequests.length).toBeGreaterThan(0)
  })

  it('启动时离线 → 恢复在线应发送积压数据', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })

    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore()).make()

    tracker.track({ action: 'pending' })
    await waitForMsw()
    expect(capturedRequests).toHaveLength(0)

    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitForMsw()

    expect(capturedRequests.some(r => JSON.stringify(r.body).includes('pending'))).toBe(true)
  })

  it('多次离线/在线切换应正确处理', async () => {
    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore()).make()

    // 第一次离线
    Object.defineProperty(navigator, 'onLine', { value: false })
    window.dispatchEvent(new Event('offline'))
    tracker.track({ action: 'first-offline' })
    await waitForMsw()
    expect(capturedRequests).toHaveLength(0)

    // 恢复在线
    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitForMsw()
    const firstRecoveryCount = capturedRequests.length
    expect(firstRecoveryCount).toBeGreaterThan(0)

    // 第二次离线
    Object.defineProperty(navigator, 'onLine', { value: false })
    window.dispatchEvent(new Event('offline'))
    tracker.track({ action: 'second-offline' })
    await waitForMsw()
    expect(capturedRequests).toHaveLength(firstRecoveryCount)

    // 再次恢复
    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitForMsw()
    expect(capturedRequests.length).toBeGreaterThan(firstRecoveryCount)
  })
})
