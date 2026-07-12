import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineTracker } from '../core'
import { defineOfflineRestore } from '../plugins/offline-restore'

vi.useFakeTimers()

describe('离线恢复上报插件测试用例', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn<Navigator['sendBeacon']>>

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    sendBeaconSpy = vi.fn<Navigator['sendBeacon']>(() => true)
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      enumerable: true,
      value: sendBeaconSpy
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
    await vi.runAllTimersAsync()

    expect(sendBeaconSpy).not.toHaveBeenCalled()
  })

  it('离线后重连恢复：online 事件触发 resume', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })

    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore()).make()

    tracker.track({ action: 'first' })
    tracker.track({ action: 'second' })
    await vi.runAllTimersAsync()

    expect(sendBeaconSpy).not.toHaveBeenCalled()

    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await vi.runAllTimersAsync()

    expect(sendBeaconSpy).toHaveBeenCalled()
  })

  it('在线时正常发送', async () => {
    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore()).make()

    tracker.track({ event: 'click' })
    await vi.runAllTimersAsync()

    expect(sendBeaconSpy).toHaveBeenCalled()
  })

  it('启动时离线 → 恢复在线应发送积压数据', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })

    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore()).make()

    tracker.track({ action: 'pending' })
    await vi.runAllTimersAsync()
    expect(sendBeaconSpy).not.toHaveBeenCalled()

    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await vi.runAllTimersAsync()

    expect(sendBeaconSpy).toHaveBeenCalledWith('https://example.com', expect.stringContaining('pending'))
  })

  it('多次离线/在线切换应正确处理', async () => {
    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore()).make()

    // 第一次离线
    Object.defineProperty(navigator, 'onLine', { value: false })
    window.dispatchEvent(new Event('offline'))
    tracker.track({ action: 'first-offline' })
    await vi.runAllTimersAsync()
    expect(sendBeaconSpy).not.toHaveBeenCalled()

    // 恢复在线
    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await vi.runAllTimersAsync()
    expect(sendBeaconSpy).toHaveBeenCalledTimes(1)

    // 第二次离线
    Object.defineProperty(navigator, 'onLine', { value: false })
    window.dispatchEvent(new Event('offline'))
    tracker.track({ action: 'second-offline' })
    await vi.runAllTimersAsync()
    expect(sendBeaconSpy).toHaveBeenCalledTimes(1)

    // 再次恢复
    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await vi.runAllTimersAsync()
    expect(sendBeaconSpy).toHaveBeenCalledTimes(2)
  })
})
