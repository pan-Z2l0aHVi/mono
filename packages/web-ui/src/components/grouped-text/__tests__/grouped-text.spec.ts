import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { mountElement, waitForUpdate } from '@/shared/test-utils'

import type { WebUiGroupedText } from '..'
import { groupedRuns, parseGroupsAttribute, resolveGroups } from '../grouping'

/**
 * 组形算术：每组覆盖原文的哪一段。
 *
 * 断言写成「组的字面串」而不是内部区间索引，是因为用户能看见的只有屏幕上的那几段字；索引算错
 * 会以「某组少一位」的形态红在这里，而不是在浏览器里靠肉眼发现。
 *
 * `body + gap` 的拼接顺序就是渲染顺序，所以这一条同时是「组间不含任何补位字符」的证据：整串
 * 拼回去必须逐字等于 `value`，多一个空格都会在这里红。间隙只走字距，不走字符。
 */
const shapesOf = (value: string, groups: Parameters<typeof groupedRuns>[1]) =>
  groupedRuns(value, groups).map(run => run.body + run.gap)

const CARD = '6222021234567890'

describe('groupedRuns 的组形', () => {
  it('card 每 4 位一组', () => {
    expect(shapesOf(CARD, 'card')).toEqual(['6222', '0212', '3456', '7890'])
  })

  it('phone 按 3-4-4 分', () => {
    expect(shapesOf('13800138000', 'phone')).toEqual(['138', '0013', '8000'])
  })

  it('amount 整数部分从右往左每 3 位一组，小数点连同小数部分自成一组', () => {
    expect(shapesOf('1234567.89', 'amount')).toEqual(['1', '234', '567', '.89'])
  })

  it('amount 没有小数点时整串按 3 位从右往左切', () => {
    expect(shapesOf('1234567', 'amount')).toEqual(['1', '234', '567'])
    expect(shapesOf('12345678', 'amount')).toEqual(['12', '345', '678'])
  })

  /*
   * 小数点跟着小数部分，不单独成组：单独成组会让它**两侧**都被撑开，屏幕上读成 `567 . 89`，
   * 把分隔符从自己的数字上拆开了。这条断言钉的是那个排版的错。
   */
  it('amount 的小数点不单独成组', () => {
    const shapes = shapesOf('1234567.89', 'amount')
    expect(shapes).not.toContain('.')
    expect(shapes[shapes.length - 1]).toBe('.89')
  })

  /*
   * 小数点必须**后面还有内容**才算：结尾的 `123456.` 没有小数段，那个点属于整数段的一部分。
   */
  it('amount 只认后面还有内容的小数点', () => {
    expect(shapesOf('1234.50', 'amount')).toEqual(['1', '234', '.50'])
    expect(shapesOf('123456.', 'amount')).toEqual(['1', '234', '56.'])
  })

  it('位数多于预设组形时沿用最后一档继续切，一个字符都不丢', () => {
    // card 是「每 4 位一组」，19 位不是 4 的整数倍：末组放剩下的 3 位
    expect(shapesOf('1'.repeat(19), 'card')).toEqual(['1111', '1111', '1111', '1111', '111'])
  })

  it('位数少于组形时末组就是剩下的部分', () => {
    expect(shapesOf('123456', 'card')).toEqual(['1234', '56'])
  })

  it('显式数组按逐组字素簇数切，位数用完沿用最后一档', () => {
    expect(shapesOf('123456789012', [3, 5])).toEqual(['123', '45678', '9012'])
  })

  it('省略 groups 时整串自成一组，不留间隙', () => {
    const runs = groupedRuns(CARD, undefined)
    expect(runs).toEqual([{ body: CARD, gap: '' }])
  })

  it('空值不产生任何组', () => {
    expect(groupedRuns('', 'card')).toEqual([])
  })

  it('组形里的非正整数与小数被丢掉，丢光后等于不分组', () => {
    expect(shapesOf('123456', [4, 0, -2, 1.5])).toEqual(['1234', '56'])
    expect(groupedRuns('123456', [0])).toEqual([{ body: '123456', gap: '' }])
  })

  /*
   * 只有一字符的组整组落在带字距的那一段里（`body` 为空）。这是切分的必然结果，不是特例分支：
   * 间隙挂在「这一组的末位字素簇」上，末位就是唯一位时它自己便是那一段。
   */
  it('单字符组的字素簇落在间隙段里', () => {
    const runs = groupedRuns('1234567.89', 'amount')
    expect(runs[0]).toEqual({ body: '', gap: '1' })
  })
})

describe('groupedRuns 不引入任何字符，也不劈开字素簇', () => {
  /*
   * 组合序列按码位构造，不写字面量：U+200D 零宽、U+0301 与基字符重叠，编辑器里看不出「e + 尖音符」
   * 和预组合的 U+00E9 有什么区别，而这两者的簇数正好差一倍——写成字面量时，
   * 「组合符不切开」那条断言测的就是一串单簇字符。
   */
  const ZWJ = String.fromCodePoint(0x200d)
  const ACUTE = String.fromCodePoint(0x65, 0x301)
  const FAMILY = `\u{1F468}${ZWJ}\u{1F469}${ZWJ}\u{1F467}`
  /* 希伯来文按码位写：拼写检查词典没收这些词，为测试样例往仓库级词典加词不值得。 */
  const HEBREW = String.fromCodePoint(0x5d3, 0x5d5, 0x5de, 0x2d, 0x5d9, 0x5d5, 0x5de, 0x5d9)
  const CASES: Array<[string, string]> = [
    ['代理对', `a${FAMILY}b${FAMILY}c`],
    ['组合符', `${ACUTE.repeat(10)}.txt`],
    ['CJK 与数字混排', '项目报告-2026-final-终稿.docx'],
    ['RTL 混排', `${HEBREW}-2026.txt`]
  ]

  it.each(CASES)('%s：各段拼回去逐字等于原文', (_name, value) => {
    for (const groups of ['card', 'phone', 'amount', [1], [7]] as const) {
      expect(
        groupedRuns(value, groups)
          .map(run => run.body + run.gap)
          .join('')
      ).toBe(value)
    }
  })

  /*
   * 切点只许落在字素簇边界：`body` 与 `gap` 各自必须是原文里连续的一段，且合起来正好是那一组。
   * 按 UTF-16 下标切会把 ZWJ 序列与组合符从中间劈开，屏幕上出现半个 emoji 比「这一组少一位」
   * 严重得多——所以这里断言的是「组边界处有没有半个码位」，不是「长度对不对」。
   */
  const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/
  const COMBINING_START = /^\p{M}/u

  it.each(CASES)('%s：切点不劈开代理对、组合符或 ZWJ 序列', (_name, value) => {
    for (const run of groupedRuns(value, [1])) {
      for (const piece of [run.body, run.gap]) {
        expect(LONE_SURROGATE.test(piece)).toBe(false)
        expect(COMBINING_START.test(piece)).toBe(false)
        // 零宽连接符不能单独成为一组的一端：它必须和自己的基字符待在一起
        expect(piece).not.toBe(ZWJ)
      }
    }
  })

  it('每组恰好是 groups 指定的字素簇数，末组除外', () => {
    const value = `${FAMILY}1234`
    // 簇序列：👨‍👩‍👧 1 2 3 4 ⇒ [2,2,1]
    expect(shapesOf(value, [2, 2])).toEqual([`${FAMILY}1`, '23', '4'])
  })
})

describe('parseGroupsAttribute', () => {
  it('认预设名', () => {
    expect(parseGroupsAttribute('card')).toBe('card')
    expect(parseGroupsAttribute('phone')).toBe('phone')
    expect(parseGroupsAttribute('amount')).toBe('amount')
    expect(parseGroupsAttribute(' card ')).toBe('card')
  })

  it('认逗号或空格分隔的逐组位数', () => {
    expect(parseGroupsAttribute('4,4,4,4')).toEqual([4, 4, 4, 4])
    expect(parseGroupsAttribute('3 4 4')).toEqual([3, 4, 4])
  })

  /*
   * 读不出一律退回**不分组**，不做「取能用的那半截」这种静默降级：属性写错时屏幕上少一层间隙是
   * 可以接受的，把身份证号按 4 位切开则是看得见的错切。
   */
  it('读不出的写法退回不分组', () => {
    expect(parseGroupsAttribute(null)).toBeUndefined()
    expect(parseGroupsAttribute('')).toBeUndefined()
    expect(parseGroupsAttribute('   ')).toBeUndefined()
    expect(parseGroupsAttribute('cards')).toBeUndefined()
    expect(parseGroupsAttribute('0,4')).toBeUndefined()
    expect(parseGroupsAttribute('4.5')).toBeUndefined()
    expect(parseGroupsAttribute('card,4')).toBeUndefined()
  })
})

/*
 * 写入形态的收口（见 `GroupedTextGroupsInput`）：attribute 与 property 两条通道最终都过这里，
 * 所以字符串与数组两种写法必须给出同一个组形。
 */
describe('resolveGroups', () => {
  it('字符串走同一份解析，数组原样透传', () => {
    expect(resolveGroups('4,4,4,4')).toEqual([4, 4, 4, 4])
    expect(resolveGroups('card')).toBe('card')
    expect(resolveGroups('cards')).toBeUndefined()
    expect(resolveGroups([4, 4, 4, 4])).toEqual([4, 4, 4, 4])
    expect(resolveGroups(undefined)).toBeUndefined()
  })
})

/*
 * 组件的文本面（jsdom）。
 *
 * 这里刻意读 shadowRoot 里的节点：`shared/test-utils` 默认禁止碰内部结构，因为这个组件的公开契约
 * 恰恰**就是内部文本怎么排**——剪贴板、页内查找与双击选词拿到的都是「文本节点拼起来的那一串」，
 * 它坏掉不是样式退化而是功能失效。真实排版的后果（间隙宽度、高亮连续性）由 browser spec 量。
 */
describe('web-ui-grouped-text 的文本面（jsdom）', () => {
  afterEach(() => document.body.replaceChildren())

  const mount = (attrs: Record<string, string>): WebUiGroupedText =>
    mountElement<WebUiGroupedText>('web-ui-grouped-text', { attrs })

  const textNodesOf = (root: ShadowRoot): Text[] => {
    const found: Text[] = []
    const walk = (node: Node): void => {
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) found.push(child as Text)
        else if (child instanceof Element) walk(child)
      }
    }
    walk(root)
    return found
  }

  /** 屏幕上真正落出来的组，读 shadow DOM 而不是纯函数的返回值。 */
  const renderedGroups = (el: WebUiGroupedText): string[] =>
    [...(el.shadowRoot?.querySelectorAll('.group') ?? [])].map(node => node.textContent ?? '')

  it('内部文本节点拼回去等于 value，且没有模板空白漏进来', async () => {
    const el = mount({ value: CARD, groups: 'card' })
    await waitForUpdate(el)

    const root = el.shadowRoot
    expect(root?.textContent).toBe(CARD)
    // 标记里的换行与缩进会被 Lit 落成文本节点，复制时当场跟着出去
    expect(textNodesOf(root!).every(node => node.data.trim() !== '')).toBe(true)
    // 组件不吃插槽：light DOM 保持空，value 才是唯一的内容来源
    expect(el.textContent).toBe('')
  })

  it('带空格的原文同样逐字保留', async () => {
    const el = mount({ value: 'call 13800138000 now', groups: 'phone' })
    await waitForUpdate(el)
    expect(el.shadowRoot?.textContent).toBe('call 13800138000 now')
  })

  it('属性侧的逐组位数解析成数组，并按它分组', async () => {
    const el = mount({ value: CARD, groups: '4,4,4,4' })
    await waitForUpdate(el)

    expect(el.groups).toEqual([4, 4, 4, 4])
    expect(el.shadowRoot?.textContent).toBe(CARD)
  })

  /*
   * Vue 这类框架发现 `'groups' in el` 成立就直接赋 property，Lit 的 `fromAttribute` 转换器一次都不会跑，
   * 于是模板里写的 `groups="4,4,4,4"` 以原样字符串进到这条通道。它必须切出与 attribute 通道一致的组：
   * 把字符串当组形读会当场读不出位数，屏幕上整串什么都不分组。
   */
  it('property 通道收同样的字符串写法，切出的组与 attribute 通道一致', async () => {
    const el = mount({ value: CARD })
    await waitForUpdate(el)

    el.groups = '4,4,4,4'
    await waitForUpdate(el)

    expect(renderedGroups(el)).toEqual(shapesOf(CARD, [4, 4, 4, 4]))
    expect(el.shadowRoot?.textContent).toBe(CARD)
  })

  it('property 通道的预设名与位数数组给出同一批组', async () => {
    const el = mount({ value: CARD })
    await waitForUpdate(el)

    el.groups = 'card'
    await waitForUpdate(el)
    const byPreset = renderedGroups(el)

    el.groups = [4, 4, 4, 4]
    await waitForUpdate(el)

    expect(byPreset).toEqual(shapesOf(CARD, 'card'))
    expect(renderedGroups(el)).toEqual(byPreset)
  })

  it('property 通道读不出的字符串退回不分组', async () => {
    const el = mount({ value: CARD })
    await waitForUpdate(el)

    el.groups = 'cards'
    await waitForUpdate(el)

    expect(renderedGroups(el)).toEqual([CARD])
  })

  /*
   * 读不出的组形退回不分组：屏幕上少一层间隙可以接受，把一串标识符按错的位数切开是看得见的错。
   */
  it('读不出的 groups 退回不分组', async () => {
    const el = mount({ value: CARD, groups: 'cards' })
    await waitForUpdate(el)

    expect(el.groups).toBeUndefined()
    expect(el.shadowRoot?.textContent).toBe(CARD)
  })

  it('运行时换 value 与 groups 后内部文本跟着走', async () => {
    const el = mount({ value: CARD, groups: 'card' })
    await waitForUpdate(el)

    el.value = '1234567.89'
    el.groups = 'amount'
    await waitForUpdate(el)

    expect(el.shadowRoot?.textContent).toBe('1234567.89')
  })

  it('清空 value 后不留任何文本', async () => {
    const el = mount({ value: CARD, groups: 'card' })
    await waitForUpdate(el)

    el.value = ''
    await waitForUpdate(el)

    expect(el.shadowRoot?.textContent).toBe('')
  })
})

/*
 * separator 的文本面。
 *
 * 分隔符只许落在生成内容里（CSS 生成内容在 jsdom 观测不到，真实渲染由 browser spec 量），文本节点
 * 是它的禁区：复制、页内查找与双击选词读的都是文本节点的 data，多一个字组件唯一的硬需求当场失效。
 * 渲染通道（`data-separator` attribute 挂在哪几组上）是这里唯一可观测的落点，断言它挂对位置——
 * 挂到末组上，行尾就会多出一个看得见的分隔符。
 */
describe('web-ui-grouped-text 的 separator（jsdom）', () => {
  afterEach(() => document.body.replaceChildren())

  const mount = (attrs: Record<string, string>): WebUiGroupedText =>
    mountElement<WebUiGroupedText>('web-ui-grouped-text', { attrs })

  const markedGroups = (el: WebUiGroupedText): HTMLElement[] => [
    ...((el.shadowRoot?.querySelectorAll('.group[data-separator]') ?? []) as NodeListOf<HTMLElement>)
  ]

  it('默认不开分隔符：任何组上都没有渲染通道，文本层逐字等于 value', async () => {
    const el = mount({ value: CARD, groups: 'card' })
    await waitForUpdate(el)

    expect(markedGroups(el)).toEqual([])
    expect(el.shadowRoot?.textContent).toBe(CARD)
  })

  it('开了分隔符后文本层仍逐字等于 value，分隔符不进文本节点', async () => {
    const el = mount({ value: CARD, groups: 'card', separator: '-' })
    await waitForUpdate(el)

    expect(el.shadowRoot?.textContent).toBe(CARD)
    expect(markedGroups(el)).not.toEqual([])
  })

  it('分隔符挂在末组之外的每组上，取值就是 separator', async () => {
    const el = mount({ value: CARD, groups: 'card', separator: '-' })
    await waitForUpdate(el)

    const groups = [...(el.shadowRoot?.querySelectorAll('.group') ?? [])]
    const marked = markedGroups(el)
    // card 是 4 组：前 3 组各带一个「与下一组之间」的分隔符，末组后面没有下一组
    expect(marked).toEqual(groups.slice(0, -1))
    expect(marked.every(node => node.getAttribute('data-separator') === '-')).toBe(true)
    expect(groups[groups.length - 1]?.hasAttribute('data-separator')).toBe(false)
  })

  it('整串自成一组时没有组边界，分隔符不渲染', async () => {
    const el = mount({ value: CARD, separator: '-' })
    await waitForUpdate(el)

    expect(markedGroups(el)).toEqual([])
    expect(el.shadowRoot?.textContent).toBe(CARD)
  })

  it('空串与默认等价，运行时清空后渲染通道整个摘掉', async () => {
    const el = mount({ value: CARD, groups: 'card', separator: '-' })
    await waitForUpdate(el)

    el.separator = ''
    await waitForUpdate(el)

    expect(markedGroups(el)).toEqual([])
    expect(el.shadowRoot?.textContent).toBe(CARD)
  })
})
