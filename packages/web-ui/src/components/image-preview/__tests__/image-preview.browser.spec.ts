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
})
