import { afterEach, beforeAll, describe, expect, it } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import '..'
import { cleanupElement, mountElement, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiEditableText } from '..'

import parityFontUrl from './fixtures/inconsolata-parity-subset.ttf'

afterEach(() => document.body.replaceChildren())

/** 固定盒宽与等宽字体：落点坐标、换行行数可复现，排除字体度量差异。 */
const FIXTURE_STYLE = 'width: 260px; padding: 8px; font: 16px/1.5 monospace;'

/** 故意长到在内容盒里折成多行的文案，用于暴露换行点漂移。 */
const WRAPPED_TEXT = 'overlay parity across wrapped lines in a fixed width box'

/**
 * 逐像素比对的确定性字体：打包的 Inconsolata 子集（OFL，见 fixtures 目录）经 FontFace
 * 加载，16px 下 advance 恰为 8px，ascent/descent 用 descriptor 覆盖为 14px/4px。
 * 系统字体栈随平台变化（CI 容器里的 monospace 与开发机不是同一个文件），分数 advance
 * 会把逐字形 x 原点放到亚像素上，Linux 的取整/提示路径据此抖动，两层随之错位；
 * 原点全部钉在整数网格后任何取整都是 no-op，0px 断言才跨平台成立。
 */
const PARITY_FONT_FAMILY = 'WuiEditableTextParity'
const PARITY_FONT_METRICS = { advance: 8, ascent: 14, descent: 4, size: 16 }

/**
 * 逐像素比对的感知阈（单像素最大通道差）：字体方案把 overlay 差异从 CI 上的 5365
 * 像素 / 最大通道差 102 压到 6 像素 / Δ2，残差全部来自灰度 AA 取整，肉眼不可见。
 * 超过 2 的通道差才计入差异——位移、换行点漂移、盒错位会把字形边缘在墨色与背景
 * 之间整体翻转，通道差在 100 量级，对这类结构差异保持零容忍；≤2 的残差忽略。
 */
const PARITY_CHANNEL_TOLERANCE = 2

/** 8px advance 下 200px 内容盒折 3 行，保留多行折行点覆盖。 */
const parityFixtureStyle = (lineHeight: number): string =>
  `width: 200px; padding: 8px; font: ${PARITY_FONT_METRICS.size}px/${lineHeight} ${PARITY_FONT_FAMILY};`

const loadParityFont = async (): Promise<void> => {
  const face = new FontFace(PARITY_FONT_FAMILY, `url(${parityFontUrl})`, {
    ascentOverride: `${(PARITY_FONT_METRICS.ascent / PARITY_FONT_METRICS.size) * 100}%`,
    descentOverride: `${(PARITY_FONT_METRICS.descent / PARITY_FONT_METRICS.size) * 100}%`
  })
  await face.load()
  document.fonts.add(face)
  await document.fonts.load(`${PARITY_FONT_METRICS.size}px ${PARITY_FONT_FAMILY}`)
  await document.fonts.ready
}

const mount = (attrs: Record<string, string> = {}): WebUiEditableText =>
  mountElement<WebUiEditableText>('web-ui-editable-text', { attrs: { style: FIXTURE_STYLE, ...attrs } })

const editorOf = (el: WebUiEditableText): HTMLTextAreaElement => queryA11y(el, 'textarea') as HTMLTextAreaElement
const textLayerOf = (el: WebUiEditableText): HTMLElement => queryA11y(el, 'span') as HTMLElement

const nextFrame = (): Promise<number> => new Promise(resolve => requestAnimationFrame(resolve))

const rectsClose = (a: DOMRect, b: DOMRect): boolean =>
  Math.abs(a.left - b.left) < 0.5 &&
  Math.abs(a.top - b.top) < 0.5 &&
  Math.abs(a.width - b.width) < 0.5 &&
  Math.abs(a.height - b.height) < 0.5

/** 元素内容盒：border box 减去 padding/border，只取公开的计算样式。 */
const contentBoxOf = (el: Element): DOMRect => {
  const box = el.getBoundingClientRect()
  const style = getComputedStyle(el)
  const inset = (side: 'left' | 'right' | 'top' | 'bottom'): number =>
    parseFloat(style.getPropertyValue(`padding-${side}`)) + parseFloat(style.getPropertyValue(`border-${side}-width`))
  const left = inset('left')
  const top = inset('top')
  return new DOMRect(
    box.left + left,
    box.top + top,
    box.width - left - inset('right'),
    box.height - top - inset('bottom')
  )
}

/** 编辑层四边覆盖给定盒：它的裁剪盒就是自身 border box，必须不窄于文本层的墨色范围。 */
const covers = (outer: DOMRect, inner: DOMRect): boolean =>
  outer.left <= inner.left + 0.5 &&
  outer.top <= inner.top + 0.5 &&
  outer.right >= inner.right - 0.5 &&
  outer.bottom >= inner.bottom - 0.5

/** 文本层上承载文案的 Text 节点：Lit 会在首个绑定前留注释标记，不能取 firstChild。 */
const textNodeOf = (el: WebUiEditableText): Text => {
  for (const child of textLayerOf(el).childNodes) {
    if (child instanceof Text) return child
  }
  throw new Error('text layer should render a text node')
}

/** 取文本层上 offset 处的 caret 视口矩形（零宽），把点击坐标换算成字符偏移。 */
const caretRectAt = (el: WebUiEditableText, offset: number): DOMRect => {
  const range = document.createRange()
  range.setStart(textNodeOf(el), offset)
  range.setEnd(textNodeOf(el), offset)
  return range.getBoundingClientRect()
}

/** 真实指针点击组件内某点（坐标相对宿主 padding 盒），走完整命中与默认聚焦链路。 */
const clickAt = async (el: WebUiEditableText, x: number, y: number): Promise<void> => {
  await page.elementLocator(el).click({ position: { x, y } })
}

/** 点击文本层 offset 处字符的左缘内 1px，预期落点为该 offset。 */
const clickCaretOffset = async (el: WebUiEditableText, offset: number): Promise<void> => {
  const host = el.getBoundingClientRect()
  const caret = caretRectAt(el, offset)
  await clickAt(el, caret.left - host.left + 1, caret.top - host.top + caret.height / 2)
}

/** 逐像素 fixture 的字体几何：advance、覆盖后的 ascent/descent，以及文本层首行基线。 */
const parityGeometryOf = (el: WebUiEditableText): Record<string, number> => {
  // 字体取元素自身的 computed style：字体没加载成功而回落到系统字体时，度量随之一起
  // 变，锁才能发现；写死字体族只会量到 FontFace 自己。
  const style = getComputedStyle(el)
  const ctx = document.createElement('canvas').getContext('2d')!
  ctx.font = `${style.fontSize} ${style.fontFamily}`
  const advance = ctx.measureText('M'.repeat(10)).width / 10
  const { fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent } = ctx.measureText('Mg')
  // 首字符的 Range 矩形是 em 盒（顶缘 = 基线 - ascent），加回 ascent 即基线坐标
  return { advance, ascent, descent, baseline: caretRectAt(el, 0).top + ascent }
}

/**
 * 在页面内解码两张截图并逐像素比对，返回超出感知阈的像素数、阈内残差数与最大通道差。
 * 文字态/编辑态 overlay 一致性是本组件的布局验收项，用像素计数判定。
 */
const pixelDiff = async (
  a: string,
  b: string
): Promise<{ exceeding: number; tolerated: number; maxDelta: number; size: string }> => {
  const load = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('screenshot decode failed'))
      image.src = src
    })
  const [first, second] = await Promise.all([load(`data:image/png;base64,${a}`), load(`data:image/png;base64,${b}`)])
  if (first.width !== second.width || first.height !== second.height) {
    return {
      exceeding: -1,
      tolerated: -1,
      maxDelta: -1,
      size: `${first.width}x${first.height} vs ${second.width}x${second.height}`
    }
  }
  const read = (image: HTMLImageElement): Uint8ClampedArray => {
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')!
    context.drawImage(image, 0, 0)
    return context.getImageData(0, 0, canvas.width, canvas.height).data
  }
  const [dataA, dataB] = [read(first), read(second)]
  let exceeding = 0
  let tolerated = 0
  let maxDelta = 0
  for (let i = 0; i < dataA.length; i += 4) {
    let pixelDelta = 0
    for (let channel = 0; channel < 4; channel++) {
      const delta = Math.abs(dataA[i + channel] - dataB[i + channel])
      if (delta > pixelDelta) pixelDelta = delta
    }
    if (pixelDelta > maxDelta) maxDelta = pixelDelta
    if (pixelDelta > PARITY_CHANNEL_TOLERANCE) exceeding++
    else if (pixelDelta > 0) tolerated++
  }
  return { exceeding, tolerated, maxDelta, size: `${first.width}x${first.height}` }
}

/** 真实焦点移出：把焦点交给组件外的一个按钮，触发编辑层 blur 提交。 */
const blurByFocusElsewhere = async (): Promise<HTMLButtonElement> => {
  const outside = document.createElement('button')
  document.body.append(outside)
  outside.focus()
  return outside
}

/**
 * 进入编辑并留下草稿：真实聚焦 + 真实按键，只有「行离开渲染窗口」这一环不是浏览器默认
 * 动作，因此失败只可能归因于卸载路径本身。
 */
const startDraft = async (el: WebUiEditableText): Promise<void> => {
  await waitForUpdate(el)
  el.focus()
  await waitForUpdate(el)
  await userEvent.keyboard(' world')
  await waitForUpdate(el)
  expect(el.value).toBe('hello world')
}

describe('WebUiEditableText 布局契约（浏览器）', () => {
  beforeAll(loadParityFont)

  it('编辑层与文本层同盒：内容盒重合、裁剪盒覆盖内容盒；切换可见性不改变宿主盒', async () => {
    const el = mount({ value: WRAPPED_TEXT })
    await waitForUpdate(el)

    const hostBefore = el.getBoundingClientRect()
    const contentBefore = contentBoxOf(el)
    const editor = editorOf(el)
    const editorBefore = editor.getBoundingClientRect()
    const editorContentBefore = contentBoxOf(editor)
    const text = textLayerOf(el).getBoundingClientRect()

    // 同盒的真正判据是文本起点一致：编辑层内容盒与宿主内容盒逐边重合，
    // 文本起点与换行宽度因此与文本层完全相同（行盒半行距不算位移）。
    expect(rectsClose(editorContentBefore, contentBefore), '编辑层内容盒与宿主内容盒重合').toBe(true)
    // 原生控件的绘制裁剪在自身盒内，编辑层四边各外扩 1px，让裁剪盒覆盖
    // 文本层字形溢出内容盒的墨色（详见 style.css 注释）。
    expect(covers(editorBefore, contentBefore), '编辑层裁剪盒覆盖宿主内容盒').toBe(true)
    // 多行折行后文本层行盒撑开宿主：编辑层绝对定位于 .layers，高度随之等量增长
    expect(textLayerOf(el).getClientRects().length, '文本层折成多行').toBeGreaterThanOrEqual(3)
    expect(text.top, '文本层顶缘不超出内容盒').toBeGreaterThanOrEqual(contentBefore.top - 0.5)
    expect(text.bottom, '文本层底缘不超出内容盒').toBeLessThanOrEqual(contentBefore.bottom + 0.5)
    expect(text.left, '文本层左缘对齐内容盒').toBeCloseTo(contentBefore.left, 1)
    expect(text.height, '文本层折行后高于单个行盒').toBeGreaterThan(parseFloat(getComputedStyle(el).lineHeight))

    el.focus()
    await waitForUpdate(el)
    expect(el.hasAttribute('editing')).toBe(true)

    expect(rectsClose(hostBefore, el.getBoundingClientRect()), '编辑态宿主盒不变').toBe(true)
    expect(rectsClose(editorBefore, editor.getBoundingClientRect()), '编辑层盒不变').toBe(true)
    expect(rectsClose(contentBoxOf(editor), editorContentBefore), '编辑态内容盒不变').toBe(true)
    expect(editor.scrollTop, '编辑层不产生滚动').toBe(0)
    expect(editor.scrollHeight, '编辑层内容不溢出自身').toBeLessThanOrEqual(editor.clientHeight + 1)
    cleanupElement(el)
  })

  /**
   * 同一份文案在文字态与编辑态的 overlay 像素差异。
   * 光标是编辑态独有绘制项，置透明后排除其对像素比对的影响。
   */
  const overlayParityDiff = async (
    style = parityFixtureStyle(1.5)
  ): Promise<{
    exceeding: number
    tolerated: number
    maxDelta: number
    size: string
    geometry: Record<string, number>
  }> => {
    const el = mount({ value: WRAPPED_TEXT, style })
    await waitForUpdate(el)
    await nextFrame()
    const displayShot = await page.elementLocator(el).screenshot({ base64: true })

    el.focus()
    await waitForUpdate(el)
    await nextFrame()
    editorOf(el).style.caretColor = 'transparent'
    await nextFrame()
    const editShot = await page.elementLocator(el).screenshot({ base64: true })
    const geometry = parityGeometryOf(el)
    cleanupElement(el)
    const diff = await pixelDiff(displayShot.base64, editShot.base64)
    return { ...diff, geometry }
  }

  it('同文案文字态/编辑态 overlay 逐像素一致', async () => {
    const diff = await overlayParityDiff()
    expect(diff.size, '两态截图尺寸一致').not.toContain('vs')
    expect(
      diff.exceeding,
      `文字态/编辑态 overlay 超出感知阈（Δ${PARITY_CHANNEL_TOLERANCE}）的像素数（${diff.size}，最大通道差 ${diff.maxDelta}，阈内残差 ${diff.tolerated} px）`
    ).toBe(0)
  })

  it('紧凑行高下 overlay 仍逐像素一致', async () => {
    // 行高小于字盒高度（16 < 18）时文本层行盒没有富余，编辑层内部内容更容易高出自身
    // 1px，是文字态/编辑态错位的高发区。
    const diff = await overlayParityDiff(parityFixtureStyle(1))
    expect(diff.size, '两态截图尺寸一致').not.toContain('vs')
    expect(
      diff.exceeding,
      `紧凑行高下 overlay 超出感知阈（Δ${PARITY_CHANNEL_TOLERANCE}）的像素数（${diff.size}，最大通道差 ${diff.maxDelta}，阈内残差 ${diff.tolerated} px）`
    ).toBe(0)
  })

  it.each([1.5, 1])('行高 %s 下逐像素 fixture 的字体几何钉在整数像素网格上', async lineHeight => {
    // 两层共用同一份字体几何；advance 与 ascent/descent 为整像素时，逐字形 x 原点
    // 与首行基线都是整数，平台相关的取整/提示不会把两层抖开。换字体或改行高破坏了
    // 整数性，这里先失败，避免 0px 断言在别的平台上悄悄失效。
    const el = mount({ value: WRAPPED_TEXT, style: parityFixtureStyle(lineHeight) })
    await waitForUpdate(el)
    const geometry = parityGeometryOf(el)
    cleanupElement(el)
    expect(geometry.advance, '等宽 advance 为整像素').toBe(PARITY_FONT_METRICS.advance)
    expect(geometry.ascent, 'ascent 覆盖为整像素').toBe(PARITY_FONT_METRICS.ascent)
    expect(geometry.descent, 'descent 覆盖为整像素').toBe(PARITY_FONT_METRICS.descent)
    expect(Number.isInteger(geometry.baseline), `基线为整像素（实际 ${geometry.baseline}）`).toBe(true)
  })

  it('输入过程中盒宽、滚动位置与换行点保持稳定', async () => {
    const el = mount({ value: 'alpha beta' })
    await waitForUpdate(el)
    const display = el.getBoundingClientRect()

    el.focus()
    await waitForUpdate(el)
    const editor = editorOf(el)
    const editing = el.getBoundingClientRect()
    expect(Math.abs(editing.width - display.width), '进入编辑不改变宽度').toBeLessThan(0.5)
    expect(Math.abs(editing.height - display.height), '进入编辑不改变高度').toBeLessThan(0.5)

    await userEvent.keyboard(' gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau')
    await waitForUpdate(el)
    await nextFrame()

    expect(editor.scrollTop, '输入后滚动位置保持 0').toBe(0)
    expect(editor.scrollHeight, '输入后内容不溢出编辑层').toBeLessThanOrEqual(editor.clientHeight)
    expect(el.getBoundingClientRect().width, '输入后宽度不变').toBeCloseTo(display.width, 1)
    expect(el.getBoundingClientRect().height, '折行后高度按行数增长').toBeGreaterThan(editing.height)
    expect(contentBoxOf(editor).height, '编辑层文本盒等高跟随文本层行盒').toBeCloseTo(contentBoxOf(el).height, 0)

    // 失焦提交：草稿成为新值，文本层按同一份文案折行，盒与编辑态一致，两层换行点没有漂移
    const beforeBlur = el.getBoundingClientRect()
    await blurByFocusElsewhere()
    await waitForUpdate(el)
    const committed =
      'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau'
    expect(el.value, '失焦提交草稿').toBe(committed)
    expect(textLayerOf(el).textContent, '文本层渲染提交后的文案').toBe(committed)
    expect(rectsClose(beforeBlur, el.getBoundingClientRect()), '提交后盒与编辑态一致').toBe(true)
    expect(el.getBoundingClientRect().width, '提交后宽度不变').toBeCloseTo(display.width, 1)
    expect(beforeBlur.height, '编辑态盒高于文字态').toBeGreaterThan(display.height)
    cleanupElement(el)
  })

  it('编辑层高度跟随自身内容，不依赖文本层折出的行盒', async () => {
    // normal 空白处理会把纯空格值在文本层折叠掉，宿主随之塌成 0 高；
    // 编辑层按自身内容撑高，空草稿才有承接光标的位置
    const el = mount({ value: '   ', style: '--wui-editable-text-white-space: normal; font:16px/1.5 monospace;' })
    await waitForUpdate(el)
    const editor = editorOf(el)
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight)

    expect(editor.clientHeight, '空闲态编辑层已按自身内容撑高').toBeGreaterThanOrEqual(lineHeight)
    expect(editor.scrollHeight, '空闲态内容不溢出自身').toBeLessThanOrEqual(editor.clientHeight + 1)

    el.focus()
    await waitForUpdate(el)
    expect(el.hasAttribute('editing')).toBe(true)
    expect(editor.clientHeight, '编辑态高度不随文本层塌陷').toBeGreaterThanOrEqual(lineHeight)
    expect(editor.scrollHeight, '编辑态内容不溢出自身').toBeLessThanOrEqual(editor.clientHeight + 1)
    cleanupElement(el)
  })

  it('清空全部内容后编辑层仍有可绘制光标的盒', async () => {
    // 收缩上下文（flex 项 + min-width:0）里，空内容把宿主压到 0 宽，
    // 编辑层随之量不到宽度，光标无处绘制（interweave 实测复现）
    const row = document.createElement('div')
    row.style.cssText = 'display:flex; align-items:center; gap:6px; width:400px; padding:8px;'
    document.body.append(row)
    const el = mountElement<WebUiEditableText>('web-ui-editable-text', {
      attrs: { value: 'a rather long drawer title here', style: 'min-width:0; font:16px/1.5 monospace;' },
      parent: row
    })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)
    for (let i = 0; i < 32; i++) await userEvent.keyboard('{Backspace}')
    await waitForUpdate(el)

    const editor = editorOf(el)
    const style = getComputedStyle(editor)
    const contentWidth = editor.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight)

    expect(el.value, '内容已清空').toBe('')
    expect(el.hasAttribute('editing')).toBe(true)
    expect(contentWidth, '空草稿下编辑层内容盒仍有宽度可绘制光标').toBeGreaterThan(0)
    expect(editor.clientHeight, '编辑层保持一个行盒高').toBeGreaterThanOrEqual(lineHeight)
    cleanupElement(row)
  })

  it('断开重连后 ResizeObserver 重建：宿主变窄仍触发 autosize', async () => {
    /*
     * RO 在 disconnectedCallback 拆除、connectedCallback 重建。搭建若只挂在
     * firstUpdated（一生一次），重连后 RO 永久丢失。只断开重连看不出来：teardown
     * 会摘掉内联高度，编辑层回落 top/bottom 拉伸，恰好跟随宿主。要露出缺陷，重连后
     * 必须先有一次重渲染把当前（宽）盒下的内联高度写进去，再收窄宿主——收窄不改变
     * 任何响应式属性、不触发重渲染，只有 RO 回调能带动 autosize；RO 丢了高度就滞留。
     */
    const el = mount({ value: 'short' })
    await waitForUpdate(el)
    const editor = editorOf(el)

    el.remove()
    await waitForUpdate(el)
    document.body.append(el)
    await waitForUpdate(el)

    el.value = WRAPPED_TEXT
    await waitForUpdate(el)
    const wideHeight = editor.getBoundingClientRect().height
    expect(wideHeight, '宽盒下编辑层按内容撑高').toBeGreaterThan(24)

    el.style.width = '120px'
    await nextFrame()
    await nextFrame()

    expect(editor.getBoundingClientRect().height, '重连后宿主变窄，编辑层高度重新跟随内容').toBeGreaterThan(wideHeight)
    expect(editor.scrollHeight, '内容不溢出自身').toBeLessThanOrEqual(editor.clientHeight + 1)
    cleanupElement(el)
  })

  it('长无空格串不断行溢出：文本层与编辑层在同一宽度断行', async () => {
    /*
     * 长字母数字串是两层断行的一致性边界：文本层 overflow-wrap 若继承宿主默认的
     * normal，长串不截断、直接溢出宿主盒（文字态），编辑层则在盒内裁剪（编辑态），
     * 两层对同一份文案给出不同行数。默认 anywhere 让两层都在盒内断行。
     */
    const token = 'abcdefghijklmnopqrstuvwxyz0123456789'.repeat(2)
    const el = mount({ value: token, style: 'width: 200px; font: 16px/1.5 monospace;' })
    await waitForUpdate(el)
    const text = textLayerOf(el)
    const editor = editorOf(el)
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight)

    const textLines = text.getClientRects().length
    expect(textLines, '文本层折成多行').toBeGreaterThan(1)
    expect(el.scrollWidth, '文字态宿主不因长串溢出').toBeLessThanOrEqual(el.clientWidth + 1)
    expect(text.getBoundingClientRect().width, '文本层宽度不超出宿主').toBeLessThanOrEqual(el.clientWidth + 0.5)

    el.focus()
    await waitForUpdate(el)
    // 编辑层 scrollHeight = 内容行高总和 + 上下各 1px 内边距
    const editorLines = Math.round((editor.scrollHeight - 2) / lineHeight)
    expect(editorLines, '编辑层折行数与文本层一致').toBe(textLines)
    expect(editor.scrollWidth, '编辑层内容不横向溢出自身').toBeLessThanOrEqual(editor.clientWidth + 1)
    expect(editor.scrollHeight, '编辑层内容不纵向溢出自身').toBeLessThanOrEqual(editor.clientHeight + 1)
    cleanupElement(el)
  })

  it('--wui-editable-text-overflow-wrap 覆盖生效：两层跟随同一变量', async () => {
    const token = 'abcdefghijklmnopqrstuvwxyz0123456789'.repeat(2)
    const el = mount({
      value: token,
      style: 'width: 200px; --wui-editable-text-overflow-wrap: normal; font: 16px/1.5 monospace;'
    })
    await waitForUpdate(el)

    expect(textLayerOf(el).getClientRects().length, '覆盖为 normal 后文本层不折行').toBe(1)

    el.focus()
    await waitForUpdate(el)
    expect(getComputedStyle(editorOf(el)).overflowWrap, '编辑层跟随同一变量').toBe('normal')
    cleanupElement(el)
  })

  it('光标颜色组件级默认跟随 --wui-color-accent，可被消费方覆盖', async () => {
    /*
     * caret 此前只有 interweave 页面级设置，其他消费方拿到浏览器默认黑。组件级
     * 默认落在共享语义 token 上：自定义属性穿透 shadow 边界继承，消费方在宿主或
     * 任意祖先上设 --wui-color-accent 即可整体改色。
     */
    const el = mount({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)
    const editor = editorOf(el)

    expect(getComputedStyle(editor).caretColor, '默认取 token 兜底值 #08f').toBe('rgb(0, 136, 255)')

    el.style.setProperty('--wui-color-accent', '#ff0000')
    await waitForUpdate(el)
    expect(getComputedStyle(editor).caretColor, '消费方覆盖 token 后光标跟随').toBe('rgb(255, 0, 0)')
    cleanupElement(el)
  })
})

describe('WebUiEditableText 交互契约（浏览器）', () => {
  it('点击文本层：光标定位到落点字符', async () => {
    const el = mount({ value: 'abcdefgh' })
    await waitForUpdate(el)

    await clickCaretOffset(el, 3)
    await waitForUpdate(el)

    const editor = editorOf(el)
    expect(el.hasAttribute('editing')).toBe(true)
    expect(document.activeElement, '焦点应进入组件').toBe(el)
    expect(el.shadowRoot!.activeElement, '焦点应落在编辑层').toBe(editor)
    expect(editor.selectionStart, '光标落在点击处').toBe(3)
    expect(editor.selectionEnd).toBe(3)
    cleanupElement(el)
  })

  it('多行文本点击第二行：光标定位到该行落点', async () => {
    const el = mount({ value: 'first line\nsecond line' })
    await waitForUpdate(el)

    const secondLineStart = 'first line\n'.length
    await clickCaretOffset(el, secondLineStart + 4)
    await waitForUpdate(el)

    expect(editorOf(el).selectionStart, '光标落在第二行落点').toBe(secondLineStart + 4)
    cleanupElement(el)
  })

  it('Tab 聚焦进入编辑，光标到末尾', async () => {
    const el = mount({ value: 'hello' })
    const trigger = document.createElement('button')
    document.body.append(trigger, el)
    await waitForUpdate(el)

    trigger.focus()
    await userEvent.keyboard('{Tab}')
    await waitForUpdate(el)

    const editor = editorOf(el)
    expect(document.activeElement, 'Tab 把焦点交给组件').toBe(el)
    expect(el.shadowRoot!.activeElement, '组件内焦点落在编辑层').toBe(editor)
    expect(editor.selectionStart, '光标到末尾').toBe(5)
    expect(editor.selectionEnd).toBe(5)
    cleanupElement(el)
  })

  it('select() 空闲态进入编辑并全选内容', async () => {
    const el = mount({ value: 'hello world' })
    await waitForUpdate(el)

    el.select()
    await waitForUpdate(el)

    const editor = editorOf(el)
    expect(el.hasAttribute('editing')).toBe(true)
    expect(document.activeElement, '焦点进入组件').toBe(el)
    expect(el.shadowRoot!.activeElement, '焦点落在编辑层').toBe(editor)
    expect(editor.selectionStart, '全选起点').toBe(0)
    expect(editor.selectionEnd, '全选末端').toBe('hello world'.length)
    expect(el.value, '值不被全选改变').toBe('hello world')
    cleanupElement(el)
  })

  it('编辑态 select() 重新全选，不退出编辑', async () => {
    const el = mount({ value: 'abcdefgh' })
    await waitForUpdate(el)

    await clickCaretOffset(el, 3)
    await waitForUpdate(el)
    expect(editorOf(el).selectionStart, '点击先落下光标').toBe(3)

    el.select()
    await waitForUpdate(el)

    const editor = editorOf(el)
    expect(el.hasAttribute('editing')).toBe(true)
    expect(editor.selectionStart, '全选起点').toBe(0)
    expect(editor.selectionEnd, '全选末端').toBe(8)
    expect(el.value, '值不被全选改变').toBe('abcdefgh')
    cleanupElement(el)
  })

  it('disabled 时 select() 不进入编辑', async () => {
    const el = mount({ value: 'hello', disabled: '' })
    await waitForUpdate(el)

    el.select()
    await waitForUpdate(el)

    expect(el.hasAttribute('editing')).toBe(false)
    expect(document.activeElement, '焦点不进入组件').not.toBe(el)
    cleanupElement(el)
  })

  it('blur 提交：草稿成为新值、派发一次 change、不派发 cancel、不抢回焦点', async () => {
    const el = mount({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    const [cancels, detachCancel] = spyEvents(el, 'cancel')
    const [changes, detachChange] = spyEvents(el, 'change')
    try {
      await userEvent.keyboard(' world')
      await waitForUpdate(el)
      expect(el.value).toBe('hello world')

      const outside = await blurByFocusElsewhere()
      await waitForUpdate(el)

      expect(changes, '提交派发一次 change').toHaveLength(1)
      expect(cancels, '提交不派发 cancel').toHaveLength(0)
      expect(el.value, '草稿成为新值').toBe('hello world')
      expect(el.hasAttribute('editing')).toBe(false)
      expect(document.activeElement, '焦点留在用户移往的位置，不被抢回宿主').toBe(outside)
    } finally {
      detachCancel()
      detachChange()
    }
    cleanupElement(el)
  })

  it('空草稿 blur 提交：空值被提交，文本层回落 placeholder', async () => {
    const el = mount({ value: 'hello', placeholder: 'Untitled' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    for (let i = 0; i < 5; i++) await userEvent.keyboard('{Backspace}')
    await waitForUpdate(el)
    expect(el.value).toBe('')

    await blurByFocusElsewhere()
    await waitForUpdate(el)

    expect(el.value, '空草稿被提交').toBe('')
    expect(textLayerOf(el).textContent, '文本层回落 placeholder').toBe('Untitled')
    expect(el.hasAttribute('editing')).toBe(false)
    cleanupElement(el)
  })

  it('Escape 取消：恢复原值、派发 cancel、不派发 change、焦点回宿主', async () => {
    const el = mount({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    const [cancels, detachCancel] = spyEvents(el, 'cancel')
    const [changes, detachChange] = spyEvents(el, 'change')
    // spy 编辑层 blur：证明取消路径上真的发生了一次焦点迁移（真实浏览器里
    // _returnFocusToHost 会把焦点从编辑层移回宿主），changes 为 0 才不是恒真
    const [editorBlurs, detachEditorBlurs] = spyEvents(editorOf(el), 'blur')
    // 浮层仲裁者在 document 捕获阶段收 Escape：它收不到，才证明按键被编辑层消费
    const documentCapture: string[] = []
    const onDocumentCapture = (e: Event) => {
      if ((e as KeyboardEvent).key === 'Escape') documentCapture.push('escape')
    }
    document.addEventListener('keydown', onDocumentCapture, true)
    try {
      await userEvent.keyboard('draft')
      await waitForUpdate(el)
      expect(el.value).toBe('hellodraft')

      await userEvent.keyboard('{Escape}')
      await waitForUpdate(el)

      expect(el.value, '恢复进入编辑时的值').toBe('hello')
      expect(cancels).toHaveLength(1)
      expect(changes).toHaveLength(0)
      expect(editorBlurs.length, '取消路径上编辑层真的被 blur 过：早退消费了这次 blur').toBeGreaterThanOrEqual(1)
      expect(documentCapture, 'Escape 不穿透到 document 捕获监听').toEqual([])
      expect(el.hasAttribute('editing')).toBe(false)
      expect(document.activeElement, '焦点回到宿主').toBe(el)
      expect(el.shadowRoot!.activeElement, '编辑层不再持有焦点').toBe(null)
    } finally {
      document.removeEventListener('keydown', onDocumentCapture, true)
      detachCancel()
      detachChange()
      detachEditorBlurs()
    }
    cleanupElement(el)
  })

  it('cancel 监听器内 el.focus() 不重新进入编辑：随后的 blur 不误提交恢复后的原值', async () => {
    /*
     * cancel 同步派发：消费者常在监听器里把焦点还给组件。真实浏览器里那是一次真实
     * 的宿主 focus——重入守卫必须先于 dispatch 置位，否则编辑态重新进入，用户随后
     * 点到别处，blur 就把恢复后的原值当成新草稿提交：用户什么都没改，却收到一次
     * change。jsdom 复现不了这条路径（shadow 聚焦时宿主已是 document.activeElement，
     * el.focus() 不派发宿主 focus），因此锁定在浏览器层。
     */
    const el = mount({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    const [cancels, detachCancel] = spyEvents(el, 'cancel')
    const [changes, detachChange] = spyEvents(el, 'change')
    const onCancel = () => el.focus()
    el.addEventListener('cancel', onCancel)
    try {
      await userEvent.keyboard('draft')
      await waitForUpdate(el)
      expect(el.value).toBe('hellodraft')

      await userEvent.keyboard('{Escape}')
      await waitForUpdate(el)

      expect(cancels, '取消派发一次 cancel').toHaveLength(1)
      expect(el.value, '值恢复进入编辑时的状态').toBe('hello')
      expect(el.hasAttribute('editing'), '监听器里的 focus 被重入守卫消费，不重新进入编辑').toBe(false)
      expect(changes, '取消不派发 change').toHaveLength(0)

      await blurByFocusElsewhere()
      await waitForUpdate(el)
      expect(changes, '随后的 blur 不误提交').toHaveLength(0)
    } finally {
      el.removeEventListener('cancel', onCancel)
      detachCancel()
      detachChange()
    }
    cleanupElement(el)
  })

  /*
   * 卸载提交（commit-on-unmount）：本组用例的行为随引擎分叉，Chromium 与 WebKit 实测结论
   * 不一致，Gecko 未取证。改这一组之前先读下面三行，别把其中一列当成通用基线：
   *
   *   Chromium —— 移除正在编辑的组件 → editor blur → change（来自 `_onBlur`）
   *   WebKit   —— 同上，但**一个事件都没有**：不派发 blur，也不派发 change
   *   Gecko    —— 未能取证
   *
   * blur 与 change 在 Chromium 上都**同步**派发，落在同一轮自定义元素回调里，不是异步；测试
   * 因此在 `remove()` 同步返回后直接断言，不等微任务也不等帧——那层等待只会掩盖次序问题。
   *
   * 两条要点：
   *
   * 1. 「卸载能不能提交」本身就是引擎相关的。Chromium 上默认路径靠 blur 提交一次，本属性在
   *    那里补的是提交判据（有无实际变更）与提交时机（blur 排在 disconnected 之后、消费方
   *    状态可能已不在场）；WebKit 上默认路径什么都不提交，本属性是那里**唯一**能让卸载提交
   *    的手段。所以下面那条锁默认行为的用例只在 Chromium 成立——本套件只跑 Chromium，在
   *    WebKit 上跑它会得到 0，那是引擎差异不是回归。
   * 2. `display: none` 两引擎一致：不派发任何事件，组件也不卸载，编辑态原样保留。因此「行被
   *    移出渲染窗口」这条路不做处理；真要处理得由消费方主动结束编辑，不是本属性的范围。
   */

  it('默认 commit-on-unmount=false：Chromium 上移除正在编辑的组件仍靠 blur 提交一次', async () => {
    /*
     * 锁住 Chromium 上的默认行为（见块首）：blur 照样到达编辑层，`_onBlur` 照常提交，本属性
     * 不得改变这个结果。**这条断言在 WebKit 上不成立**——那里移除不派发 blur，默认路径什么
     * 都不提交。本套件只跑 Chromium；在 WebKit 上跑它得到 0 是引擎差异，不是回归。
     */
    const el = mount({ value: 'hello' })
    await startDraft(el)
    expect(el.shadowRoot!.activeElement, '编辑层确实持有焦点').toBe(editorOf(el))

    const [editorBlurs, detachEditorBlurs] = spyEvents(editorOf(el), 'blur')
    const [changes, detachChange] = spyEvents(el, 'change')
    try {
      el.remove()
      await waitForUpdate(el)

      expect(editorBlurs, 'DOM 移除把 blur 派发到编辑层').toHaveLength(1)
      expect(changes, '默认路径的这次提交来自 blur，恰好一次').toHaveLength(1)
      expect(el.value, '草稿成为新值，默认路径不会丢草稿').toBe('hello world')
      expect(el.hasAttribute('editing')).toBe(false)
    } finally {
      detachEditorBlurs()
      detachChange()
    }
    cleanupElement(el)
  })

  it('commit-on-unmount：重新聚焦后的第二次草稿在卸载时不丢，也不与 blur 重复提交', async () => {
    /*
     * handoff 描述的缺口，也是本属性真正补上的那一处。提交一次后再重新聚焦会开启一段新的
     * 编辑会话（`_editBase` 重取当前值）；这段会话被虚拟化回收时，卸载成为明确的提交来源。
     *
     * 「恰好一次」在这里不是空话：commit 开启后同一会话有两条提交来源（卸载回调 + DOM 移除
     * 自带的 blur），提交若不先摘编辑态就会派发两次 change，虚拟化列表按行应用改名就会
     * 重复写一次。
     */
    const row = mountElement('div', { parent: document.body })
    const el = mount({ value: 'hello', 'commit-on-unmount': '' })
    row.append(el)
    await waitForUpdate(el)

    // 第一段：提交一次
    el.focus()
    await waitForUpdate(el)
    await userEvent.keyboard(' world')
    await waitForUpdate(el)
    expect(el.value).toBe('hello world')
    editorOf(el).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true })
    )
    await waitForUpdate(el)
    expect(el.hasAttribute('editing'), '提交后退出编辑').toBe(false)
    expect(el.value).toBe('hello world')

    // 第二段：重新聚焦，开启新的编辑会话并留下新草稿
    // Enter 已把焦点交还宿主，直接再 focus() 是空操作（不产生 focus 事件），需先 blur
    el.blur()
    el.focus()
    await waitForUpdate(el)
    expect(el.hasAttribute('editing'), '重新聚焦开启新的编辑会话').toBe(true)
    await userEvent.keyboard(' again')
    await waitForUpdate(el)
    expect(el.value).toBe('hello world again')

    const [editorBlurs, detachEditorBlurs] = spyEvents(editorOf(el), 'blur')
    const [cancels, detachCancel] = spyEvents(el, 'cancel')
    const [changes, detachChange] = spyEvents(el, 'change')
    try {
      row.remove()
      await waitForUpdate(el)

      expect(changes, '卸载提交与随后的 blur 合起来恰好一次 change').toHaveLength(1)
      expect(changes[0].bubbles, 'change 沿组合路径冒泡').toBe(true)
      expect(changes[0].composed).toBe(true)
      expect(cancels, '卸载提交不派发 cancel').toHaveLength(0)
      expect(
        editorBlurs.length,
        'DOM 移除的 blur 确实到达过（WebKit 上不派发，故本断言只在 Chromium 成立）'
      ).toBeGreaterThanOrEqual(1)
      expect(el.value, '第二次草稿成为新值，没有被丢弃').toBe('hello world again')
      expect(el.hasAttribute('editing')).toBe(false)
    } finally {
      detachEditorBlurs()
      detachCancel()
      detachChange()
    }
    cleanupElement(el)
    row.remove()
  })

  it('commit-on-unmount：与既有提交路径的差别只在提交判据，行为逐项一致', async () => {
    /*
     * 本属性复用 `_commitEditing`，因此不引入第三套语义——气泡、组合、不派发 cancel、
     * 不干预焦点，与 `blur` 提交逐项相同。这里把它们与既有路径并排断言，防止将来给卸载
     * 分支单开一条实现时漂移。
     */
    const el = mount({ value: 'hello', 'commit-on-unmount': '' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)
    await userEvent.keyboard(' world')
    await waitForUpdate(el)
    expect(el.value).toBe('hello world')

    const [cancels, detachCancel] = spyEvents(el, 'cancel')
    const [changes, detachChange] = spyEvents(el, 'change')
    try {
      el.remove()
      await waitForUpdate(el)

      expect(changes, '恰好一次').toHaveLength(1)
      expect(changes[0].bubbles, 'bubbles 与 blur 提交一致').toBe(true)
      expect(changes[0].composed, 'composed 与 blur 提交一致').toBe(true)
      expect(cancels, '提交不派发 cancel').toHaveLength(0)
      expect(el.value, '草稿成为新值').toBe('hello world')
      expect(el.hasAttribute('editing'), '退出编辑').toBe(false)
    } finally {
      detachCancel()
      detachChange()
    }
    cleanupElement(el)
  })

  it('行被移出渲染窗口不卸载组件：display:none 既不派发事件也不结束编辑', async () => {
    /*
     * 这条是实测结果（见块首第 2 点），写出来是为了把边界钉死：`display: none` 下组件
     * 仍在文档中、不会卸载，也没有 blur 可言，因此无论本属性开不开，编辑态都原样保留。
     * 想在这种形状下收尾，消费方得主动结束编辑。
     */
    const row = mountElement('div', { parent: document.body })
    const el = mount({ value: 'hello', 'commit-on-unmount': '' })
    row.append(el)
    await startDraft(el)

    const [changes, detachChange] = spyEvents(el, 'change')
    try {
      row.style.display = 'none'
      await waitForUpdate(el)

      expect(changes, '移出渲染窗口不派发 change').toHaveLength(0)
      expect(el.isConnected, '组件没有被卸载').toBe(true)
      expect(el.value, '草稿仍在').toBe('hello world')
      expect(el.hasAttribute('editing'), '编辑态原样保留').toBe(true)
    } finally {
      row.style.display = ''
      detachChange()
    }
    cleanupElement(el)
    row.remove()
  })

  it('commit-on-unmount：不在编辑态被移除是空提交，不派发 change', async () => {
    const el = mount({ value: 'hello', 'commit-on-unmount': '' })
    await waitForUpdate(el)
    expect(el.hasAttribute('editing')).toBe(false)

    const [changes, detachChange] = spyEvents(el, 'change')
    try {
      el.remove()
      await waitForUpdate(el)

      expect(changes, '空闲态被移除不派发 change').toHaveLength(0)
      expect(el.value).toBe('hello')
    } finally {
      detachChange()
    }
    cleanupElement(el)
  })

  it('默认：宿主持有焦点时被移除靠 blur 提交一次，本属性不改变这一结果', async () => {
    /*
     * 与第一条对照：焦点落在宿主上时，DOM 移除会派发 blur，默认行为照常提交一次 change。
     * 这条把那半边的实测固定成契约，避免日后误把默认行为读成「DOM 移除一律不提交」。
     */
    const el = mount({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)
    expect(el.hasAttribute('editing')).toBe(true)
    await userEvent.keyboard(' world')
    await waitForUpdate(el)
    expect(el.value).toBe('hello world')

    const [editorBlurs, detachEditorBlurs] = spyEvents(editorOf(el), 'blur')
    const [changes, detachChange] = spyEvents(el, 'change')
    try {
      el.remove()
      await waitForUpdate(el)

      expect(
        editorBlurs.length,
        'DOM 移除后的 blur 确实到达（WebKit 上不派发，故本断言只在 Chromium 成立）'
      ).toBeGreaterThanOrEqual(1)
      expect(changes, '默认行为的这次提交来自 blur，恰好一次').toHaveLength(1)
      expect(el.value).toBe('hello world')
      expect(el.hasAttribute('editing')).toBe(false)
    } finally {
      detachEditorBlurs()
      detachChange()
    }
    cleanupElement(el)
  })

  it('commit-on-unmount：宿主持有焦点时被移除不与 blur 重复提交', async () => {
    /*
     * 这半个焦点归属下开启后多一条提交来源：卸载回调提交一次，随后的 blur 到达时编辑态
     * 已摘除而早退。这条锁住「恰好一次」——提交若不先摘编辑态，同一次移除就会拿到两次
     * change，虚拟化列表按行应用改名就会重复写一次。
     */
    const el = mount({ value: 'hello', 'commit-on-unmount': '' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)
    await userEvent.keyboard(' world')
    await waitForUpdate(el)
    expect(el.value).toBe('hello world')

    const [editorBlurs, detachEditorBlurs] = spyEvents(editorOf(el), 'blur')
    const [changes, detachChange] = spyEvents(el, 'change')
    try {
      el.remove()
      await waitForUpdate(el)

      expect(
        editorBlurs.length,
        '随后的 blur 确实到达过（WebKit 上不派发，故本断言只在 Chromium 成立）'
      ).toBeGreaterThanOrEqual(1)
      expect(changes, '卸载提交与随后的 blur 合起来恰好一次 change').toHaveLength(1)
      expect(el.value).toBe('hello world')
      expect(el.hasAttribute('editing')).toBe(false)
    } finally {
      detachEditorBlurs()
      detachChange()
    }
    cleanupElement(el)
  })

  it('commit-on-unmount：readonly 卸载退出编辑、不派发 change', async () => {
    /*
     * readonly 的 blur 与 Enter 都只退出编辑、不派发 change（见 `_onBlur` 与 Enter 分支）。
     * 卸载路径同样不派发，原因有两条且各自独立：`_onInput` 把 readonly 的输入挡在 `_value`
     * 之外，草稿恒等于基线，于是「有无实际变更」判据不成立；没有提交就没有收尾，编辑态
     * 照常由 DOM 移除带来的 blur 摘掉。这里锁住的是与既有两条路径相同的对外行为。
     */
    const el = mount({ value: 'hello', readonly: '', 'commit-on-unmount': '' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)
    await userEvent.keyboard(' world')
    await waitForUpdate(el)
    expect(el.value, 'readonly 拒绝输入，没有草稿').toBe('hello')

    const [cancels, detachCancel] = spyEvents(el, 'cancel')
    const [changes, detachChange] = spyEvents(el, 'change')
    try {
      el.remove()
      await waitForUpdate(el)

      expect(changes, 'readonly 卸载不派发 change').toHaveLength(0)
      expect(cancels).toHaveLength(0)
      expect(el.value).toBe('hello')
      expect(el.hasAttribute('editing'), '编辑态照常退出').toBe(false)
    } finally {
      detachCancel()
      detachChange()
    }
    cleanupElement(el)
  })

  it('commit-on-unmount：change 到达随宿主一起被卸载的祖先监听器', async () => {
    /*
     * 虚拟化列表的实际形态：行容器本身也在被回收。监听器挂在即将消失的祖先上时 change
     * 仍必须送达——派发沿组合路径上行，不要求祖先此刻还在文档里。这条同时排除了
     * 「在 disconnectedCallback 里因宿主已不在文档中而跳过派发」的实现。
     */
    const row = mountElement('div', { parent: document.body })
    const el = mount({ value: 'hello', 'commit-on-unmount': '' })
    row.append(el)
    await startDraft(el)

    const seenByRow: Event[] = []
    const onRowChange = (e: Event) => seenByRow.push(e)
    row.addEventListener('change', onRowChange)
    const [changes, detachChange] = spyEvents(el, 'change')
    try {
      row.remove()
      await waitForUpdate(el)

      expect(changes).toHaveLength(1)
      expect(seenByRow, '祖先自身也已被卸载，change 依然到达').toHaveLength(1)
      expect(seenByRow[0], '祖先听到的是同一个事件对象').toBe(changes[0])
      expect(el.isConnected, '断言时组件确实已在文档外').toBe(false)
    } finally {
      row.removeEventListener('change', onRowChange)
      detachChange()
    }
    cleanupElement(el)
    row.remove()
  })

  it('commit-on-unmount：remove 后同任务重新挂载，卸载仍提交一次且不与 blur 重复', async () => {
    /*
     * 列表复用节点的形状：同一个任务里摘下再挂到别处（虚拟化窗口平移、key 复用都可能）。
     * 实施中实测到这条的事件序反常——blur 派发在 disconnectedCallback 之后，但 change 落到
     * **重新挂载之后**才到达监听器，因此消费方在那一刻读到的组件已经是接在别处的同一个节点。
     * 开启本属性后提交发生在卸载回调内，change 在重新挂载之前就派发，监听器读到的是它提交
     * 的那个节点；随后的 blur 因编辑态已摘除而早退。
     */
    const rowA = mountElement('div', { parent: document.body })
    const rowB = mountElement('div', { parent: document.body })
    const el = mount({ value: 'hello', 'commit-on-unmount': '' })
    rowA.append(el)
    await startDraft(el)

    const seenByRowA: Event[] = []
    const onRowAChange = (e: Event) => seenByRowA.push(e)
    rowA.addEventListener('change', onRowAChange)
    const [editorBlurs, detachEditorBlurs] = spyEvents(editorOf(el), 'blur')
    const [changes, detachChange] = spyEvents(el, 'change')
    try {
      rowA.remove()
      rowB.append(el)
      await waitForUpdate(el)

      expect(changes, '卸载提交恰好一次').toHaveLength(1)
      expect(seenByRowA, 'change 在重新挂载前派发，仍到达原祖先监听器').toHaveLength(1)
      expect(seenByRowA[0], '祖先听到的是同一个事件对象').toBe(changes[0])
      expect(el.value, '草稿成为新值').toBe('hello world')
      expect(el.hasAttribute('editing')).toBe(false)
      expect(
        editorBlurs.length,
        '随后的 blur 确实到达过，但编辑态已摘除（WebKit 上不派发，故本断言只在 Chromium 成立）'
      ).toBeGreaterThanOrEqual(1)
    } finally {
      rowA.removeEventListener('change', onRowAChange)
      detachEditorBlurs()
      detachChange()
    }
    cleanupElement(el)
    rowA.remove()
    rowB.remove()
  })

  it('默认：remove 后同任务重新挂载，change 落到重新挂载之后才被监听器读到', async () => {
    /*
     * 与上一条对照，把实测到的默认行为固定成契约：blur 排在 disconnectedCallback 之后，
     * 而它触发的 change 直到组件重新挂载才到达监听器。消费方若依赖这条提交，读到的会是
     * 一个已经接在别处的节点——这是开启 commit-on-unmount 的实际理由之一。
     */
    const rowA = mountElement('div', { parent: document.body })
    const rowB = mountElement('div', { parent: document.body })
    const el = mount({ value: 'hello' })
    rowA.append(el)
    await startDraft(el)

    const connectedAtDispatch: boolean[] = []
    const [changes, detachChange] = spyEvents(el, 'change')
    const onChange = () => connectedAtDispatch.push(el.isConnected)
    el.addEventListener('change', onChange)
    try {
      rowA.remove()
      rowB.append(el)
      await waitForUpdate(el)

      expect(changes, '默认路径仍提交一次').toHaveLength(1)
      expect(connectedAtDispatch, '监听器收到 change 时组件已经重新挂载').toEqual([true])
    } finally {
      el.removeEventListener('change', onChange)
      detachChange()
    }
    cleanupElement(el)
    rowA.remove()
    rowB.remove()
  })

  it('Enter 提交：派发 change、退出编辑、不插入换行', async () => {
    const el = mount({ value: 'first' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    const [changes, detach] = spyEvents(el, 'change')
    const [cancels, detachCancel] = spyEvents(el, 'cancel')
    // spy 编辑层 blur：交还焦点触发的那次 blur 必须被早退消费，否则同一次提交
    // 会拿到两次 change（真实浏览器里这次焦点迁移必然发生）
    const [editorBlurs, detachEditorBlurs] = spyEvents(editorOf(el), 'blur')
    try {
      await userEvent.keyboard('{Enter}')
      await waitForUpdate(el)

      const editor = editorOf(el)
      expect(editor.value, 'Enter 不产生换行').toBe('first')
      expect(el.value).toBe('first')
      expect(el.hasAttribute('editing')).toBe(false)
      expect(editorBlurs.length, '提交路径上编辑层真的被 blur 过：早退消费了这次 blur').toBeGreaterThanOrEqual(1)
      expect(changes, '提交派发一次 change').toHaveLength(1)
      expect(cancels, '提交不派发 cancel').toHaveLength(0)
      expect(document.activeElement, '焦点回宿主').toBe(el)
    } finally {
      detach()
      detachCancel()
      detachEditorBlurs()
    }
    cleanupElement(el)
  })

  it('placeholder 态点击进入编辑，草稿为空', async () => {
    const el = mount({ placeholder: 'Untitled' })
    await waitForUpdate(el)
    expect(textLayerOf(el).textContent, '空值回落 placeholder').toBe('Untitled')

    const box = el.getBoundingClientRect()
    await clickAt(el, box.width / 2, box.height / 2)
    await waitForUpdate(el)

    const editor = editorOf(el)
    expect(el.hasAttribute('editing')).toBe(true)
    expect(editor.value, '草稿为空').toBe('')
    expect(el.shadowRoot!.activeElement).toBe(editor)
    cleanupElement(el)
  })

  it('disabled 时点击不进入编辑且移出 tab 序列', async () => {
    const el = mount({ value: 'hello', disabled: '' })
    await waitForUpdate(el)
    expect(el.hasAttribute('tabindex')).toBe(false)

    const box = el.getBoundingClientRect()
    await clickAt(el, box.width / 2, box.height / 2)
    await waitForUpdate(el)

    expect(el.hasAttribute('editing')).toBe(false)
    expect(document.activeElement, '焦点不进入组件').not.toBe(el)
    cleanupElement(el)
  })

  it('Escape 不穿透外层浮层：shadow 内 dialog 收不到关闭请求', async () => {
    /*
     * issue #159 的实测形态：web-ui-drawer 把 <dialog> 放进自己 shadow 并监听原生
     * cancel，消费者的 editable-text 经 slot 投映其中。Escape 被编辑层消费要求两件事
     * 同时成立：keydown 被 preventDefault（UA 不派发原生 cancel），自定义 cancel 不
     * 冒泡（进不了 dialog 的 cancel 监听）。任一条失守都会把外层浮层一起关掉。
     */
    if (!customElements.get('x-dialog-cancel-probe')) {
      customElements.define(
        'x-dialog-cancel-probe',
        class extends HTMLElement {
          readonly dialog = document.createElement('dialog')
          cancelCount = 0
          constructor() {
            super()
            this.attachShadow({ mode: 'open' }).append(this.dialog)
            this.dialog.append(document.createElement('slot'))
            this.dialog.addEventListener('cancel', e => {
              this.cancelCount += 1
              // 与 drawer.handleCancel 同构：收到 cancel 就走完整关闭管线
              e.preventDefault()
              this.dialog.close()
            })
          }
        }
      )
    }
    const overlay = mountElement<HTMLElement & { dialog: HTMLDialogElement; cancelCount: number }>(
      'x-dialog-cancel-probe'
    )
    const { dialog } = overlay
    dialog.showModal()
    const el = mount({ value: 'hello' })
    overlay.append(el)
    await waitForUpdate(el)
    try {
      el.focus()
      await waitForUpdate(el)
      await userEvent.keyboard('draft')
      await waitForUpdate(el)
      expect(el.value).toBe('hellodraft')

      await userEvent.keyboard('{Escape}')
      await waitForUpdate(el)

      expect(dialog.open, '外层 dialog 保持打开').toBe(true)
      expect(overlay.cancelCount, 'dialog 的 cancel 监听一次都不该响').toBe(0)
      expect(el.value, '恢复进入编辑时的值').toBe('hello')
      expect(el.hasAttribute('editing')).toBe(false)
      expect(document.activeElement, '焦点回宿主').toBe(el)
    } finally {
      dialog.close()
      cleanupElement(el)
      overlay.remove()
    }
  })
})

describe('WebUiEditableText 表单关联（浏览器）', () => {
  it('编辑提交进入 FormData；form.reset() 回到 value 初值', async () => {
    const form = document.createElement('form')
    form.innerHTML = '<web-ui-editable-text name="title" value="initial"></web-ui-editable-text>'
    document.body.append(form)
    const el = form.querySelector('web-ui-editable-text') as WebUiEditableText
    await el.updateComplete

    expect(new FormData(form).get('title'), '初值进入 FormData').toBe('initial')

    el.focus()
    await el.updateComplete
    await userEvent.keyboard(' edited')
    await el.updateComplete
    expect(el.value).toBe('initial edited')

    await userEvent.keyboard('{Enter}')
    await el.updateComplete
    expect(new FormData(form).get('title'), '提交后的值进入 FormData').toBe('initial edited')

    form.reset()
    await el.updateComplete
    expect(el.value, 'reset 回到 value attribute 初值').toBe('initial')
    expect(new FormData(form).get('title')).toBe('initial')
    cleanupElement(form)
  })

  it('disabled 不上报 FormData 且不进入编辑', async () => {
    const form = document.createElement('form')
    form.innerHTML = '<web-ui-editable-text name="title" value="initial" disabled></web-ui-editable-text>'
    document.body.append(form)
    const el = form.querySelector('web-ui-editable-text') as WebUiEditableText
    await el.updateComplete

    expect(new FormData(form).get('title')).toBe(null)

    const box = el.getBoundingClientRect()
    await clickAt(el, box.width / 2, box.height / 2)
    await el.updateComplete

    expect(el.hasAttribute('editing')).toBe(false)
    cleanupElement(form)
  })
})
