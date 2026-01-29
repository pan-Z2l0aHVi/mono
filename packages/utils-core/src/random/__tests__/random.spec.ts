import { describe, expect, it } from 'vitest'

import { randomFloat, randomHex, randomRgb } from '..'

describe('random 单元测试', () => {
  describe('randomFloat', () => {
    it('结果应在指定的范围内', () => {
      const min = 1.1
      const max = 5.5
      for (let i = 0; i < 100; i++) {
        const result = randomFloat(min, max)
        expect(result).toBeGreaterThanOrEqual(min)
        // 考虑到 Math.random() 是 [0, 1)，结果理论上小于 max
        expect(result).toBeLessThanOrEqual(max)
      }
    })

    it('即便 min 和 max 传反了也应当正常工作', () => {
      const min = 10
      const max = 1
      const result = randomFloat(min, max)
      expect(result).toBeGreaterThanOrEqual(1)
      expect(result).toBeLessThanOrEqual(10)
    })

    it('当 min 等于 max 时应返回该数值', () => {
      const result = randomFloat(5, 5)
      expect(result).toBe(5)
    })
  })

  describe('randomRgb', () => {
    it('应当返回正确的 rgb(r, g, b) 格式', () => {
      // 允许逗号后有或没有空格
      const rgbRegex = /^rgb\(\d{1,3},\s?\d{1,3},\s?\d{1,3}\)$/
      for (let i = 0; i < 50; i++) {
        const result = randomRgb()
        expect(result).toMatch(rgbRegex)

        // 进一步校验数值范围
        const colors = result.match(/\d+/g)?.map(Number)
        colors?.forEach(c => {
          expect(c).toBeGreaterThanOrEqual(0)
          expect(c).toBeLessThanOrEqual(255)
        })
      }
    })
  })

  describe('randomHex', () => {
    it('应当返回正确的十六进制格式', () => {
      const hexRegex = /^#[0-9a-f]{6}$/
      for (let i = 0; i < 50; i++) {
        const result = randomHex()
        expect(result).toMatch(hexRegex)
      }
    })

    it('生成的十六进制应当是小写的', () => {
      const result = randomHex()
      // 检查不含大写字母：如果包含大写字母则测试失败
      expect(result).not.toMatch(/[A-Z]/)
    })
  })

  describe('随机性校验 (Randomness)', () => {
    it('连续调用不应产生相同的结果', () => {
      const results = new Set()
      const count = 100
      for (let i = 0; i < count; i++) {
        results.add(randomHex())
      }
      // 16777216 种颜色选 100 次，碰撞概率微乎其微
      expect(results.size).toBe(count)
    })
  })
})
