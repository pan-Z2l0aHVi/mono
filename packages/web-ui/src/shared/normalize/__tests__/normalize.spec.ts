import { describe, expect, it } from 'vite-plus/test'

import { normalizeLiteral, normalizeNumber, type LiteralValues } from '../index'

const VARIANTS: LiteralValues<'primary' | 'secondary' | 'ghost'> = ['primary', 'secondary', 'ghost']

/**
 * 组件属性 setter 的运行时防线：JS 调用方与 framework 绑定都能写出类型系统管不到的输入
 * （`size=""` 写进 CSS 会变成 `NaNpx`，非法 placement 会漏进 DOM）。非法输入回退到
 * 文档化默认值是组件对外承诺，删掉任一分支就等于把这个承诺丢掉。
 */
describe('normalizeLiteral', () => {
  it('集合内的合法值原样返回', () => {
    expect(normalizeLiteral('primary', VARIANTS, 'ghost')).toBe('primary')
    expect(normalizeLiteral('secondary', VARIANTS, 'ghost')).toBe('secondary')
  })

  it.each([
    ['大小写不同的拼写', 'Primary'],
    ['空串', ''],
    ['集合外的字面量', 'invalid'],
    ['数字', 42],
    ['对象', {}],
    ['null', null],
    ['undefined', undefined]
  ])('非法输入（%s）回退默认值', (_label, input) => {
    expect(normalizeLiteral(input, VARIANTS, 'ghost')).toBe('ghost')
  })
})

describe('normalizeNumber', () => {
  it('范围内的数值原样返回', () => {
    expect(normalizeNumber(5, 0, 10, 1)).toBe(5)
  })

  it('越界数值收敛到边界', () => {
    expect(normalizeNumber(-3, 0, 10, 1)).toBe(0)
    expect(normalizeNumber(99, 0, 10, 1)).toBe(10)
  })

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['数字字符串', '8'],
    ['null', null]
  ])('非数值输入（%s）回退默认值', (_label, input) => {
    expect(normalizeNumber(input, 0, 10, 4)).toBe(4)
  })

  // min > max 时 clamp 顺序（先 max 后 min）决定结果；改成另一种顺序会静默改变回退语义。
  it('min 大于 max 时以 clamp 顺序为准', () => {
    expect(normalizeNumber(5, 10, 0, -1)).toBe(0)
  })
})
