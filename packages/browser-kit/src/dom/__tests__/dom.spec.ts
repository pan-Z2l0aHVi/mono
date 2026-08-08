import { describe, expect, it } from 'vite-plus/test'

import { getRootScrollLeft, getRootScrollTop, getViewportSize } from '..'

describe('dom 测试', () => {
  describe('getRootScrollLeft|getRootScrollTop 测试', () => {
    it('获取根元素的滚动位置', () => {
      expect(getRootScrollLeft()).toBe(0)
      expect(getRootScrollTop()).toBe(0)
    })
  })

  describe('getViewportSize 测试', () => {
    it('应返回当前视口尺寸', () => {
      const original = { width: window.innerWidth, height: window.innerHeight }

      expect(getViewportSize()).toEqual(original)
      expect(typeof getViewportSize().width).toBe('number')
      expect(typeof getViewportSize().height).toBe('number')
    })
  })
})
