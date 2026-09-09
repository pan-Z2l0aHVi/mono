import { describe, expect, it } from 'vite-plus/test'

import { clamp, formatFileSize } from '..'

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

describe('formatFileSize 测试', () => {
  it('应当正确格式化字节', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1048576)).toBe('1 MB')
    expect(formatFileSize(1073741824)).toBe('1 GB')
  })

  it('应当支持自定义保留小数位', () => {
    expect(formatFileSize(1500, 3)).toBe('1.465 KB')
    expect(formatFileSize(1500, 0)).toBe('1 KB')
  })

  it('负数与零应当返回 0 B，而非 NaN', () => {
    expect(formatFileSize(-1)).toBe('0 B')
    expect(formatFileSize(-1024)).toBe('0 B')
    expect(formatFileSize(0)).toBe('0 B')
  })

  it('超过 TB 上限时回退到最大单位，而非 undefined', () => {
    // 1 PB = 1024^5，sizes 只有 5 项（最大 TB）；越界前应回退
    expect(formatFileSize(1024 ** 5)).toBe('1024 TB')
    expect(formatFileSize(1024 ** 6)).toBe('1048576 TB')
  })
})
