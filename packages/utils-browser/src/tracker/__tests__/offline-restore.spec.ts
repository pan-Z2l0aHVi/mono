import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defineTracker } from '../plugins/core' // 假设这是你的核心定义
import { defineOfflineRestore } from '../plugins/offline-restore'

// 模拟 idb-keyval
// 全局唯一
let _mockStore: Record<string, any> = {}

vi.mock('idb-keyval', () => ({
  get: vi.fn(async key => _mockStore[key]),
  del: vi.fn(async key => {
    delete _mockStore[key]
  }),
  update: vi.fn(async (key, updater) => {
    const oldValue = _mockStore[key] || []
    _mockStore[key] = updater(oldValue)
  }),
  set: vi.fn(async (key, val) => {
    _mockStore[key] = val
  })
}))

describe('离线恢复上报插件测试用例', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _mockStore = {}

    // 模拟 navigator
    if (typeof navigator !== 'undefined') {
      // 模拟 sendBeacon 避免 core.ts 报错
      Object.defineProperty(navigator, 'sendBeacon', {
        value: vi.fn().mockReturnValue(true),
        configurable: true
      })
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true
      })
    }
  })

  it('应当离线存储并在重连后恢复上报', async () => {
    const restoreKey = 'integrated-test'

    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore({ restoreKey })).make()

    tracker.onOfflineRestore()

    Object.defineProperty(navigator, 'onLine', { value: false })

    const eventData = { action: 'click', timestamp: 12345 }
    await tracker.track(eventData)

    window.dispatchEvent(new Event('offline'))

    // 验证数据是否进入了 idb-keyval 模拟器
    expect(_mockStore[restoreKey]).toContainEqual(eventData)

    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))

    // 给异步 init() 一点运行时间
    await new Promise(resolve => setTimeout(resolve, 50))

    // 验证：数据库应该被清空了（表示已读取并尝试上报）
    expect(_mockStore[restoreKey]).toBeUndefined()
  })

  it('应当去重（deepEqual）', async () => {
    const restoreKey = 'unique-test'
    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore({ restoreKey })).make()

    tracker.onOfflineRestore()
    Object.defineProperty(navigator, 'onLine', { value: false })

    // 连续追踪两次完全相同的数据
    await tracker.track({ id: 'repeat', coordinate: { x: 1, y: 2 } })
    await tracker.track({ id: 'repeat', coordinate: { x: 1, y: 2 } })

    window.dispatchEvent(new Event('offline'))

    expect(_mockStore[restoreKey]).toHaveLength(1)
    expect(_mockStore[restoreKey][0]).toEqual({ id: 'repeat', coordinate: { x: 1, y: 2 } })
  })
})
