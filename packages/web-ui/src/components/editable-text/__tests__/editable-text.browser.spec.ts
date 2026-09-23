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
