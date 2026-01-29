import { describe, expect, it } from 'vitest'

import { getRootScrollLeft, getRootScrollTop } from '..'

describe('dom 单元测试', () => {
  describe('getRootScrollLeft|getRootScrollTop 测试', () => {
    it('获取根元素的滚动位置', () => {
      expect(getRootScrollLeft()).toBe(0)
      expect(getRootScrollTop()).toBe(0)
    })
  })
})
