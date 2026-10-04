import { describe, expect, it } from 'vite-plus/test'

import { getRootScrollLeft, getRootScrollTop, getViewportSize } from '..'

describe('dom 测试', () => {
  it('getViewportSize 跟随当前视口', () => {
    expect(getViewportSize()).toEqual({ width: window.innerWidth, height: window.innerHeight })
  })

  it('根滚动位置读取页面级滚动量，未滚动时为 0', () => {
    expect(getRootScrollTop()).toBe(0)
    expect(getRootScrollLeft()).toBe(0)
  })

  it('页面滚动后，根滚动位置跟随 window 的实际滚动量变化', () => {
    // 这三个函数存在的理由就是「读当前值」。只断言未滚动时的 0 挡不住
    // 把 window.scrollY 写死成 0 的回归——那种实现在任何断言下都通过。
    // 需要真的可滚动的内容，否则 window.scrollTo 是空操作。
    const spacer = document.createElement('div')
    spacer.style.cssText = 'width: 4000px; height: 2000px'
    document.body.append(spacer)

    try {
      window.scrollTo(60, 120)
      expect(getRootScrollLeft()).toBe(60)
      expect(getRootScrollTop()).toBe(120)
    } finally {
      window.scrollTo(0, 0)
      spacer.remove()
    }
  })
})
