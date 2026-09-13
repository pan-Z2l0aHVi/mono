import type { LitElement } from 'lit'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { pollUntil, queryA11y, waitForFrame } from '@/shared/test-utils'

import { imagePreview, type ImagePreviewOptions } from '..'

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#08f"/></svg>'
const IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(SVG)}`
const IMAGES = [
  { src: IMAGE_SRC, alt: '图 A' },
  { src: IMAGE_SRC, alt: '图 B' },
  { src: IMAGE_SRC, alt: '图 C' }
]

/*
 * 1x 平移只在图片两个方向都不顶满舞台时才有余量：图片被宽度或高度约束时，
 * 该轴上的尺寸差为 0、拖不动。小图在 1x 下按原始尺寸渲染，两个方向都留有余量。
 */
const SMALL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#fb0"/></svg>'
const SMALL_IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(SMALL_SVG)}`
const SMALL_IMAGES = [
  { src: SMALL_IMAGE_SRC, alt: '小图 A' },
  { src: SMALL_IMAGE_SRC, alt: '小图 B' },
  { src: SMALL_IMAGE_SRC, alt: '小图 C' }
]

afterEach(() => document.body.replaceChildren())

// 默认挂载到 fallback overlay root 的 shadow DOM 内（公开结构见 test-utils.getPortalPanel）。
function overlayRoot(): ShadowRoot | null {
  return document.querySelector('[data-wui-overlay-root]')?.shadowRoot ?? null
}

function hostElement(): LitElement {
  const host = overlayRoot()?.querySelector('[data-wui-overlay-container] web-ui-image-preview')
  if (!host) throw new Error('image preview host is not mounted')
  return host as LitElement
}

function dialogElement(): HTMLDialogElement {
  const dialog = queryA11y(hostElement(), 'dialog')
  if (!dialog) throw new Error('native dialog is not rendered')
  return dialog as HTMLDialogElement
}

function isMounted(): boolean {
  return overlayRoot()?.querySelector('[data-wui-overlay-container] web-ui-image-preview') != null
}

/** 图片所在的舞台：单轨道结构下图片的父元素是 slide，舞台上溯一层。 */
function stageOf(image: HTMLImageElement): HTMLElement {
  return (image.closest('.wui-image-preview-stage') as HTMLElement) ?? image.parentElement!
}

/** 当前图片：相邻图渲染下首张 img 是 prev 邻居，必须按 is-current 槽取当前图。 */
function currentImage(host: HTMLElement): HTMLImageElement {
  return host.shadowRoot?.querySelector(
    '.wui-image-preview-slide.is-current .wui-image-preview-image'
  ) as HTMLImageElement
}

async function openPreview(options: Partial<ImagePreviewOptions> = {}) {
  const handle = imagePreview({ images: IMAGES, ...options })
  const host = hostElement()
  await host.updateComplete
  await waitForFrame()
  return { handle, host }
}

function pointer(type: string, init: PointerEventInit) {
  return new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, ...init })
}

/**
 * 等图片的 transform 完成过渡。
 * 必须先观察到取值脱离过渡前的值，再要求跨帧出现相同取值——否则首次 check
 * 会与基准同帧，直接判成稳定而停在过渡中间态。
 */
async function waitForTransformSettled(image: HTMLImageElement, previous: string): Promise<void> {
  let changed = false
  let last = previous
  await pollUntil(() => {
    const current = getComputedStyle(image).transform
    if (!changed) {
      if (current === previous) return false
      changed = true
      last = current
      return false
    }
    if (current === last) return true
    last = current
    return false
  }, 'image transform did not settle')
}

function offsetXOf(image: HTMLImageElement): number {
  return new DOMMatrixReadOnly(getComputedStyle(image).transform).m41
}

function offsetYOf(image: HTMLImageElement): number {
  return new DOMMatrixReadOnly(getComputedStyle(image).transform).m42
}

/**
 * 等 transform 过渡把位移带到目标值（亚像素容差）。
 * 不假设是否发生过渡：合成事件之间没有真实帧，浏览器可能从旧值起一段过渡，
 * 也可能直接落位，两种情形轮询到目标即返回。
 */
async function waitForOffset(image: HTMLImageElement, x: number, y: number): Promise<void> {
  await pollUntil(() => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(image).transform)
    return Math.abs(matrix.m41 - x) < 0.5 && Math.abs(matrix.m42 - y) < 0.5
  }, `image offset did not reach (${x}, ${y})`)
}

/** 平移边界 = 图片在给定倍率下的绘制尺寸与舞台尺寸差的一半，与实现同一口径。 */
function panBounds(image: HTMLImageElement, stage: HTMLElement, scale = 1): { x: number; y: number } {
  return {
    x: Math.abs(image.offsetWidth * scale - stage.clientWidth) / 2,
    y: Math.abs(image.offsetHeight * scale - stage.clientHeight) / 2
  }
}

/** 等 dialog 进入动画结束：舞台几何连续两次相同即认为稳定，否则锚点坐标会偏。 */
async function waitForStageSettled(stage: HTMLElement): Promise<void> {
  let last = ''
  await pollUntil(() => {
    const rect = stage.getBoundingClientRect()
    const current = `${rect.left.toFixed(2)}:${rect.width.toFixed(2)}`
    if (current === last) return true
    last = current
    return false
  }, 'stage geometry did not settle')
}

describe('imagePreview 命令式 API（浏览器）', () => {
  it('预览面板自身不显示 focus ring，内部关闭按钮仍可聚焦', async () => {
    const { handle, host } = await openPreview({ closable: true, nav: true, toolbar: true })
    const dialog = dialogElement()
    dialog.focus()
    expect(getComputedStyle(dialog).outlineStyle).toBe('none')

    const close = host.shadowRoot?.querySelector<HTMLElement>('.wui-image-preview-close')
    const nativeButton = close?.shadowRoot?.querySelector('button') as HTMLButtonElement | null
    nativeButton?.focus()
    expect(close?.shadowRoot?.activeElement).toBe(nativeButton)

    handle.close()
    await handle.closed
  })

  it('退出过渡完成前保持原生 dialog 位于 top layer', async () => {
    const { handle, host } = await openPreview()
    const dialog = dialogElement()
    expect(dialog.open).toBe(true)

    handle.close()
    await host.updateComplete
    expect(dialog.open).toBe(true)

    dialog.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'transform' }))
    await pollUntil(() => !isMounted(), 'preview did not unmount')
  })

  it('真实键盘方向键切换图片，Escape 关闭', async () => {
    const { handle } = await openPreview()

    await userEvent.keyboard('{ArrowRight}')
    expect(handle.index).toBe(1)

    await userEvent.keyboard('{ArrowLeft}')
    expect(handle.index).toBe(0)

    await userEvent.keyboard('{Escape}')
    await handle.closed
    expect(isMounted()).toBe(false)
  })

  it('打开后焦点进入预览，关闭后回到打开前的元素', async () => {
    const trigger = document.createElement('button')
    trigger.textContent = '打开'
    document.body.append(trigger)
    trigger.focus()

    const { handle } = await openPreview({ target: trigger })
    expect(document.activeElement).not.toBe(trigger)
    // 焦点被移入预览内部（原生 dialog 的模态焦点管理）。
    await pollUntil(() => hostElement().shadowRoot?.activeElement != null, 'focus did not move into the preview')

    handle.close()
    await handle.closed
    expect(document.activeElement).toBe(trigger)
  })

  it('滚轮缩放并受倍率上下限约束', async () => {
    const { handle, host } = await openPreview()
    const dialog = dialogElement()

    dialog.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, bubbles: true, cancelable: true }))
    await host.updateComplete
    expect(handle.scale).toBeGreaterThan(1)

    for (let step = 0; step < 20; step += 1) {
      dialog.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, bubbles: true, cancelable: true }))
    }
    await host.updateComplete
    expect(handle.scale).toBe(4)

    handle.close()
    await handle.closed
  })

  it('滚轮以光标位置为锚点缩放，锚点覆盖的图片内容保持不动', async () => {
    const { handle, host } = await openPreview()
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)
    await waitForStageSettled(stage)
    const rect = stage.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    // 锚点用相对舞台中心的偏移表示，光标放在它右侧 120px 处。
    const anchorX = 120
    const cursorX = centerX + anchorX

    const wheel = () =>
      dialogElement().dispatchEvent(
        new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -120, clientX: cursorX, clientY: centerY })
      )

    // 先放大到图片溢出舞台，否则横向平移被边界钳制，锚点无法保持。
    let previous = getComputedStyle(image).transform
    wheel()
    await host.updateComplete
    await waitForTransformSettled(image, previous)

    const offsetBefore = offsetXOf(image)
    const localBefore = (anchorX - offsetBefore) / handle.scale

    previous = getComputedStyle(image).transform
    wheel()
    await host.updateComplete
    await waitForTransformSettled(image, previous)

    // 图片向左让位，把光标右侧的内容留在原处。
    expect(offsetXOf(image)).toBeLessThan(offsetBefore)
    expect((anchorX - offsetXOf(image)) / handle.scale).toBeCloseTo(localBefore, 0)

    handle.close()
    await handle.closed
  })

  it('双指拉开按距离比例放大图片', async () => {
    const { handle, host } = await openPreview()
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)
    await waitForStageSettled(stage)
    const rect = stage.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    // 两指以舞台中心为中点、相距 120px 落下，再对称拉开到 240px。
    stage.dispatchEvent(
      pointer('pointerdown', { pointerId: 11, pointerType: 'touch', clientX: centerX - 60, clientY: centerY })
    )
    stage.dispatchEvent(
      pointer('pointerdown', {
        pointerId: 12,
        pointerType: 'touch',
        isPrimary: false,
        clientX: centerX + 60,
        clientY: centerY
      })
    )
    window.dispatchEvent(
      pointer('pointermove', { pointerId: 11, pointerType: 'touch', clientX: centerX - 120, clientY: centerY })
    )
    window.dispatchEvent(
      pointer('pointermove', {
        pointerId: 12,
        pointerType: 'touch',
        isPrimary: false,
        clientX: centerX + 120,
        clientY: centerY
      })
    )
    await host.updateComplete

    expect(handle.scale).toBeCloseTo(2, 1)
    // 锚点是两指中点（舞台中心），因此不产生横向平移。
    expect(Math.abs(offsetXOf(image))).toBeLessThan(1)

    handle.close()
    await handle.closed
  })

  it('放大后拖拽平移，位移被钳制在图片与舞台的尺寸差内', async () => {
    const { handle, host } = await openPreview()
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)
    await waitForStageSettled(stage)

    handle.zoomIn()
    await host.updateComplete

    const bounds = panBounds(image, stage, handle.scale)
    expect(bounds.x).toBeGreaterThan(0)

    stage.dispatchEvent(pointer('pointerdown', { button: 0, clientX: 0, clientY: 0 }))
    await host.updateComplete
    stage.dispatchEvent(pointer('pointermove', { clientX: 10_000, clientY: 10_000 }))
    await host.updateComplete

    // 两个方向都被钳制在边界上；某一方向没有溢出时钳制到「可在视口内移动」的极限。
    expect(offsetXOf(image)).toBeCloseTo(bounds.x, 0)
    expect(offsetYOf(image)).toBeCloseTo(bounds.y, 0)

    stage.dispatchEvent(pointer('pointerup', {}))
    handle.close()
    await handle.closed
  })

  it('1x 时鼠标与单指拖拽都能移动图片，方向不限且不会被拖出视口', async () => {
    const { handle, host } = await openPreview({ images: SMALL_IMAGES })
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)
    await waitForStageSettled(stage)

    expect(handle.scale).toBe(1)
    const bounds = panBounds(image, stage)
    expect(bounds.x).toBeGreaterThan(0)
    expect(bounds.y).toBeGreaterThan(0)

    // 桌面鼠标按住拖拽：两个方向都跟手。拖拽期间 transform 过渡被关闭，
    // 读到的就是跟手位移本身。
    stage.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', clientX: 100, clientY: 100 }))
    await host.updateComplete
    stage.dispatchEvent(
      pointer('pointermove', { pointerType: 'mouse', clientX: 100 + bounds.x / 2, clientY: 100 + bounds.y / 2 })
    )
    await host.updateComplete
    expect(offsetXOf(image)).toBeCloseTo(bounds.x / 2, 0)
    expect(offsetYOf(image)).toBeCloseTo(bounds.y / 2, 0)

    // 继续拖到远超边界：位移被钳制，图片恰好贴住视口边缘而不是被拖出去。
    stage.dispatchEvent(pointer('pointermove', { pointerType: 'mouse', clientX: 100_000, clientY: 100_000 }))
    await host.updateComplete
    expect(offsetXOf(image)).toBeCloseTo(bounds.x, 0)
    expect(offsetYOf(image)).toBeCloseTo(bounds.y, 0)
    stage.dispatchEvent(pointer('pointerup', { pointerType: 'mouse', clientX: 100_000, clientY: 100_000 }))
    await host.updateComplete

    const stageRect = stage.getBoundingClientRect()
    let imageRect = image.getBoundingClientRect()
    expect(imageRect.right).toBeLessThanOrEqual(stageRect.right + 1)
    expect(imageRect.bottom).toBeLessThanOrEqual(stageRect.bottom + 1)

    // 平移结束后的余波 click 不是遮罩点击。
    stage.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await host.updateComplete
    expect(isMounted()).toBe(true)

    // 移动端单指按住拖拽：与鼠标同一条 Pointer 路径，反向拖到负边界。
    stage.dispatchEvent(pointer('pointerdown', { pointerType: 'touch', pointerId: 7, clientX: 400, clientY: 400 }))
    await host.updateComplete
    stage.dispatchEvent(
      pointer('pointermove', { pointerType: 'touch', pointerId: 7, clientX: -100_000, clientY: -100_000 })
    )
    await host.updateComplete
    expect(offsetXOf(image)).toBeCloseTo(-bounds.x, 0)
    expect(offsetYOf(image)).toBeCloseTo(-bounds.y, 0)
    stage.dispatchEvent(
      pointer('pointerup', { pointerType: 'touch', pointerId: 7, clientX: -100_000, clientY: -100_000 })
    )
    await host.updateComplete

    imageRect = image.getBoundingClientRect()
    expect(imageRect.left).toBeGreaterThanOrEqual(stageRect.left - 1)
    expect(imageRect.top).toBeGreaterThanOrEqual(stageRect.top - 1)

    handle.close()
    await handle.closed
  })

  it('1x 平移后「重置缩放」可用，点击后图片移回视口中心', async () => {
    const { handle, host } = await openPreview({ images: SMALL_IMAGES, toolbar: true })
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)
    await waitForStageSettled(stage)

    const reset = () => queryA11y(host, '[aria-label="重置缩放"]') as HTMLElement
    // 1x 且未位移时没有可重置的东西。
    expect(reset().hasAttribute('disabled')).toBe(true)

    const bounds = panBounds(image, stage)
    expect(bounds.x).toBeGreaterThan(0)

    stage.dispatchEvent(pointer('pointerdown', { pointerType: 'mouse', clientX: 100, clientY: 100 }))
    await host.updateComplete
    stage.dispatchEvent(pointer('pointermove', { pointerType: 'mouse', clientX: 100_000, clientY: 100_000 }))
    await host.updateComplete

    // 拖拽期间 transform 过渡被关闭，读到的是跟手位移本身。
    expect(offsetXOf(image)).toBeCloseTo(bounds.x, 0)
    expect(offsetYOf(image)).toBeCloseTo(bounds.y, 0)
    // 位移来自平移而非缩放：倍率仍是 1x，但已经有东西可重置。
    expect(handle.scale).toBe(1)
    expect(reset().hasAttribute('disabled')).toBe(false)

    stage.dispatchEvent(pointer('pointerup', { pointerType: 'mouse', clientX: 100_000, clientY: 100_000 }))
    await host.updateComplete

    await userEvent.click(reset())
    await host.updateComplete
    // 重置同时还原倍率与位移；等位移被过渡带回 0 再断言。
    await waitForOffset(image, 0, 0)

    expect(handle.scale).toBe(1)
    // 过渡结束时允许亚像素残差。
    expect(offsetXOf(image)).toBeCloseTo(0, 0)
    expect(offsetYOf(image)).toBeCloseTo(0, 0)
    // 回到原位后按钮重新不可用。
    expect(reset().hasAttribute('disabled')).toBe(true)

    handle.close()
    await handle.closed
  })

  it('图片加载完成后淡入可见', async () => {
    const { handle, host } = await openPreview()
    const image = currentImage(host)

    await pollUntil(() => Number(getComputedStyle(image).opacity) === 1, 'image did not fade in')
    expect(Number(getComputedStyle(image).opacity)).toBe(1)

    handle.close()
    await handle.closed
  })

  it('1x 时图片收缩到视口内，不被舞台裁切', async () => {
    const { handle, host } = await openPreview()
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)

    expect(image.offsetWidth).toBeLessThanOrEqual(stage.clientWidth)
    expect(image.offsetHeight).toBeLessThanOrEqual(stage.clientHeight)

    handle.close()
    await handle.closed
  })

  it('放大后连续点击图片不关闭浮层', async () => {
    const { handle, host } = await openPreview()
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    handle.zoomIn()
    await host.updateComplete

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await userEvent.click(image)
      await host.updateComplete
      expect(isMounted()).toBe(true)
    }

    handle.close()
    await handle.closed
  })

  it('放大后双击图片仍重置缩放', async () => {
    const { handle, host } = await openPreview()
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    handle.zoomIn()
    await host.updateComplete
    expect(handle.scale).toBeGreaterThan(1)

    await userEvent.dblClick(image)
    await host.updateComplete
    expect(handle.scale).toBe(1)

    handle.close()
    await handle.closed
  })

  it('toolbar 重置按钮用 radix-icons:reset 字形，真实点击后回到 1x', async () => {
    const { handle, host } = await openPreview({ toolbar: true })

    handle.zoomIn()
    await host.updateComplete
    expect(handle.scale).toBeGreaterThan(1)

    const resetIcon = queryA11y(host, '[aria-label="重置缩放"] web-ui-icon') as LitElement | null
    if (!resetIcon) throw new Error('reset icon is not rendered')
    await resetIcon.updateComplete
    const svg = resetIcon.shadowRoot?.querySelector('svg')
    if (!svg) throw new Error('reset icon did not render an svg')

    // radix-icons 是 15 网格的实心字形；lucide 的 refresh-cw 是 24 网格的描边字形。
    expect(svg.getAttribute('viewBox')).toBe('0 0 15 15')
    expect(svg.getBoundingClientRect().width).toBeGreaterThan(0)

    await userEvent.click(queryA11y(host, '[aria-label="重置缩放"]') as HTMLElement)
    await host.updateComplete
    expect(handle.scale).toBe(1)

    handle.close()
    await handle.closed
  })

  it('放大后拖拽平移并释放不关闭浮层', async () => {
    const { handle, host } = await openPreview()
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)

    handle.zoomIn()
    await host.updateComplete

    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 300, clientY: 300 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 300, clientY: 300 }))
    await host.updateComplete

    // 真实浏览器在指针起止于同一元素时会补发 click，拖拽产生的这次不得被当作遮罩点击。
    stage.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await host.updateComplete
    expect(isMounted()).toBe(true)

    handle.close()
    await handle.closed
  })

  it('放大后横向拖拽让位于平移，不切换图片', async () => {
    const { handle, host } = await openPreview({ swipe: true })
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)

    handle.zoomIn()
    await host.updateComplete
    expect(handle.scale).toBeGreaterThan(1)
    const bounds = panBounds(image, stage, handle.scale)
    expect(bounds.x).toBeGreaterThan(0)

    // 与未放大时相同的横向拖拽方向：放大后必须走平移而不是切图。
    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    await host.updateComplete
    stage.dispatchEvent(pointer('pointermove', { clientX: 400 - 100_000, clientY: 300 }))
    await host.updateComplete

    expect(offsetXOf(image)).toBeCloseTo(-bounds.x, 0)

    stage.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('swipe 开启但只有一张图时，横向拖拽退回平移而不是切图', async () => {
    const { handle, host } = await openPreview({ swipe: true, images: [SMALL_IMAGES[0]] })
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)
    await waitForStageSettled(stage)

    // 单图没有可切换的邻居，swipe 不接管横向轴，拖拽因此退回平移。
    const bounds = panBounds(image, stage)
    expect(bounds.x).toBeGreaterThan(0)

    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    await host.updateComplete
    stage.dispatchEvent(pointer('pointermove', { clientX: -100_000, clientY: 300 }))
    await host.updateComplete

    expect(offsetXOf(image)).toBeCloseTo(-bounds.x, 0)

    stage.dispatchEvent(pointer('pointerup', { clientX: -100_000, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('1x + swipe 多图时，纵向拖拽被忽略、横向拖拽仍然切图', async () => {
    const { handle, host } = await openPreview({ swipe: true, images: SMALL_IMAGES })
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)
    await waitForStageSettled(stage)

    // 纵向拖拽：swipe 接管整个拖拽，纵向 delta 完全忽略——图片不位移、也不切图。
    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    await host.updateComplete
    stage.dispatchEvent(pointer('pointermove', { clientX: 400, clientY: 200 }))
    await host.updateComplete
    await waitForFrame()

    expect(offsetYOf(image)).toBeCloseTo(0, 0)
    expect(offsetXOf(image)).toBeCloseTo(0, 0)

    stage.dispatchEvent(pointer('pointerup', { clientX: 400, clientY: 200 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

    // 横向拖拽：越过阈值滑入相邻图（swipe 的既有语义不变，提交在滑入过渡后发生）。
    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300, pointerId: 3 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 300, pointerId: 3 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 300, pointerId: 3 }))
    await pollUntil(() => handle.index === 1, 'swipe did not commit to next image')
    expect(handle.index).toBe(1)

    handle.close()
    await handle.closed
  })

  it('noBackdropClose 时关闭按钮仍可关闭', async () => {
    const { handle, host } = await openPreview({ noBackdropClose: true, closable: true })
    const closeButton = queryA11y(host, '[aria-label="关闭"]') as HTMLElement
    expect(closeButton).not.toBeNull()

    await userEvent.click(closeButton)
    await handle.closed
    expect(isMounted()).toBe(false)
  })

  it('swipe 开启时横向拖拽切换图片', async () => {
    const { handle, host } = await openPreview({ swipe: true })
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)

    // 向左拖 300px：越过滑动阈值，滑入下一张。
    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 300 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 300 }))
    await pollUntil(() => handle.index === 1, 'swipe did not commit to next image')
    expect(handle.index).toBe(1)

    // 向右拖回：滑回上一张。
    stage.dispatchEvent(pointer('pointerdown', { clientX: 200, clientY: 300, pointerId: 2 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 380, clientY: 300, pointerId: 2 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 500, clientY: 300, pointerId: 2 }))
    await pollUntil(() => handle.index === 0, 'swipe did not commit back to previous image')
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('swipe 默认关闭时，横向拖拽平移图片而不是切换', async () => {
    const { handle, host } = await openPreview({ images: SMALL_IMAGES })
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)
    await waitForStageSettled(stage)

    const bounds = panBounds(image, stage)
    expect(bounds.x).toBeGreaterThan(0)

    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    await host.updateComplete
    stage.dispatchEvent(pointer('pointermove', { clientX: -100_000, clientY: 300 }))
    await host.updateComplete

    expect(offsetXOf(image)).toBeCloseTo(-bounds.x, 0)

    stage.dispatchEvent(pointer('pointerup', { clientX: -100_000, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('swipe 开启且 loop 关闭时，边界方向的拖拽保持不动', async () => {
    const { handle, host } = await openPreview({ swipe: true, loop: false, index: 0 })
    const image = currentImage(host)

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)

    // 首张向右拖（请求上一张）在 loop 关闭时应被钳制。
    stage.dispatchEvent(pointer('pointerdown', { clientX: 200, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 420, clientY: 300 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 560, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('swipe 单轨道结构：当前图居中、左右相邻同尺寸同基线，仅当前图可见于可访问树', async () => {
    const { handle, host } = await openPreview({ swipe: true })
    const image = currentImage(host)
    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')

    const track = host.shadowRoot?.querySelector('.wui-image-preview-track') as HTMLElement
    const slides = host.shadowRoot?.querySelectorAll('.wui-image-preview-slide') as NodeListOf<HTMLElement>
    expect(track).toBeTruthy()
    // loop 开启且多图：prev / current / next 三格（首图时 prev 环绕到最后一张）。
    expect(slides.length).toBe(3)

    // 同尺寸同基线：每个 slide 与舞台等宽等高（相邻图不会各自按宽高比错位重叠）。
    const stage = stageOf(image)
    const rects = Array.from(slides, slide => slide.getBoundingClientRect())
    const widths = new Set(rects.map(r => r.width.toFixed(1)))
    const heights = new Set(rects.map(r => r.height.toFixed(1)))
    expect(widths.size).toBe(1)
    expect(heights.size).toBe(1)
    expect(rects[1].width).toBeCloseTo(stage.getBoundingClientRect().width, 0)

    // 相邻图与当前图同基线：左右相邻的垂直位置与当前图一致（同一轨道）。
    expect(rects[0].top).toBeCloseTo(rects[1].top, 0)
    expect(rects[2].top).toBeCloseTo(rects[1].top, 0)

    // 当前图在轨道原点、相邻图分居 ±100%（= 一个舞台宽度）处。
    const stageRect = stage.getBoundingClientRect()
    expect(rects[1].left).toBeCloseTo(stageRect.left, 0)
    expect(rects[0].right).toBeCloseTo(stageRect.left, 0)
    expect(rects[2].left).toBeCloseTo(stageRect.right, 0)

    // 当前图可见、相邻图对辅助技术隐藏。
    expect(slides[1].classList.contains('is-current')).toBe(true)
    expect(slides[1].hasAttribute('aria-hidden')).toBe(false)
    expect(slides[0].getAttribute('aria-hidden')).toBe('true')
    expect(slides[2].getAttribute('aria-hidden')).toBe('true')

    handle.close()
    await handle.closed
  })

  it('swipe loop 首尾环绕：最后一张向左拖，相邻首图跟手进入，松手滑入首图', async () => {
    const { handle, host } = await openPreview({ swipe: true, index: 2 })
    const image = currentImage(host)
    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')

    const stage = stageOf(image)
    const track = host.shadowRoot?.querySelector('.wui-image-preview-track') as HTMLElement
    const slides = host.shadowRoot?.querySelectorAll('.wui-image-preview-slide') as NodeListOf<HTMLElement>
    const trackX = () => new DOMMatrixReadOnly(getComputedStyle(track).transform).m41
    const stageRect = stage.getBoundingClientRect()
    const visibleAlts = () =>
      Array.from(slides, slide => {
        const rect = slide.getBoundingClientRect()
        const overlap = Math.min(rect.right, stageRect.right) - Math.max(rect.left, stageRect.left)
        return overlap > 0 ? (slide.querySelector('img')?.alt ?? null) : null
      }).filter(Boolean)

    // index=2（图 C）：相邻格应为 prev=图 B、next=图 A（loop 环绕）。
    const alts = Array.from(slides, slide => slide.querySelector('img')?.alt)
    expect(alts).toEqual(['图 B', '图 C', '图 A'])
    expect(trackX()).toBe(0)

    // 向左拖（next 方向）：图 A 从右侧跟手进入，不允许出现空白轨道。
    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 220, clientY: 300 }))
    await host.updateComplete
    expect(trackX()).toBeCloseTo(-180, 0)
    const duringDrag = visibleAlts()
    expect(duringDrag).toContain('图 C')
    expect(duringDrag).toContain('图 A')

    // 松手越过阈值：滑入首图。
    stage.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 300 }))
    await pollUntil(() => handle.index === 0, 'swipe did not wrap to first image')
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('swipe 拖拽跟手：轨道随手指平移，相邻图在同一轨道上同步进入/退出', async () => {
    const { handle, host } = await openPreview({ swipe: true })
    const image = currentImage(host)
    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)

    const track = host.shadowRoot?.querySelector('.wui-image-preview-track') as HTMLElement
    const trackX = () => new DOMMatrixReadOnly(getComputedStyle(track).transform).m41

    // 向左拖 80px（未松手）：轨道跟手左移 80px，当前图滑出、相邻图从右侧进入。
    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 320, clientY: 300 }))
    await host.updateComplete
    expect(trackX()).toBeCloseTo(-80, 0)
    expect(handle.index).toBe(0)

    // 继续拖到 250px：轨道继续跟手。
    stage.dispatchEvent(pointer('pointermove', { clientX: 150, clientY: 300 }))
    await host.updateComplete
    expect(trackX()).toBeCloseTo(-250, 0)

    // 松手（越过阈值）：滑入下一张。
    stage.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 300 }))
    await pollUntil(() => handle.index === 1, 'swipe did not commit to next image')

    handle.close()
    await handle.closed
  })

  it('放大状态下：缩放/平移只作用于当前图，相邻图恒 1x 且不进入视口', async () => {
    const { handle, host } = await openPreview({ swipe: true })
    const image = currentImage(host)
    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)

    const slides = host.shadowRoot?.querySelectorAll('.wui-image-preview-slide') as NodeListOf<HTMLElement>
    const scaleOf = (img: HTMLImageElement) => new DOMMatrixReadOnly(getComputedStyle(img).transform).a
    const track = host.shadowRoot?.querySelector('.wui-image-preview-track') as HTMLElement
    const trackX = () => new DOMMatrixReadOnly(getComputedStyle(track).transform).m41

    // 放大到 2x：只有当前图被缩放，相邻图保持 1x（不会「穿过来」）。
    handle.zoomIn()
    await host.updateComplete
    handle.zoomIn()
    await host.updateComplete
    expect(handle.scale).toBeGreaterThan(1)
    // 等 160ms 缩放 transform 过渡收敛后，当前图 scale 才反映目标倍率。
    await pollUntil(() => scaleOf(currentImage(host)) > 1.2, 'current image scale did not settle above 1')
    expect(scaleOf(currentImage(host))).toBeGreaterThan(1)
    const neighborImgs = Array.from(
      slides,
      slide => slide.querySelector('.wui-image-preview-image') as HTMLImageElement
    )
    for (const [i, img] of neighborImgs.entries()) {
      if (i === 1) continue
      expect(scaleOf(img)).toBe(1)
    }

    // 放大状态下横向拖拽走 pan：轨道停在基准位、相邻 slide 不动不进入视口，pan 只动当前图。
    const stageRect = stage.getBoundingClientRect()
    const rectsBefore = Array.from(slides, slide => slide.getBoundingClientRect())
    expect(rectsBefore[0].right).toBeLessThanOrEqual(stageRect.left + 1)
    expect(rectsBefore[2].left).toBeGreaterThanOrEqual(stageRect.right - 1)

    stage.dispatchEvent(pointer('pointerdown', { button: 0, clientX: 300, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 150, clientY: 300 }))
    await host.updateComplete

    expect(Math.abs(offsetXOf(currentImage(host)))).toBeGreaterThan(0)
    expect(trackX()).toBe(0)
    const rects = Array.from(slides, slide => slide.getBoundingClientRect())
    expect(rects[0].left).toBeCloseTo(rectsBefore[0].left, 0)
    expect(rects[0].right).toBeCloseTo(rectsBefore[0].right, 0)
    expect(rects[2].left).toBeCloseTo(rectsBefore[2].left, 0)
    expect(rects[2].right).toBeCloseTo(rectsBefore[2].right, 0)
    // 当前 slide 不动，pan 只作用于其中的当前 img（slide 内相对位移）。
    expect(rects[1].left).toBeCloseTo(rectsBefore[1].left, 0)
    expect(Math.abs(currentImage(host).getBoundingClientRect().left - rectsBefore[1].left)).toBeGreaterThan(0)

    // 回到 1x 后 swipe 恢复：横向拖拽仍切图（相邻图重新跟手）。
    stage.dispatchEvent(pointer('pointerup', { clientX: 150, clientY: 300 }))
    await host.updateComplete
    handle.resetZoom()
    await host.updateComplete
    expect(handle.scale).toBe(1)

    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300, pointerId: 2 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 100, clientY: 300, pointerId: 2 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 300, pointerId: 2 }))
    await pollUntil(() => handle.index === 1, 'swipe did not recover after resetting zoom')

    handle.close()
    await handle.closed
  })

  it('swipe 未达阈值释放：弹回原位且不切换图片', async () => {
    const { handle, host } = await openPreview({ swipe: true })
    const image = currentImage(host)
    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = stageOf(image)

    const track = host.shadowRoot?.querySelector('.wui-image-preview-track') as HTMLElement
    const trackX = () => new DOMMatrixReadOnly(getComputedStyle(track).transform).m41

    // 只拖 30px（低于 48px 阈值），松手后弹回原点。
    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 370, clientY: 300 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 370, clientY: 300 }))
    await pollUntil(() => Math.abs(trackX()) < 0.5, 'swipe did not bounce back to origin')
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('玻璃控件 blur 由独立层承担：dialog 不过渡 opacity，遮罩/舞台层 opacity 过渡', async () => {
    const { host } = await openPreview({ toolbar: true, indicator: true, closable: true, nav: true })
    const dialog = dialogElement()

    // dialog 自身 opacity 恒 1、只做 transform 过渡（opacity < 1 会让 dialog 成为
    // backdrop root，后代玻璃控件的 backdrop-filter 在过渡期被禁用、端点生硬跳变）。
    expect(getComputedStyle(dialog).transitionProperty).not.toContain('opacity')
    expect(getComputedStyle(dialog).opacity).toBe('1')
    expect(getComputedStyle(dialog).transitionProperty).toContain('transform')

    const backdrop = dialog.querySelector('.wui-image-preview-backdrop') as HTMLElement
    const surface = dialog.querySelector('.wui-image-preview-surface') as HTMLElement
    expect(backdrop).toBeTruthy()
    expect(surface).toBeTruthy()
    expect(getComputedStyle(backdrop).transitionProperty).toContain('opacity')
    expect(getComputedStyle(surface).transitionProperty).toContain('opacity')

    // 玻璃控件各自做 own opacity 过渡（is-visible 已打开 → 收敛到 1）：counter/toolbar
    // 自身即玻璃元素，own opacity 不禁用自身 blur；nav/close 是 glass 按钮，blur 在
    // shadow 内层原生 button 上，opacity 过渡须经 ::part(button) 落在该玻璃元素自身。
    const toolbar = host.shadowRoot?.querySelector('.wui-image-preview-toolbar') as HTMLElement
    const counter = host.shadowRoot?.querySelector('.wui-image-preview-counter') as HTMLElement
    const closeHost = host.shadowRoot?.querySelector('.wui-image-preview-close') as HTMLElement
    const navHost = host.shadowRoot?.querySelector('.wui-image-preview-nav-prev') as HTMLElement
    const closeNative = closeHost.shadowRoot?.querySelector('button') as HTMLElement
    const navNative = navHost.shadowRoot?.querySelector('button') as HTMLElement
    expect(getComputedStyle(toolbar).backdropFilter).not.toBe('none')
    expect(getComputedStyle(counter).backdropFilter).not.toBe('none')
    expect(getComputedStyle(closeNative).backdropFilter).not.toBe('none')
    expect(closeNative.getAttribute('part')).toBe('button')
    expect(getComputedStyle(toolbar).transitionProperty).toContain('opacity')
    expect(getComputedStyle(counter).transitionProperty).toContain('opacity')
    expect(getComputedStyle(closeNative).transitionProperty).toContain('opacity')
    expect(getComputedStyle(navNative).transitionProperty).toContain('opacity')
    // 打开动画途中 opacity 处于 0→1 过渡，轮询等控件淡入收敛（验证 is-visible 驱动生效）。
    await pollUntil(() => getComputedStyle(toolbar).opacity === '1', 'glass control did not fade in')
    expect(getComputedStyle(counter).opacity).toBe('1')
    expect(getComputedStyle(closeNative).opacity).toBe('1')

    // 玻璃控件不在任何 opacity 过渡的祖先内（控件层、dialog 都恒 1）：向上到 dialog
    // 的链条上没有任何元素声明 opacity 过渡——祖先 opacity 才会禁后代 blur。
    for (const glass of [toolbar, counter, closeHost, navHost]) {
      let node: HTMLElement | null = glass.parentElement
      while (node && node !== dialog) {
        expect(getComputedStyle(node).transitionProperty).not.toContain('opacity')
        node = node.parentElement
      }
    }
  })
})
