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
    const image = queryA11y(host, 'img') as HTMLImageElement

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = image.parentElement as HTMLElement
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
    const image = queryA11y(host, 'img') as HTMLImageElement

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = image.parentElement as HTMLElement
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

  it('放大后拖拽平移，位移被钳制在图片溢出范围内', async () => {
    const { handle, host } = await openPreview()
    const image = queryA11y(host, 'img') as HTMLImageElement

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = image.parentElement as HTMLElement

    handle.zoomIn()
    await host.updateComplete

    const scale = handle.scale
    const maxX = Math.max(0, (image.offsetWidth * scale - stage.clientWidth) / 2)
    const maxY = Math.max(0, (image.offsetHeight * scale - stage.clientHeight) / 2)
    expect(maxX).toBeGreaterThan(0)

    stage.dispatchEvent(pointer('pointerdown', { button: 0, clientX: 0, clientY: 0 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 10_000, clientY: 10_000 }))
    await host.updateComplete

    const matrix = new DOMMatrixReadOnly(getComputedStyle(image).transform)
    expect(matrix.m41).toBeCloseTo(maxX, 0)
    expect(matrix.m42).toBeCloseTo(maxY, 0)

    stage.dispatchEvent(pointer('pointerup', {}))
    handle.close()
    await handle.closed
  })

  it('图片加载完成后淡入可见', async () => {
    const { handle, host } = await openPreview()
    const image = queryA11y(host, 'img') as HTMLImageElement

    await pollUntil(() => Number(getComputedStyle(image).opacity) === 1, 'image did not fade in')
    expect(Number(getComputedStyle(image).opacity)).toBe(1)

    handle.close()
    await handle.closed
  })

  it('1x 时图片收缩到视口内，不被舞台裁切', async () => {
    const { handle, host } = await openPreview()
    const image = queryA11y(host, 'img') as HTMLImageElement

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = image.parentElement as HTMLElement

    expect(image.offsetWidth).toBeLessThanOrEqual(stage.clientWidth)
    expect(image.offsetHeight).toBeLessThanOrEqual(stage.clientHeight)

    handle.close()
    await handle.closed
  })

  it('放大后连续点击图片不关闭浮层', async () => {
    const { handle, host } = await openPreview()
    const image = queryA11y(host, 'img') as HTMLImageElement

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
    const image = queryA11y(host, 'img') as HTMLImageElement

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
    const image = queryA11y(host, 'img') as HTMLImageElement

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = image.parentElement as HTMLElement

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
    const image = queryA11y(host, 'img') as HTMLImageElement

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = image.parentElement as HTMLElement

    handle.zoomIn()
    await host.updateComplete
    const scale = handle.scale
    expect(scale).toBeGreaterThan(1)
    const maxX = Math.max(0, (image.offsetWidth * scale - stage.clientWidth) / 2)
    expect(maxX).toBeGreaterThan(0)

    // 与未放大时相同的横向拖拽方向：放大后必须走平移而不是切图。
    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 100, clientY: 300 }))
    await host.updateComplete

    const matrix = new DOMMatrixReadOnly(getComputedStyle(image).transform)
    expect(matrix.m41).toBeCloseTo(-maxX, 0)

    stage.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('swipe 开启但只有一张图时，横向拖拽既不位移也不切换', async () => {
    const { handle, host } = await openPreview({ swipe: true, images: [IMAGES[0]] })
    const image = queryA11y(host, 'img') as HTMLImageElement

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = image.parentElement as HTMLElement

    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 300 }))
    await host.updateComplete

    // 单图时手势不应启动，因此拖拽过程中没有跟手位移。
    const during = new DOMMatrixReadOnly(getComputedStyle(image).transform)
    expect(during.m41).toBe(0)

    stage.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

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
    const image = queryA11y(host, 'img') as HTMLImageElement

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = image.parentElement as HTMLElement

    // 向左拖 300px：越过滑动阈值，进入下一张。
    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 300 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(1)

    // 向右拖回：回到上一张。
    stage.dispatchEvent(pointer('pointerdown', { clientX: 200, clientY: 300, pointerId: 2 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 380, clientY: 300, pointerId: 2 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 500, clientY: 300, pointerId: 2 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('swipe 默认关闭，横向拖拽不切换图片', async () => {
    const { handle, host } = await openPreview()
    const image = queryA11y(host, 'img') as HTMLImageElement

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = image.parentElement as HTMLElement

    stage.dispatchEvent(pointer('pointerdown', { clientX: 400, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 200, clientY: 300 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 100, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('swipe 开启且 loop 关闭时，边界方向的拖拽保持不动', async () => {
    const { handle, host } = await openPreview({ swipe: true, loop: false, index: 0 })
    const image = queryA11y(host, 'img') as HTMLImageElement

    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = image.parentElement as HTMLElement

    // 首张向右拖（请求上一张）在 loop 关闭时应被钳制。
    stage.dispatchEvent(pointer('pointerdown', { clientX: 200, clientY: 300 }))
    stage.dispatchEvent(pointer('pointermove', { clientX: 420, clientY: 300 }))
    stage.dispatchEvent(pointer('pointerup', { clientX: 560, clientY: 300 }))
    await host.updateComplete
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })
})
