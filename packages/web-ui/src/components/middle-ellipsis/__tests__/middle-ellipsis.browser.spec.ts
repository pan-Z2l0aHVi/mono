import { afterEach, describe, expect, it } from 'vite-plus/test'

import { mountElement } from '@/shared/test-utils'

import '..'
import type { WebUiMiddleEllipsis } from '..'

/**
 * 中间省略的用户可见后果：**屏幕上到底是哪串字**。
 *
 * 这里断言的每一条都要求真实排版——可用空间、字素簇边界、截断后的实际占宽都只有真浏览器给
 * 得出（jsdom 没有布局）。切分算术本身在 `truncate.spec.ts` 用等宽假字体覆盖，这个文件补的是
 * 「把算术接进真实排版之后还成立吗」。
 *
 * 断言全部写成相对关系（谁比谁长、宽度有没有越界），不写死字符数：等宽字体在不同平台的度量
 * 不完全一致，写死数字会把平台差异记成回归。
 */
afterEach(() => document.body.replaceChildren())

/** 定宽等宽字体：可用空间是确定值，切点可复现。 */
const FIXTURE_STYLE = 'width: 200px; font: 16px/1.5 monospace;'

const LONG = 'very-long-file-name-abcdefghij.txt'

/** 与 `LONG` 等长、但仍会溢出的另一串：换 text 的用例要的是「换完还得截」。 */
const NEXT = 'another-equally-long-file-name-klmnopqrst.txt'

/** 落单的代理码位：高代理后面没跟低代理，或低代理前面没有高代理。切点落在簇内时就会出现。 */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

const ZWJ = '‍'

/** 组合符（含变音符号）：出现在 tail 开头意味着它和自己的基字符被切开了。 */
const COMBINING_MARK = /^\p{M}/u

const mount = (attrs: Record<string, string> = {}, style = FIXTURE_STYLE): WebUiMiddleEllipsis =>
  mountElement<WebUiMiddleEllipsis>('web-ui-middle-ellipsis', { attrs: { style, ...attrs } })

const textElOf = (el: WebUiMiddleEllipsis): HTMLElement => {
  const node = el.shadowRoot?.querySelector<HTMLElement>('.text')
  if (!node) throw new Error('web-ui-middle-ellipsis 缺少文本层')
  return node
}

const shown = (el: WebUiMiddleEllipsis): string => textElOf(el).textContent ?? ''

const shownWidth = (el: WebUiMiddleEllipsis): number => textElOf(el).getBoundingClientRect().width

const availableWidth = (el: WebUiMiddleEllipsis): number => el.clientWidth

const nextFrame = (): Promise<number> => new Promise(resolve => requestAnimationFrame(resolve))

/**
 * 等到渲染与 ResizeObserver 都落定。
 *
 * 切分由渲染完成后的实测触发，重新切又会排一次更新，因此「等一次 updateComplete」不够；
 * 多跨两帧让尺寸回调与随之而来的重渲染都跑完。
 */
const settle = async (el: WebUiMiddleEllipsis): Promise<void> => {
  await el.updateComplete
  await nextFrame()
  await el.updateComplete
  await nextFrame()
  await el.updateComplete
}

/** 按中间标记拆出两端；用例的 fixture 文本里不含标记，因此第一处出现就是组件插入的那个。 */
const parts = (el: WebUiMiddleEllipsis, marker = '…'): { head: string; tail: string; count: number } => {
  const text = shown(el)
  const at = text.indexOf(marker)
  if (at < 0) return { head: text, tail: '', count: 0 }
  return { head: text.slice(0, at), tail: text.slice(at + marker.length), count: 1 }
}

/**
 * 断言当前渲染确实是按 `text` 截断过的：有标记、title 是全文、两端都取自原文。
 *
 * 判据不能只看宽度——`overflow: hidden` 会让「没切」与「切了」在屏幕上都能看，没切的那一版同样放得下。
 *
 * 调用方仍需在测试体内写一条字面 `expect(...)`：门禁 `vitest/expect-expect` 不认断言封装
 * （同 `shared/test-utils` 里的说明），这是本仓库对复用断言的既有约束。
 */
const expectTrimmedTo = (el: WebUiMiddleEllipsis, text: string): void => {
  const { head, tail, count } = parts(el)
  expect(count).toBe(1)
  expect(text.startsWith(head)).toBe(true)
  expect(text.endsWith(tail)).toBe(true)
  expect(head.length + tail.length).toBeLessThan(text.length)
  expect(textElOf(el).getAttribute('title')).toBe(text)
}

describe('web-ui-middle-ellipsis 的截断形态（浏览器）', () => {
  it('放得下时原样显示，不出现标记也不写 title', async () => {
    const el = mount({ text: 'short.txt' })
    await settle(el)

    expect(shown(el)).toBe('short.txt')
    expect(textElOf(el).hasAttribute('title')).toBe(false)
  })

  it('放不下时保留首尾、丢掉中间，标记出现在两者之间', async () => {
    const el = mount({ text: LONG })
    await settle(el)

    const { head, tail, count } = parts(el)
    expect(count).toBe(1)
    expect(head.length).toBeGreaterThan(0)
    expect(tail.length).toBeGreaterThan(0)
    expect(head).not.toBe(LONG)
    // 两端都必须是原文里真实存在的一段：head 取开头、tail 取结尾
    expect(LONG.startsWith(head)).toBe(true)
    expect(LONG.endsWith(tail)).toBe(true)
    expect(head.length + tail.length).toBeLessThan(LONG.length)
  })

  it('文件名尾部（扩展名）留在屏幕上，这正是与末尾省略的区别', async () => {
    const el = mount({ text: LONG })
    await settle(el)

    expect(shown(el)).toContain('.txt')
    expect(shown(el).startsWith('very-')).toBe(true)
  })

  it('渲染宽度不越过可用空间', async () => {
    const el = mount({ text: LONG })
    await settle(el)

    // 越界会被 overflow 裁掉尾字符，属于可见缺陷；容差留给亚像素取整
    expect(shownWidth(el)).toBeLessThanOrEqual(availableWidth(el) + 1)
  })

  it('截断时把全文写进 title，未截断时不留', async () => {
    const el = mount({ text: LONG })
    await settle(el)
    expect(textElOf(el).getAttribute('title')).toBe(LONG)

    el.text = 'short.txt'
    await settle(el)
    expect(textElOf(el).hasAttribute('title')).toBe(false)
  })

  it('空文本不渲染任何东西', async () => {
    const el = mount({ text: '' })
    await settle(el)

    expect(shown(el)).toBe('')
    expect(textElOf(el).hasAttribute('title')).toBe(false)
  })

  /*
   * 运行时换 text，且换成一个**仍然溢出**的值。
   *
   * 前半段（换到放得下的短串）由 title 那条用例覆盖，但它证明不了这条路径：`willUpdate` 在输入
   * 变化时先把渲染退回全文，那个赋值本身就足以让短串显示正确，掩盖掉「重切有没有发生」。换成一个
   * 仍然溢出的值才逼出真正的判据——切分必须按新文本重算，而不是留在旧的一版上。
   */
  it('运行时把 text 换成仍然溢出的值会重新切分', async () => {
    const el = mount({ text: LONG })
    await settle(el)
    const first = shown(el)

    el.text = NEXT
    await settle(el)

    expect(shown(el)).not.toBe(first)
    expectTrimmedTo(el, NEXT)
  })

  /*
   * 「无布局期间换 text，回到文档时宽度同宽或更窄」。
   *
   * 这条路径上「有未落的拟合」必须活过那趟被跳过的 `_apply`：宿主不可见时宽度是 0，切分做不了，
   * 标记只能留着；恢复时若宽度与上次相同或更窄，任何以「宽度没变 / 当前输出放得下」为由的短路
   * 都会把它彻底丢掉——屏幕上剩下一段被 `overflow: hidden` 硬裁的全文，既没有标记也没有 title。
   *
   * 四条用例覆盖四种时序，但它们**不等价**，这是变异测出来的（把 `_onWidth` 的两条短路还原成不看
   * 未落拟合的版本）：隐藏后同宽、隐藏后更窄、脱离期间跨过一帧这三条会红；**脱离期间不跨帧那条仍然
   * 绿**——它的 text 变更更新在重连时还没跑，那趟更新带着真实宽度执行，短路拦不到。留着它是因为它
   * 覆盖的是另一种真实时序，不是因为它钉住了这个缺陷。
   */
  it('隐藏期间换 text，再以相同宽度显示回来会重新切分', async () => {
    const el = mount({ text: LONG })
    await settle(el)

    el.style.display = 'none'
    await settle(el)
    el.text = NEXT
    await settle(el)
    el.style.display = 'block'
    await settle(el)

    expect(shown(el)).toContain('…')
    expectTrimmedTo(el, NEXT)
  })

  it('脱离文档期间换 text，再以相同宽度放回来会重新切分', async () => {
    const parent = document.createElement('div')
    parent.style.cssText = 'width: 200px;'
    document.body.append(parent)
    const el = mountElement<WebUiMiddleEllipsis>('web-ui-middle-ellipsis', {
      attrs: { text: LONG, style: 'width: 200px; font: 16px/1.5 monospace;' },
      parent
    })
    await settle(el)

    el.remove()
    el.text = NEXT
    parent.append(el)
    await settle(el)

    expect(shown(el)).toContain('…')
    expectTrimmedTo(el, NEXT)
  })

  it('脱离文档期间换 text 并跨过一帧，再以相同宽度放回来会重新切分', async () => {
    const parent = document.createElement('div')
    parent.style.cssText = 'width: 200px;'
    document.body.append(parent)
    const el = mountElement<WebUiMiddleEllipsis>('web-ui-middle-ellipsis', {
      attrs: { text: LONG, style: 'width: 200px; font: 16px/1.5 monospace;' },
      parent
    })
    await settle(el)

    el.remove()
    el.text = NEXT
    // 脱离期间也把一轮渲染走完：列表回收复用正是「节点还在，但已经不显示了」的那种时序
    await settle(el)
    parent.append(el)
    await settle(el)

    expect(shown(el)).toContain('…')
    expectTrimmedTo(el, NEXT)
  })

  it('隐藏期间换 text，再以更窄的宽度显示回来会重新切分', async () => {
    const el = mount({ text: LONG })
    await settle(el)

    el.style.display = 'none'
    await settle(el)
    el.text = NEXT
    await settle(el)
    el.style.display = 'block'
    el.style.width = '120px'
    await settle(el)

    expect(shown(el)).toContain('…')
    expectTrimmedTo(el, NEXT)
    expect(shownWidth(el)).toBeLessThanOrEqual(availableWidth(el) + 1)
  })
})

describe('web-ui-middle-ellipsis 的容器变化（浏览器）', () => {
  it('容器变宽后显示更多内容，变窄后显示更少', async () => {
    const el = mount({ text: LONG })
    await settle(el)
    const narrow = shown(el)

    el.style.width = '400px'
    await settle(el)
    const wide = shown(el)
    expect(wide.length).toBeGreaterThan(narrow.length)
    expect(LONG.startsWith(parts(el).head)).toBe(true)

    el.style.width = '120px'
    await settle(el)
    expect(shown(el).length).toBeLessThan(narrow.length)
  })

  it('容器宽到放得下全文时收回截断', async () => {
    const el = mount({ text: LONG })
    await settle(el)
    expect(shown(el)).not.toBe(LONG)

    el.style.width = '600px'
    await settle(el)

    expect(shown(el)).toBe(LONG)
    expect(textElOf(el).hasAttribute('title')).toBe(false)
  })

  /*
   * 自撑宽度的宿主会被自己变窄的内容再触发一次尺寸回调。这一对用例分别钉住两种结局，它们是**不一样**
   * 的：上面的 flex 情形（等宽 16px）只走一步就自己停住——缩掉的量小于一个簇宽时二分落回同一组切点——
   * 所以那条用例在摘掉收敛守卫时仍然绿；下面这条（`width: fit-content` + 非居中标记 + CJK）会一路
   * 棘轮下去，摘掉守卫后逐帧塌到只剩标记（实测 300px 容器里 282→266→…→10，九步见底）。
   * 守卫承重的证据在下面那条，不在上面那条。
   */
  it('自撑宽度的宿主多帧渲染结果稳定，不塌到只剩标记', async () => {
    // flex 主轴 auto 时宿主宽度由内容决定：截短 → 量到更窄 → 再截短
    const row = document.createElement('div')
    row.style.cssText = 'display: flex; width: 300px; font: 16px/1.5 monospace;'
    document.body.append(row)
    const el = mountElement<WebUiMiddleEllipsis>('web-ui-middle-ellipsis', {
      attrs: { text: LONG, style: 'flex: 0 1 auto; min-width: 0;' },
      parent: row
    })

    await settle(el)
    const first = shown(el)
    for (let i = 0; i < 5; i += 1) {
      await settle(el)
      expect(shown(el)).toBe(first)
    }

    const { head, tail } = parts(el)
    expect(head.length).toBeGreaterThan(3)
    expect(tail.length).toBeGreaterThan(0)
  })

  /*
   * 收敛守卫真正承重的形态。`width: fit-content` 在内容缩到容器以内之后就让宿主跟着内容走，
   * 而 CJK 每个字素簇都是一个整宽块、`marker-position: 80` 又把大头预算给了尾部——两者合起来使
   * 「切短一簇」与「宿主窄一簇」互相咬合，自驱动收缩一步都不会自己停。摘掉 `_onWidth` 的守卫，
   * 这条逐帧塌到只剩标记；留着则逐帧不变。
   */
  it('fit-content 宿主 + 非居中标记：自驱动收缩不会一路棘轮到只剩标记', async () => {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'width: 300px; font: 16px/1.5 monospace;'
    document.body.append(wrap)
    const el = mountElement<WebUiMiddleEllipsis>('web-ui-middle-ellipsis', {
      attrs: {
        text: '中'.repeat(40),
        'marker-position': '80',
        style: 'width: fit-content; max-width: 100%;'
      },
      parent: wrap
    })

    await settle(el)
    const first = shown(el)
    for (let i = 0; i < 8; i += 1) {
      await settle(el)
      expect(shown(el)).toBe(first)
    }

    const { head, tail } = parts(el)
    expect(head.length).toBeGreaterThan(0)
    expect(tail.length).toBeGreaterThan(0)
  })

  it('移出文档再放回来仍按新宽度重算', async () => {
    const el = mount({ text: LONG })
    await settle(el)
    const before = shown(el)

    el.remove()
    el.style.width = '400px'
    document.body.append(el)
    await settle(el)

    expect(shown(el).length).toBeGreaterThan(before.length)
  })
})

describe('web-ui-middle-ellipsis 的属性（浏览器）', () => {
  it('marker 换成自定义串后按新标记切分', async () => {
    const el = mount({ text: LONG, marker: '[..]' })
    await settle(el)

    const { head, tail, count } = parts(el, '[..]')
    expect(count).toBe(1)
    expect(head.length).toBeGreaterThan(0)
    expect(tail.length).toBeGreaterThan(0)
    expect(LONG.startsWith(head)).toBe(true)
    expect(LONG.endsWith(tail)).toBe(true)
  })

  /*
   * 空标记是文档里写明的用法（「截断但不给可见信号」），也是唯一一种靠肉眼分不出「切了」与
   * 「没切」的形态——两端直接拼在一起。判据因此落在长度与 title 上，而不是「有没有省略号」。
   */
  it('marker 为空串时仍然截断，只是不给可见信号', async () => {
    const el = mount({ text: LONG, marker: '' })
    await settle(el)

    const text = shown(el)
    expect(text).not.toContain('…')
    expect(text.length).toBeLessThan(LONG.length)
    expect(LONG.startsWith(text.slice(0, 4))).toBe(true)
    expect(LONG.endsWith(text.slice(-4))).toBe(true)
    expect(textElOf(el).getAttribute('title')).toBe(LONG)
  })

  it('marker-position 0 只留头部，100 只留尾部', async () => {
    const start = mount({ text: LONG, 'marker-position': '0' })
    await settle(start)
    expect(parts(start).tail).toBe('')
    expect(parts(start).head.length).toBeGreaterThan(0)

    const end = mount({ text: LONG, 'marker-position': '100' })
    await settle(end)
    expect(parts(end).head).toBe('')
    expect(parts(end).tail.length).toBeGreaterThan(0)
  })

  it('marker-position 越界时夹到 0–100 而不是原样透传', async () => {
    const el = mount({ text: LONG })
    await settle(el)

    el.markerPosition = 480
    await settle(el)
    expect(el.markerPosition).toBe(100)
    expect(el.getAttribute('marker-position')).toBe('100')

    el.markerPosition = Number.NaN
    await settle(el)
    expect(el.markerPosition).toBe(50)
  })

  it('改 marker-position 会重新切分，且两端随比例此消彼长', async () => {
    const el = mount({ text: LONG })
    await settle(el)
    const balanced = parts(el)

    // 位置越大，标记越靠近行首 ⇒ 尾部额度越大、头部越短（文件名要的就是这个方向）
    el.markerPosition = 80
    await settle(el)
    const tailHeavy = parts(el)

    expect(tailHeavy.head.length).toBeLessThan(balanced.head.length)
    expect(tailHeavy.tail.length).toBeGreaterThan(balanced.tail.length)
  })
})

describe('web-ui-middle-ellipsis 的文本形态（浏览器）', () => {
  const CASES: Array<[string, string]> = [
    ['中英混排', '项目报告-final-终稿-abcdefghij.docx'],
    ['超长无空格', 'a'.repeat(120)],
    ['CJK 长串', '中'.repeat(60)],
    ['emoji 与组合序列', `screenshot-\u{1F389}-\u{1F468}\u200D\u{1F469}-abcdefghij.png`],
    // 密集组合符：切点落在簇内时几乎一定把某个变音符号与它的基字符切开
    ['组合符密集', `${'e\u0301'.repeat(24)}.txt`],
    ['RTL 混排', '\u05D3\u05D5\u05D7-\u05D9\u05E9\u05D9\u05D1\u05EA-\u05D4\u05E0\u05D4\u05DC\u05D4-abcdefghij.txt']
  ]

  it.each(CASES)('%s：两端都是原文的连续片段，且没有落单的代理码位', async (_name, text) => {
    const el = mount({ text })
    await settle(el)

    const { head, tail, count } = parts(el)
    expect(count).toBe(1)
    expect(text.startsWith(head)).toBe(true)
    expect(text.endsWith(tail)).toBe(true)
    expect(LONE_SURROGATE.test(head)).toBe(false)
    expect(LONE_SURROGATE.test(tail)).toBe(false)
    expect(head.length + tail.length).toBeLessThan(text.length)
  })

  /*
   * 独立于实现的分段性质断言：**不**引用 `clusterEnds`。拿实现的边界函数当期望值是同义反复——
   * 把分段器换成按码元切，两边一起变，断言照样绿。
   *
   * 但要如实说明这层网有多密：分段语义本身由 `truncate.spec.ts` 用手算期望钉住（那几条是实打实
   * 会被变异打红的），这里的价值是端到端兜底——真实排版下切点被劈开时才会红。实测把 `clusterEnds`
   * 换成按码元切，这一组仍是绿的，原因是 Chromium 会把 Range 的边界吸附到字素簇上：组合符与 ZWJ
   * 的推进量为 0，切在它们中间量出来的宽度与切在簇边界上完全相同，二分因此总落在簇边界那一档。
   * 同一串扫过若干档宽度，是为了让「切点落在哪」随宽度走一遍，而不是只验一个偶然安全的位置。
   */
  it.each(CASES)('%s：切点不劈开代理对、组合符或 ZWJ 序列', async (_name, text) => {
    for (const width of [90, 130, 170, 210, 250, 290]) {
      const el = mount({ text }, `width: ${width}px; font: 16px/1.5 monospace;`)
      await settle(el)

      const { head, tail } = parts(el)
      expect(LONE_SURROGATE.test(head)).toBe(false)
      expect(LONE_SURROGATE.test(tail)).toBe(false)
      expect(head.endsWith(ZWJ)).toBe(false)
      expect(tail.startsWith(ZWJ)).toBe(false)
      expect(COMBINING_MARK.test(tail)).toBe(false)
    }
  })

  it.each(CASES)('%s：不换行，渲染宽度仍不越过可用空间', async (_name, text) => {
    const el = mount({ text })
    await settle(el)

    expect(shownWidth(el)).toBeLessThanOrEqual(availableWidth(el) + 1)
    // 单个行盒：双向文本会被拆成多个 client rect（每个方向一段），但它们的 top 相同，
    // 折行会让 top 拉开一个行高。
    const tops = [...textElOf(el).getClientRects()].map(rect => Math.round(rect.top))
    expect(new Set(tops).size).toBe(1)
  })
})
