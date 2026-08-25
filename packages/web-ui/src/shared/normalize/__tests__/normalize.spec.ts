import { describe, expect, it } from 'vite-plus/test'

import { normalizeLiteral, normalizeNumber, type LiteralValues } from '../index'

const VARIANTS: LiteralValues<'primary' | 'secondary' | 'ghost'> = ['primary', 'secondary', 'ghost']

describe('normalizeLiteral', () => {
  it('接受集合内的合法值', () => {
    expect(normalizeLiteral('primary', VARIANTS, 'ghost')).toBe('primary')
    expect(normalizeLiteral('secondary', VARIANTS, 'ghost')).toBe('secondary')
  })

  it('非法字符串回退默认值', () => {
    expect(normalizeLiteral('invalid', VARIANTS, 'ghost')).toBe('ghost')
    expect(normalizeLiteral('', VARIANTS, 'ghost')).toBe('ghost')
  })

  it('非字符串输入（数字/对象/null/undefined）回退默认值', () => {
    expect(normalizeLiteral(42, VARIANTS, 'ghost')).toBe('ghost')
    expect(normalizeLiteral(null, VARIANTS, 'ghost')).toBe('ghost')
    expect(normalizeLiteral(undefined, VARIANTS, 'ghost')).toBe('ghost')
    expect(normalizeLiteral({}, VARIANTS, 'ghost')).toBe('ghost')
  })

  it('大小写敏感：不匹配的拼写回退默认值', () => {
    expect(normalizeLiteral('Primary', VARIANTS, 'ghost')).toBe('ghost')
  })
})

describe('normalizeNumber', () => {
  it('范围内数值原样返回', () => {
    expect(normalizeNumber(5, 0, 10, 1)).toBe(5)
    expect(normalizeNumber(0, 0, 10, 1)).toBe(0)
    expect(normalizeNumber(10, 0, 10, 1)).toBe(10)
  })

  it('越界数值收敛到边界', () => {
    expect(normalizeNumber(-3, 0, 10, 1)).toBe(0)
    expect(normalizeNumber(99, 0, 10, 1)).toBe(10)
  })

  it('NaN / Infinity / 非数值回退默认值', () => {
    expect(normalizeNumber(Number.NaN, 0, 10, 4)).toBe(4)
    expect(normalizeNumber(Number.POSITIVE_INFINITY, 0, 10, 4)).toBe(4)
    expect(normalizeNumber(Number.NEGATIVE_INFINITY, 0, 10, 4)).toBe(4)
    expect(normalizeNumber('8', 0, 10, 4)).toBe(4)
    expect(normalizeNumber(null, 0, 10, 4)).toBe(4)
  })

  it('min 大于 max 时以 clamp 顺序为准（先 max 后 min）', () => {
    // Math.min(max, Math.max(min, value)) 的既定语义
    expect(normalizeNumber(5, 10, 0, -1)).toBe(0)
  })
})
