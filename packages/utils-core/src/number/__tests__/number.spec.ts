import { describe, expect, it } from 'vitest'

import { clamp, toPrecision } from '..'

describe('number 单元测试', () => {
  describe('toPrecision', () => {
    it('应正确处理正数精度（四舍五入）', () => {
      expect(toPrecision(1234.567, 2)).toBe(1234.57)
      expect(toPrecision(1.45, 1)).toBe(1.5)
      expect(toPrecision(1.44, 1)).toBe(1.4)
    })

    it('应正确处理负数精度（取整到十位/百位）', () => {
      expect(toPrecision(1234.56, -1)).toBe(1230)
      expect(toPrecision(1234.56, -2)).toBe(1200)
      expect(toPrecision(1260.56, -2)).toBe(1300)
    })

    it('应正确处理精度为 0 的情况', () => {
      expect(toPrecision(1234.56, 0)).toBe(1235)
    })

    it('应对非有限数字（NaN, Infinity）原样返回', () => {
      expect(toPrecision(NaN, 2)).toBeNaN()
      expect(toPrecision(Infinity, 2)).toBe(Infinity)
      expect(toPrecision(-Infinity, 2)).toBe(-Infinity)
    })
  })

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
  })
})
