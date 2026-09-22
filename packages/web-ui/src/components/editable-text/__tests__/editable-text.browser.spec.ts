import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import '..'
import { cleanupElement, mountElement, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiEditableText } from '..'

afterEach(() => document.body.replaceChildren())

/** 固定盒宽与等宽字体：落点坐标、换行行数可复现，排除字体度量差异。 */
const FIXTURE_STYLE = 'width: 260px; padding: 8px; font: 16px/1.5 monospace;'

/** 故意长到在内容盒里折成多行的文案，用于暴露换行点漂移。 */
const WRAPPED_TEXT = 'overlay parity across wrapped lines in a fixed width box'

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

/**
 * 在页面内解码两张截图并逐像素比对，返回差异像素数与最大通道差。
 * 文字态/编辑态 overlay 一致性是本组件的布局验收项，用像素计数判定。
 */
const pixelDiff = async (a: string, b: string): Promise<{ pixels: number; maxDelta: number; size: string }> => {
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
      pixels: -1,
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
  let pixels = 0
  let maxDelta = 0
  for (let i = 0; i < dataA.length; i++) {
    const delta = Math.abs(dataA[i] - dataB[i])
    if (delta > 0) {
      pixels++
      if (delta > maxDelta) maxDelta = delta
    }
  }
  return { pixels, maxDelta, size: `${first.width}x${first.height}` }
}

/** 真实焦点移出：把焦点交给组件外的一个按钮，触发编辑层 blur 提交。 */
const blurByFocusElsewhere = async (): Promise<void> => {
  const outside = document.createElement('button')
  document.body.append(outside)
  outside.focus()
}

describe('WebUiEditableText 布局契约（浏览器）', () => {
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
    attrs: Record<string, string> = {}
  ): Promise<{ pixels: number; maxDelta: number; size: string }> => {
    const el = mount({ value: WRAPPED_TEXT, ...attrs })
    await waitForUpdate(el)
    await nextFrame()
    const displayShot = await page.elementLocator(el).screenshot({ base64: true })

    el.focus()
    await waitForUpdate(el)
    await nextFrame()
    editorOf(el).style.caretColor = 'transparent'
    await nextFrame()
    const editShot = await page.elementLocator(el).screenshot({ base64: true })
    cleanupElement(el)
    return pixelDiff(displayShot.base64, editShot.base64)
  }

  it('同文案文字态/编辑态 overlay 逐像素一致', async () => {
    const diff = await overlayParityDiff()
    expect(diff.size, '两态截图尺寸一致').not.toContain('vs')
    expect(diff.pixels, `文字态/编辑态 overlay 像素差异（${diff.size}，最大通道差 ${diff.maxDelta}）`).toBe(0)
  })

  it('紧凑行高下 overlay 仍逐像素一致', async () => {
    // 行高等于字号时文本层行盒没有富余，编辑层内部内容更容易高出自身 1px，
    // 是文字态/编辑态错位的高发区。
    const diff = await overlayParityDiff({ style: 'width: 260px; padding: 8px; font: 16px/1 monospace;' })
    expect(diff.size, '两态截图尺寸一致').not.toContain('vs')
    expect(diff.pixels, `紧凑行高下 overlay 像素差异（${diff.size}，最大通道差 ${diff.maxDelta}）`).toBe(0)
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

    // 继续输入直到折成多行：文本层带高盒，编辑层跟随等高，仍不内部滚动
    await userEvent.keyboard(' gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau')
    await waitForUpdate(el)
    await nextFrame()

    expect(editor.scrollTop, '输入后滚动位置保持 0').toBe(0)
    expect(editor.scrollHeight, '输入后内容不溢出编辑层').toBeLessThanOrEqual(editor.clientHeight)
    expect(el.getBoundingClientRect().width, '输入后宽度不变').toBeCloseTo(display.width, 1)
    expect(el.getBoundingClientRect().height, '折行后高度按行数增长').toBeGreaterThan(editing.height)
    expect(contentBoxOf(editor).height, '编辑层文本盒等高跟随文本层行盒').toBeCloseTo(contentBoxOf(el).height, 0)

    // 失焦回到文字态：盒与编辑态一致，说明两层换行点没有漂移
    const beforeBlur = el.getBoundingClientRect()
    await blurByFocusElsewhere()
    await waitForUpdate(el)
    expect(rectsClose(beforeBlur, el.getBoundingClientRect()), '失焦前后盒一致').toBe(true)
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

  it('blur 提交并派发一次 composed change', async () => {
    const el = mount({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    const [changes, detach] = spyEvents(el, 'change')
    try {
      await userEvent.keyboard(' world')
      await waitForUpdate(el)
      expect(el.value).toBe('hello world')

      await blurByFocusElsewhere()
      await waitForUpdate(el)

      expect(changes).toHaveLength(1)
      expect(changes[0].composed, 'change 跨 shadow 边界').toBe(true)
      expect(el.hasAttribute('editing')).toBe(false)
      expect(el.value).toBe('hello world')
    } finally {
      detach()
    }
    cleanupElement(el)
  })

  it('空草稿 blur 提交空值，文本层回落 placeholder', async () => {
    const el = mount({ value: 'hello', placeholder: 'Untitled' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    for (let i = 0; i < 5; i++) await userEvent.keyboard('{Backspace}')
    await waitForUpdate(el)
    expect(el.value).toBe('')

    await blurByFocusElsewhere()
    await waitForUpdate(el)

    expect(el.value, '空草稿 blur 提交空值').toBe('')
    expect(textLayerOf(el).textContent, '文本层回落 placeholder').toBe('Untitled')
    cleanupElement(el)
  })

  it('Escape 取消：恢复原值、派发 cancel、不派发 change、焦点回宿主', async () => {
    const el = mount({ value: 'hello' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    const [cancels, detachCancel] = spyEvents(el, 'cancel')
    const [changes, detachChange] = spyEvents(el, 'change')
    try {
      await userEvent.keyboard('draft')
      await waitForUpdate(el)
      expect(el.value).toBe('hellodraft')

      await userEvent.keyboard('{Escape}')
      await waitForUpdate(el)

      expect(el.value, '恢复进入编辑时的值').toBe('hello')
      expect(cancels).toHaveLength(1)
      expect(changes).toHaveLength(0)
      expect(el.hasAttribute('editing')).toBe(false)
      expect(document.activeElement, '焦点回到宿主').toBe(el)
      expect(el.shadowRoot!.activeElement, '编辑层不再持有焦点').toBe(null)
    } finally {
      detachCancel()
      detachChange()
    }
    cleanupElement(el)
  })

  it('Enter 换行且不退出编辑', async () => {
    const el = mount({ value: 'first' })
    await waitForUpdate(el)
    el.focus()
    await waitForUpdate(el)

    const [changes, detach] = spyEvents(el, 'change')
    try {
      await userEvent.keyboard('{Enter}')
      await waitForUpdate(el)

      const editor = editorOf(el)
      expect(editor.value, 'Enter 产生换行').toBe('first\n')
      expect(el.value).toBe('first\n')
      expect(el.hasAttribute('editing')).toBe(true)
      expect(changes, 'Enter 不提交').toHaveLength(0)
      expect(el.getBoundingClientRect().height, '盒高随行数增长').toBeGreaterThan(24)
    } finally {
      detach()
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

    await blurByFocusElsewhere()
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
