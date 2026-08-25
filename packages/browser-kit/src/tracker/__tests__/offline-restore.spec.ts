import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineLocal } from '@/storage'

import { capturedRequests, clearCapturedRequests, settleCapturedRequests } from '../../../test-helper'
import { defineTracker } from '../core'
import { defineOfflineRestore } from '../plugins/offline-restore'

vi.useFakeTimers()

/** 临时切换到真实计时器，轮询断言条件直到满足或超时。 */
async function waitFor(predicate: () => boolean, timeout = 5000) {
  vi.useRealTimers()
  const start = Date.now()
  while (!predicate() && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  vi.useFakeTimers()
}

/** 等待 MSW 捕获指定数量的请求。 */
async function waitForMsw(minCount = 1, timeout = 5000) {
  await waitFor(() => capturedRequests.length >= minCount, timeout)
}

/** 等待 storage 收敛到目标状态。 */
async function waitForStorage(predicate: () => boolean, timeout = 5000) {
  await waitFor(predicate, timeout)
}

/** 等待当前任务已排入的 microtask 执行完毕。 */
async function settleMicrotasks() {
  await new Promise<void>(resolve => queueMicrotask(resolve))
}

describe('离线恢复上报插件测试用例', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn<Navigator['sendBeacon']>>

  beforeEach(async () => {
    // 上一用例的在途请求可能在共享 afterEach 清空后才落地并 push，从而
    // 污染本用例的离线断言（典型：启动时离线收到上一条 POST）。排空后清空。
    await settleCapturedRequests()

    vi.clearAllMocks()
    localStorage.clear()
    clearCapturedRequests()

    // sendBeacon 始终返回 false，强制走 fetch 降级路径，由 MSW 拦截。
    sendBeaconSpy = vi.fn<Navigator['sendBeacon']>(() => false)
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

  it('离线时不应发送数据', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })

    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore()).make()

    tracker.track({ action: 'offline-event' })
    await settleMicrotasks()

    expect(sendBeaconSpy).not.toHaveBeenCalled()
    expect(capturedRequests).toHaveLength(0)
  })

  it('启动恢复遇到初始离线时应等到 online 后再发送', async () => {
    const storage = defineLocal('tracker')
    const storageKey = 'queue:https://example.com'
    const restored = [{ action: 'restored-while-offline' }]
    storage.set(storageKey, restored)
    Object.defineProperty(navigator, 'onLine', { value: false })

    defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore()).make()
    await settleMicrotasks()

    expect(sendBeaconSpy).not.toHaveBeenCalled()
    expect(capturedRequests).toHaveLength(0)
    expect(storage.get(storageKey)).toEqual(restored)

    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitForMsw()
    await waitForStorage(() => storage.get(storageKey) === null)

    expect(capturedRequests.some(request => JSON.stringify(request.body).includes('restored-while-offline'))).toBe(true)
    expect(storage.get(storageKey)).toBeNull()
  })

  it('离线后重连恢复：online 事件触发 resume', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })

    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore()).make()

    tracker.track({ action: 'first' })
    tracker.track({ action: 'second' })
    await settleMicrotasks()

    expect(capturedRequests).toHaveLength(0)

    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitForMsw(2)

    expect(capturedRequests).toHaveLength(2)
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
    await settleMicrotasks()
    expect(capturedRequests).toHaveLength(0)

    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitForMsw()

    expect(capturedRequests.some(request => JSON.stringify(request.body).includes('pending'))).toBe(true)
  })

  it('多次离线/在线切换应正确处理', async () => {
    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore()).make()

    // 第一次离线。
    Object.defineProperty(navigator, 'onLine', { value: false })
    window.dispatchEvent(new Event('offline'))
    tracker.track({ action: 'first-offline' })
    await settleMicrotasks()
    expect(capturedRequests).toHaveLength(0)

    // 恢复在线。
    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitForMsw()
    const firstRecoveryCount = capturedRequests.length
    expect(firstRecoveryCount).toBeGreaterThan(0)

    // 第二次离线。
    Object.defineProperty(navigator, 'onLine', { value: false })
    window.dispatchEvent(new Event('offline'))
    tracker.track({ action: 'second-offline' })
    await settleMicrotasks()
    expect(capturedRequests).toHaveLength(firstRecoveryCount)

    // 再次恢复。
    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitForMsw(firstRecoveryCount + 1)
    expect(capturedRequests.length).toBeGreaterThan(firstRecoveryCount)
  })
})
