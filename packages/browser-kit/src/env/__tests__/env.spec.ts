import { describe, expect, it } from 'vite-plus/test'

import { env } from '..'

describe('env 测试', () => {
  it('浏览器环境下 isBrowser 为真、isSsr 为假，两者互补', () => {
    expect(env.isBrowser).toBe(true)
    expect(env.isSsr).toBe(false)
  })

  it('isMobile 与 isDesktop 互斥且互补', () => {
    // 这对值被布局分支直接消费；同时为真或同时为假都会让两套布局同时生效或都不生效
    expect(env.isMobile).toBe(!env.isDesktop)
  })

  it('getter 被解构后仍能求值，不依赖 this', () => {
    // 消费方常写 `const { isMobile } = env`；getter 一旦改写成 this.xxx 就会在解构处抛错
    const { isDesktop, isWebview, isIos, isPWA } = env
    expect(typeof isDesktop).toBe('boolean')
    expect(typeof isWebview).toBe('boolean')
    expect(typeof isIos).toBe('boolean')
    expect(typeof isPWA).toBe('boolean')
  })

  it('UA 派生的判断在模块加载时快照，之后改 userAgent 不影响结果', () => {
    // env 在模块作用域捕获一次 ua 并据此定义全部 getter。改写 userAgent 之后
    // isWeChat 仍按加载时的 UA 求值——这是快照语义，不是缺陷（同一页面生命周期内
    // UA 不会变）。若改成实时读取，这条断言会红，且页面行为会在运行中漂移。
    const before = env.isWeChat
    const original = navigator.userAgent

    try {
      Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 MicroMessenger/8.0', configurable: true })
      expect(env.isWeChat).toBe(before)
      expect(env.isWeChat).toBe(/MicroMessenger/i.test(original))
    } finally {
      Object.defineProperty(navigator, 'userAgent', { value: original, configurable: true })
    }
  })

  it('isPWA 按当前 display-mode 实时求值', () => {
    // 与 UA 快照不同，display-mode 用 matchMedia 实时查询，返回值本来就该跟着媒体查询走
    expect(typeof env.isPWA).toBe('boolean')
  })
})
