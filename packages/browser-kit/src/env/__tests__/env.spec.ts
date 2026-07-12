import { describe, expect, it } from 'vite-plus/test'

import { env } from '..'

describe('env 测试', () => {
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

  it('isDesktop getter 不应依赖 this 上下文', () => {
    const getter = Object.getOwnPropertyDescriptor(env, 'isDesktop')!.get!
    // 调用 getter 时不传入 env 作为 this，应仍能正常工作
    expect(() => getter()).not.toThrow()
    expect(typeof getter()).toBe('boolean')
  })

  it('isWebview getter 不应依赖 this 上下文', () => {
    const getter = Object.getOwnPropertyDescriptor(env, 'isWebview')!.get!
    // 调用 getter 时不传入 env 作为 this，应仍能正常工作
    expect(() => getter()).not.toThrow()
    expect(typeof getter()).toBe('boolean')
  })
})
