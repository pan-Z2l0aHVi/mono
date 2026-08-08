import { describe, expect, it } from 'vite-plus/test'

import { clamp } from '..'

describe('number 测试', () => {
  describe('clamp', () => {
    it('数值在范围内时应返回原值', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(0, 0, 10)).toBe(0)
      expect(clamp(10, 0, 10)).toBe(10)
    })

    it('数值小于最小值时应返回最小值', () => {
      expect(clamp(-5, 0, 10)).toBe(0)
    })

    it('数值大于最大值时应返回最大值', () => {
      expect(clamp(15, 0, 10)).toBe(10)
    })

    it('处理负数区间', () => {
      expect(clamp(-20, -10, -5)).toBe(-10)
      expect(clamp(-2, -10, -5)).toBe(-5)
    })

    it('应自动修正 min > max 的情况', () => {
      expect(clamp(5, 10, 0)).toBe(5)
      expect(clamp(-1, 10, 0)).toBe(0)
      expect(clamp(15, 10, 0)).toBe(10)
    })
  })
})
