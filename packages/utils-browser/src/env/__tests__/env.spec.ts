import { beforeAll, describe, expect, it, vi } from 'vitest'

import { env } from '..'

describe('env 单元测试', () => {
  beforeAll(() => {
    // 补齐 JSDOM 缺失的 matchMedia 方法
    // 很多环境检测（如 isDarkMode, isPWA）会依赖这个
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // 兼容旧版
        removeListener: vi.fn(), // 兼容旧版
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    })
  })

  it('应当能正常读取环境属性', () => {
    // 检查基础环境
    expect(typeof env.isBrowser).toBe('boolean')
    expect(typeof env.isSsr).toBe('boolean')

    // 检查设备平台
    expect(typeof env.isMobile).toBe('boolean')
    expect(typeof env.isDesktop).toBe('boolean')
    expect(typeof env.isTouchSupported).toBe('boolean')

    // 检查操作系统
    expect(typeof env.isAndroid).toBe('boolean')
    expect(typeof env.isIos).toBe('boolean')
    expect(typeof env.isIpadOs).toBe('boolean')

    // 检查浏览器内核
    expect(typeof env.isChrome).toBe('boolean')
    expect(typeof env.isSafari).toBe('boolean')
    expect(typeof env.isFirefox).toBe('boolean')

    // 检查特定容器
    expect(typeof env.isWeChat).toBe('boolean')
    expect(typeof env.isAlipay).toBe('boolean')
    expect(typeof env.isDingTalk).toBe('boolean')
    expect(typeof env.isIframe).toBe('boolean')
  })

  it('在 JSDOM 环境下应当识别为浏览器端', () => {
    expect(env.isBrowser).toBe(true)
    expect(env.isSsr).toBe(false)
  })
})
