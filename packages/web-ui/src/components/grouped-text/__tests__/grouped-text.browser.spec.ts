import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { mountElement } from '@/shared/test-utils'

import type { WebUiGroupedText } from '..'

/**
 * 只有真实排版与浏览器原生搜索后端能证明的几件事：
 *
 * 1. 页内查找按**原始连续串**命中（`window.find` 走浏览器自己的搜索后端，会穿 open shadow root）；
 * 2. 由查找落成的真实选区，内容就是原文里连续的那一段——末组整段、跨组边界的几位，都不多不少；
 * 3. 组间没有盒外间隙、间隙段带着自己的字符。
 *
 * 剩下的三条需要真实输入设备与系统剪贴板，一次性探针量过（结论与取证口径见
 * docs/research/web-ui-grouped-text-261102.md），不搬进常驻测试：拖选逐位选择、双击选词、剪贴板
 * 逐码位等于 `value`、以及选区高亮在组间没有洞——前两条在 Vitest 的 browser `page` 上没有输入设备
 * 可驱动（合成 PointerEvent 不产生原生选区），后两条依赖系统剪贴板与逐像素取色，在 CI 机器负载与
 * 字体回退下会红。这里用 1–3 顶住同一批回归：分隔符进文本节点、空占位、组元素上的 `margin`、组上的
 * `inline-block` 都会红在其中至少一条上；只有挂在末位字符**之后**的 `margin-right` 量不出来，见下面
 * 那条说明。
 */
const CARD = '6222021234567890'
const AMOUNT = '1234567.89'

const STYLE = 'font: 20px/2 monospace;'

afterEach(() => document.body.replaceChildren())

const mount = (attrs: Record<string, string>): WebUiGroupedText =>
  mountElement<WebUiGroupedText>('web-ui-grouped-text', { attrs: { style: STYLE, ...attrs } })

const groupsOf = (el: WebUiGroupedText): HTMLElement[] => [
  ...((el.shadowRoot?.querySelectorAll('.group') ?? []) as NodeListOf<HTMLElement>)
]

const selectionText = (): string => getSelection()?.toString() ?? ''

const clearSelection = (): void => {
  document.getSelection()?.removeAllRanges()
}

/*
 * `window.find` 是浏览器实现都有、规范里没有的 API，lib.dom 与 @types/jsdom 都不声明它。
 * 这里只补测试用到的那一个重载。
 */
declare global {
  interface Window {
    find(needle: string): boolean
  }
}

/*
 * 用 `window.find` 取一段选区：它由浏览器的搜索后端落成真实 Range，内容就是「这一段字在页面上
 * 连续存在」的证据。常驻测试不做鼠标拖拽与双击——Vitest 的 browser `page` 不暴露输入设备，
 * 而合成 PointerEvent 不会触发原生选区。逐位拖选、双击选词与系统剪贴板逐码位由一次性探针量过
 * （见上面那段说明与调研报告）。
 */
const selectByFind = (needle: string): boolean => {
  clearSelection()
  return window.find(needle)
}

describe('web-ui-grouped-text 的页内查找（浏览器）', () => {
  it('用原始连续串查找能命中组件内部的文本', async () => {
    const el = mount({ value: CARD, groups: 'card' })
    await el.updateComplete
    clearSelection()

    expect(window.find(CARD)).toBe(true)
    expect(selectionText()).toBe(CARD)
  })

  /*
   * 跨越组边界的子串。组与组之间只有字距、没有任何字符，所以 '0212345' 这种「后半组 + 整组 +
   * 前半组」的连续串在原文里真实存在，查找也必须命中——分隔符一旦进了文本节点，红的是这一条。
   */
  it('跨越组边界的连续子串同样命中', async () => {
    const el = mount({ value: CARD, groups: 'card' })
    await el.updateComplete
    clearSelection()

    expect(window.find('0212345')).toBe(true)
    expect(selectionText()).toBe('0212345')
  })

  /*
   * 金额的小数点是真内容，不是排版装饰：按原串查找命中，把点去掉则必须失配。
   * 这一条防的是「为了分组把点当分隔符处理掉」。
   */
  it('小数点算内容：带点命中、去点失配', async () => {
    const el = mount({ value: AMOUNT, groups: 'amount' })
    await el.updateComplete
    clearSelection()

    expect(window.find(AMOUNT)).toBe(true)
    clearSelection()
    expect(window.find('123456789')).toBe(false)
  })
})

describe('web-ui-grouped-text 的选区（浏览器）', () => {
  /*
   * 组的边界不是选区的边界。末组可以整组选中（复制银行卡号尾四位是真实用法），跨边界的几位也能
   * 一次选中——两种形态拿到的都必须是原文里连续的一段，不多不少。
   */
  it('末组整段可选中，跨组边界的几位也可选中', async () => {
    const el = mount({ value: CARD, groups: 'card' })
    await el.updateComplete

    expect(selectByFind('7890')).toBe(true)
    expect(selectionText()).toBe('7890')

    // '2021' 是首组末位 + 次组前三位
    expect(selectByFind('2021')).toBe(true)
    expect(selectionText()).toBe('2021')
  })

  it('整串可以一次选中', async () => {
    const el = mount({ value: CARD, groups: 'card' })
    await el.updateComplete

    expect(selectByFind(CARD)).toBe(true)
    expect(selectionText()).toBe(CARD)
  })
})

describe('web-ui-grouped-text 的间隙（浏览器）', () => {
  /**
   * 一个元素里第一段**字**的墨迹盒。
   *
   * 用 Range 而不是元素的 `getBoundingClientRect()`：元素盒含 padding 与 margin，而选区高亮跟着的是
   * 文本片段——量元素盒的话，`padding-left`／`margin-left` 撑出的洞会被读成「字符紧贴前一位」。
   */
  const firstCharBox = (node: Element): DOMRect | null => {
    for (const child of node.childNodes) {
      if (child.nodeType !== Node.TEXT_NODE || child.textContent === '') continue
      const range = document.createRange()
      range.selectNodeContents(child)
      return range.getBoundingClientRect()
    }
    return null
  }

  /*
   * 间隙挂在末位字符**之后**，不允许把它从同组的前一位挪开：挪在字符之间的段（`margin-left`／
   * `padding-left`）落在两个文本片段之外，选区高亮会在组间断开一条等宽的洞，而 `::selection`
   * 用不了布局属性，补不掉。
   *
   * 这条只管组内，管不到字符之后的那一段：`margin-right` 撑出的洞与此处几何相同，四条断言全绿，
   * 只有逐像素取色能分辨（探针量过，见调研报告）。「间隙确实存在且每处边界各一份」由下面两条量。
   */
  it('间隙落在末位字符之后，字符之间不被挪开', async () => {
    const el = mount({ value: CARD, groups: 'card' })
    await el.updateComplete

    let checked = 0
    for (const node of groupsOf(el)) {
      const gap = node.querySelector('.gap')
      if (!gap) continue
      const bodyBox = firstCharBox(node)
      const gapBox = firstCharBox(gap)
      if (!bodyBox || !gapBox) throw new Error('组内缺少文本片段')
      expect(Math.abs(gapBox.left - bodyBox.right)).toBeLessThan(0.5)
      checked += 1
    }
    // 一个片段都没量到说明 .gap 全没了，这种形状变化不能静默放行
    expect(checked).toBeGreaterThan(0)
  })

  /*
   * 组盒两两相接：`margin`／`padding` 加在**组元素**上会在这里量出一段盒间距离。与上一条各管一侧——
   * 上一条管组内，这一条管组间。
   */
  it('相邻组的盒边界相接，组间没有盒外间隙', async () => {
    const el = mount({ value: CARD, groups: 'card' })
    await el.updateComplete

    const boxes = groupsOf(el).map(node => node.getBoundingClientRect())
    for (let i = 0; i < boxes.length - 1; i += 1) {
      expect(Math.abs(boxes[i + 1]!.left - boxes[i]!.right)).toBeLessThan(0.5)
    }
  })

  /** 每一处组边界都拿到一份间隙：间隙是「边界」的属性，组的数量决定它的总量。 */
  it('间隙宽度随 token 增长，每处组边界各一份', async () => {
    const tight = mount({ value: CARD, groups: 'card', style: `${STYLE}--wui-grouped-text-gap: 0px` })
    const loose = mount({ value: CARD, groups: 'card', style: `${STYLE}--wui-grouped-text-gap: 8px` })
    await Promise.all([tight.updateComplete, loose.updateComplete])

    // 4 组 ⇒ 3 处边界，每处 8px
    expect(loose.getBoundingClientRect().width - tight.getBoundingClientRect().width).toBeGreaterThan(23)
    expect(loose.getBoundingClientRect().width - tight.getBoundingClientRect().width).toBeLessThan(25)
  })

  /*
   * 间隙挂在每组末位字素簇自己身上：那段必须是装着字符的真实文本，不能是空占位。
   * 空占位盒（`::after` 或空 span）带不进选区高亮，正是上一条会漏掉的那种形状。
   */
  it('每组末位的间隙段带着自己的字符，末组不留间隙', async () => {
    const el = mount({ value: CARD, groups: 'card' })
    await el.updateComplete

    const nodes = groupsOf(el).map(node => node.querySelector('.gap'))
    expect(nodes.slice(0, 3).map(node => node?.textContent)).toEqual(['2', '2', '6'])
    expect(nodes[3]).toBeNull()
  })
})
