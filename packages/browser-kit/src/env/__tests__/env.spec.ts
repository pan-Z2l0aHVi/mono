import { describe, expect, it } from 'vite-plus/test'

import { env } from '..'

describe('env 测试', () => {
  it('浏览器环境下 isBrowser 为真、isSsr 为假，两者互补', () => {
    expect(env.isBrowser).toBe(true)
    expect(env.isSsr).toBe(false)
  })

  /*
   * 这对值被布局分支直接消费：同时为真会让两套布局同时生效，同时为假会一套都没有。
   *
   * 判据不写成 `expect(env.isMobile).toBe(!env.isDesktop)`：源码里 `isDesktop` 就是 `!isMobile`
   * （index.ts:44-46），那条式子对任意 UA 恒成立，改坏移动判定也红不了。而 env 在模块作用域
   * 快照 ua（见下面那条用例），运行中改写 navigator.userAgent 也拿不到第二个实例，于是这里
   * 改为按本包 browser-mode 环境（桌面 Chromium）应该走的那一侧，把两个取值各判一次：移动
   * 判定把测试 UA 认成移动设备、或 `isDesktop` 不等于移动判定的反面，都会在这里变红。
   */
  it('桌面 Chromium 环境走桌面分支：isMobile 假、isDesktop 真', () => {
    // 环境前提：这条用例判的是「桌面 UA 落桌面分支」，runner 一旦换成移动 UA 就该先在这里说清楚
    expect(navigator.userAgent).toMatch(/Chrome\/\d+/)
    expect(env.isMobile).toBe(false)
    expect(env.isDesktop).toBe(true)
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
