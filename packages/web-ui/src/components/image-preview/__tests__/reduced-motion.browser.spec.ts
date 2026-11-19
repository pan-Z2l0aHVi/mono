import type { LitElement } from 'lit'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { pollUntil, waitForFrame } from '@/shared/test-utils'

import { imagePreview } from '..'

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#08f"/></svg>'
const IMAGE_SRC = `data:image/svg+xml,${encodeURIComponent(SVG)}`
const IMAGES = [
  { src: IMAGE_SRC, alt: '图 A' },
  { src: IMAGE_SRC, alt: '图 B' }
]

afterEach(() => document.body.replaceChildren())

function hostElement(): LitElement {
  const host = document
    .querySelector('[data-wui-overlay-root]')
    ?.shadowRoot?.querySelector('[data-wui-overlay-container] web-ui-image-preview')
  if (!host) throw new Error('image preview host is not mounted')
  return host as LitElement
}

function currentImage(host: HTMLElement): HTMLImageElement {
  return host.shadowRoot?.querySelector(
    '.wui-image-preview-slide.is-current .wui-image-preview-image'
  ) as HTMLImageElement
}

function trackOf(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector('.wui-image-preview-track') as HTMLElement
}

function timedPointer(type: string, init: PointerEventInit & { timeStamp?: number }): PointerEvent {
  const { timeStamp, ...rest } = init
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    isPrimary: true,
    ...rest
  })
  if (timeStamp !== undefined) Object.defineProperty(event, 'timeStamp', { value: timeStamp })
  return event
}

describe('image-preview reduced motion（浏览器）', () => {
  it('reduced motion 下 track 无 transform 过渡，settle 由 timer 收尾并提交切图', async () => {
    const handle = imagePreview({ images: IMAGES, swipe: true })
    const host = hostElement()
    await host.updateComplete
    const image = currentImage(host)
    await pollUntil(() => image.complete && image.offsetWidth > 0, 'image did not load')
    const stage = image.closest('.wui-image-preview-stage') as HTMLElement

    stage.dispatchEvent(timedPointer('pointerdown', { clientX: 400, clientY: 300, timeStamp: 0 }))
    stage.dispatchEvent(timedPointer('pointermove', { clientX: 100, clientY: 300, timeStamp: 300 }))
    stage.dispatchEvent(timedPointer('pointerup', { clientX: 100, clientY: 300, timeStamp: 600 }))
    await host.updateComplete
    await waitForFrame()

    const track = trackOf(host)
    // reduced 下收尾无 transform 过渡、由 timer 兜底提交切图——判据取过渡属性、
    // 动画集合与最终提交；stage 的 is-settling 是内部状态类，不作断言。
    expect(getComputedStyle(track).transitionProperty).toBe('opacity')
    expect(track.getAnimations()).toHaveLength(0)
    expect(handle.index).toBe(0)

    await pollUntil(() => handle.index === 1, 'reduced-motion settle timer did not commit the swipe')
    expect(handle.index).toBe(1)

    handle.close()
    await handle.closed
  })
})
