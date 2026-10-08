import { describe, expect, it } from 'vite-plus/test'

import { clusterEnds, truncateMiddle, type WidthProbe } from '../truncate'

/**
 * 切分运算的算术面：预算分配、字素簇边界、各 `position` 的两端取舍。
 *
 * 宽度用等宽假字体（每个 UTF-16 单元 10px），这样「预期切点」是人算得出来的，断言失败时能一眼
 * 看出是预算算错了还是边界选错了。按 UTF-16 单元而不是码位计宽是有意的：真实排版下代理对的两
 * 个单元合起来才有一个字形，幅宽本来就不按单元数线性增长，这里只需要一个自洽的假度量。
 * 真实排版下的宽度由 browser spec 覆盖。
 */
const ADVANCE = 10

const ELLIPSIS = '…'

/** 落单的代理码位：高代理后面没跟低代理，或低代理前面没有高代理。切点在簇内时就会出现。 */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

const monoWidth = (text: string): number => text.length * ADVANCE

const probeFor = (text: string, marker = ELLIPSIS): WidthProbe => ({
  prefix: units => monoWidth(text.slice(0, units)),
  suffix: units => monoWidth(text.slice(text.length - units)),
  marker: () => monoWidth(marker)
})

const split = (text: string, available: number, position = 50, marker = ELLIPSIS) =>
  truncateMiddle(text, marker, position, available, probeFor(text, marker))

/** 等宽假字体下 10 个字符恰为 100px，用例一律取 90px 可用宽度：既放不下全文，又都是整数切点。 */
const TEXT = 'abcdefghij'
const NARROW = 90

/*
 * 组合序列的几个常量写的是**字面量**，不是转义：U+200D（ZWJ）与 U+0301（组合尖音符）在编辑器里
 * 零宽或与基字符重叠，改这里必须按码位核对，肉眼看不出有没有丢。本文件初版就是字面量里的 ZWJ
 * 全没了，`Intl.Segmenter` 于是把一家三口切成三个独立聚类，用例却仍按「一个簇」断言，红得像是
 * 实现的问题。
 */
const ZWJ = '‍'
const ACUTE = 'é'
const PARTY = '\u{1F389}'
const FAMILY = `\u{1F468}${ZWJ}\u{1F469}${ZWJ}\u{1F467}`

describe('clusterEnds', () => {
  it('空串没有簇', () => {
    expect(clusterEnds('')).toEqual([])
  })

  it('末项恒为文本长度', () => {
    const ends = clusterEnds('abcdef')
    expect(ends[ends.length - 1]).toBe(6)
  })

  it('代理对不拆开', () => {
    // PARTY 占 2 个 UTF-16 单元，但只是 1 个簇
    expect(clusterEnds(`a${PARTY}b`)).toEqual([1, 3, 4])
  })

  it('组合符不与其基字符分开', () => {
    expect(clusterEnds(`${ACUTE}x`)).toEqual([2, 3])
  })

  it('ZWJ 序列算一个簇', () => {
    expect(clusterEnds(`${FAMILY}!`)).toEqual([8, 9])
  })
})

describe('truncateMiddle 的预算分配（等宽假字体）', () => {
  it('放得下就原样返回，不产生省略号', () => {
    expect(split(TEXT, 100)).toEqual({ head: TEXT, tail: '', truncated: false })
    expect(split(TEXT, 200)).toEqual({ head: TEXT, tail: '', truncated: false })
  })

  it('position 50 从头尾各取一半预算', () => {
    // 可用 90、标记 10 ⇒ 两端各 40 ⇒ 各 4 个字符
    expect(split(TEXT, NARROW)).toEqual({ head: TEXT.slice(0, 4), tail: TEXT.slice(6), truncated: true })
  })

  it('position 0 把标记贴到行末，只剩头部', () => {
    // 两端额度 (1-0):0 ⇒ 头部 80、尾部 0
    expect(split(TEXT, NARROW, 0)).toEqual({ head: 'abcdefgh', tail: '', truncated: true })
  })

  it('position 100 把标记贴到行首，只剩尾部', () => {
    expect(split(TEXT, NARROW, 100)).toEqual({ head: '', tail: TEXT.slice(2), truncated: true })
  })

  it('position 越界时按 0–100 夹紧', () => {
    expect(split(TEXT, NARROW, -20)).toEqual(split(TEXT, NARROW, 0))
    expect(split(TEXT, NARROW, 480)).toEqual(split(TEXT, NARROW, 100))
  })

  it('两端预算按比例分摊，不是平均分字符数', () => {
    // position 30 ⇒ 头 56、尾 24 ⇒ 头 5 个字符、尾 2 个字符
    expect(split(TEXT, NARROW, 30)).toEqual({ head: 'abcde', tail: 'ij', truncated: true })
  })

  it('多字符标记按自身宽度占用空间', () => {
    // 标记 '[..]' 占 40 ⇒ 两端各 25 ⇒ 各 2 个字符
    expect(split(TEXT, NARROW, 50, '[..]')).toEqual({ head: 'ab', tail: 'ij', truncated: true })
  })

  it('标记自己都放不下时只剩标记，不退回全文', () => {
    // 退回全文会把标记挤出盒外，用户连「这里被截断了」的信号都看不到
    expect(split(TEXT, 5)).toEqual({ head: '', tail: '', truncated: true })
  })

  it('空文本不截断', () => {
    expect(split('', 0)).toEqual({ head: '', tail: '', truncated: false })
  })

  it('两端各自守额度，互不吃掉对方的额度', () => {
    for (const position of [0, 20, 50, 80, 100]) {
      const { head, tail, truncated } = split(TEXT, NARROW, position)
      if (!truncated) throw new Error(`position ${position} 应当截断`)
      const space = NARROW - ADVANCE
      expect(monoWidth(head)).toBeLessThanOrEqual(space * (1 - position / 100))
      expect(monoWidth(tail)).toBeLessThanOrEqual(space * (position / 100))
    }
  })
})

describe('truncateMiddle 的切点边界', () => {
  const samples = [
    `a${PARTY}b${PARTY}c`,
    ACUTE.repeat(3),
    `${FAMILY}!x`,
    'very-long-file-name-abcdefghij.txt',
    '中文文件名很长的测试文档.docx'
  ]

  it('切点只落在字素簇边界：head 是前缀、tail 是后缀，且都不含落单的代理码位', () => {
    for (const text of samples) {
      for (let available = 0; available <= monoWidth(text); available += 1) {
        const { head, tail } = split(text, available)
        expect(text.startsWith(head)).toBe(true)
        expect(text.endsWith(tail)).toBe(true)
        expect(LONE_SURROGATE.test(head)).toBe(false)
        expect(LONE_SURROGATE.test(tail)).toBe(false)
      }
    }
  })

  it('两端不重叠：head 与 tail 不会盖住同一段原文', () => {
    for (const text of samples) {
      for (let available = 0; available <= monoWidth(text); available += 1) {
        const { head, tail } = split(text, available)
        expect(head.length + tail.length).toBeLessThanOrEqual(text.length)
      }
    }
  })
})
