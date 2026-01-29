// tracker.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Tracker } from '..'

vi.mock('idb-keyval', () => ({
  update: vi.fn(async (_key, fn) => fn([])),
  get: vi.fn(async () => []),
  del: vi.fn(async () => {})
}))

vi.mock('nanoid', () => ({
  nanoid: () => 'mock-id'
}))

vi.mock('@/shortcut', () => ({
  on: (target: Window | Document, event: string, handler: () => void) => {
    target.addEventListener(event, handler)
  }
}))

describe('埋点上报工具 Tracker 单元测试', () => {
  let tracker: Tracker<{
    event?: string
    idx?: number
  }>
  let sendBeaconSpy: ReturnType<typeof vi.fn>
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sendBeaconSpy = vi.fn(() => true)
    fetchSpy = vi.fn(() => Promise.resolve({ ok: true }))
    ;(navigator as any).sendBeacon = sendBeaconSpy
    ;(global as any).fetch = fetchSpy

    tracker = new Tracker({ url: '/mock' })
  })

  it('批量聚合：在延迟内合并多次上报', async () => {
    await tracker.track({ event: 'click' })
    await tracker.track({ event: 'view' })
    // flush 手动触发队列消费
    await tracker.flush(q => tracker['consumeBatchingQueue'](q))
    expect(sendBeaconSpy).toHaveBeenCalled()
  })

  it('降级策略：sendBeacon 失败时使用 fetch', async () => {
    sendBeaconSpy.mockImplementation(() => {
      throw new Error('Failed.')
    })
    await tracker.track({ event: 'error' }, false)
    expect(fetchSpy).toHaveBeenCalled()
  })

  it('数据分片：超过阈值时递归分片', async () => {
    const bigParams = Array.from({ length: 200 }, (_, i) => ({ idx: i }))
    await tracker['request'](bigParams)
    expect(sendBeaconSpy).toHaveBeenCalled()
  })

  it('临终遗言：beforeunload 触发立即上报', async () => {
    const off = tracker.onSendBeforeLeave()
    await tracker.track({ event: 'leave' })
    window.dispatchEvent(new Event('beforeunload'))
    expect(sendBeaconSpy).toHaveBeenCalled()
    off?.()
  })
})
