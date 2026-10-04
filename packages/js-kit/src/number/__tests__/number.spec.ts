import { describe, expect, it } from 'vite-plus/test'

import { clamp, formatFileSize } from '..'

describe('number 测试', () => {
  describe('clamp', () => {
    it('区间内返回原值，端点为闭区间', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(0, 0, 10)).toBe(0)
      expect(clamp(10, 0, 10)).toBe(10)
    })

    it('越界返回对应端点，负数区间同理', () => {
      expect(clamp(-5, 0, 10)).toBe(0)
      expect(clamp(15, 0, 10)).toBe(10)
      expect(clamp(-20, -10, -5)).toBe(-10)
      expect(clamp(-2, -10, -5)).toBe(-5)
    })

    it('min > max 时自动按 min、max 交换后再夹取', () => {
      // 交换后区间是 [0, 10]：落在区间内原样返回，区间外各自落到端点
      expect(clamp(5, 10, 0)).toBe(5)
      expect(clamp(-1, 10, 0)).toBe(0)
      expect(clamp(15, 10, 0)).toBe(10)
    })
  })
})

describe('formatFileSize 测试', () => {
  it('按 1024 进制换算单位', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1048576)).toBe('1 MB')
    expect(formatFileSize(1073741824)).toBe('1 GB')
  })

  it('自定义小数位按截断而非四舍五入', () => {
    // 1500 B = 1.4648… KB：3 位是 1.465（舍入），0 位是 1
    expect(formatFileSize(1500, 3)).toBe('1.465 KB')
    expect(formatFileSize(1500, 0)).toBe('1 KB')
  })

  it('负数不产生 NaN 或负号，回退为 0 B', () => {
    expect(formatFileSize(-1)).toBe('0 B')
    expect(formatFileSize(-1024)).toBe('0 B')
  })

  it('超过 TB 后停留在 TB 而非输出 undefined 单位', () => {
    expect(formatFileSize(1024 ** 5)).toBe('1024 TB')
    expect(formatFileSize(1024 ** 6)).toBe('1048576 TB')
  })
})
