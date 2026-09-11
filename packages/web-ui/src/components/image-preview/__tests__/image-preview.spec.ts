import type { LitElement } from 'lit'
import { describe, expect, it } from 'vite-plus/test'

import { cleanupElement, queryA11y } from '@/shared/test-utils'

import { imagePreview } from '..'

const IMAGES = [
  { src: 'https://example.test/a.png', alt: '图 A' },
  { src: 'https://example.test/b.png', alt: '图 B' },
  { src: 'https://example.test/c.png' }
]

// 默认挂载到 fallback overlay root 的 shadow DOM 内（公开结构见 test-utils.getPortalPanel）。
function hostElement(): LitElement {
  const host = document
    .querySelector('[data-wui-overlay-root]')
    ?.shadowRoot?.querySelector('[data-wui-overlay-container] web-ui-image-preview')
  if (!host) throw new Error('image preview host is not mounted')
  return host as LitElement
}

function isMounted(): boolean {
  return (
    document
      .querySelector('[data-wui-overlay-root]')
      ?.shadowRoot?.querySelector('[data-wui-overlay-container] web-ui-image-preview') !== null
  )
}

function dialogElement(): HTMLDialogElement {
  const dialog = queryA11y(hostElement(), 'dialog')
  if (!dialog) throw new Error('native dialog is not rendered')
  return dialog as HTMLDialogElement
}

async function openPreview(options: Partial<Parameters<typeof imagePreview>[0]> = {}) {
  const handle = imagePreview({ images: IMAGES, ...options })
  await hostElement().updateComplete
  return handle
}

describe('imagePreview 命令式 API', () => {
  it('images 为空时抛出可诊断错误', () => {
    expect(() => imagePreview({ images: [] })).toThrowError(/at least one image/)
  })

  it('归一化条目并把 alt 缺省为空字符串', async () => {
    const handle = await openPreview()

    expect(handle.images).toEqual([
      { src: 'https://example.test/a.png', alt: '图 A' },
      { src: 'https://example.test/b.png', alt: '图 B' },
      { src: 'https://example.test/c.png', alt: '' }
    ])

    handle.close()
    await handle.closed
  })

  it('初始索引越界时钳制到有效区间', async () => {
    const handle = await openPreview({ index: 99 })
    expect(handle.index).toBe(IMAGES.length - 1)

    handle.close()
    await handle.closed
  })

  it('打开时挂载宿主并锁定页面滚动，关闭后移除宿主并兑现 closed', async () => {
    const handle = await openPreview()

    expect(isMounted()).toBe(true)
    expect(document.body.style.position).toBe('fixed')

    handle.close()
    await handle.closed

    expect(isMounted()).toBe(false)
    expect(document.body.style.position).toBe('')
  })

  it('next/prev 默认首尾循环', async () => {
    const handle = await openPreview({ index: IMAGES.length - 1 })

    handle.next()
    expect(handle.index).toBe(0)

    handle.prev()
    expect(handle.index).toBe(IMAGES.length - 1)

    handle.close()
    await handle.closed
  })

  it('loop 为 false 时在边界处保持不动', async () => {
    const handle = await openPreview({ index: 0, loop: false })

    handle.prev()
    expect(handle.index).toBe(0)

    handle.goTo(IMAGES.length - 1)
    handle.next()
    expect(handle.index).toBe(IMAGES.length - 1)

    handle.close()
    await handle.closed
  })

  it('goTo 越界时按 loop 环绕或钳制', async () => {
    const looping = await openPreview()
    looping.goTo(IMAGES.length)
    expect(looping.index).toBe(0)
    looping.close()
    await looping.closed

    const bounded = await openPreview({ loop: false })
    bounded.goTo(IMAGES.length + 5)
    expect(bounded.index).toBe(IMAGES.length - 1)
    bounded.close()
    await bounded.closed
  })

  it('缩放钳制在 [1, 4]，切换图片时重置', async () => {
    const handle = await openPreview()

    handle.zoomOut()
    expect(handle.scale).toBe(1)

    for (let step = 0; step < 20; step += 1) handle.zoomIn()
    expect(handle.scale).toBe(4)

    handle.next()
    expect(handle.scale).toBe(1)

    handle.zoomIn()
    handle.resetZoom()
    expect(handle.scale).toBe(1)

    handle.close()
    await handle.closed
  })

  it('方向键切换图片', async () => {
    const handle = await openPreview()

    dialogElement().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(handle.index).toBe(1)

    dialogElement().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(handle.index).toBe(0)

    handle.close()
    await handle.closed
  })

  it('cancel（Escape）阻止原生默认关闭并走退场管线', async () => {
    const handle = await openPreview()

    const canceled = dialogElement().dispatchEvent(new Event('cancel', { cancelable: true }))
    expect(canceled).toBe(false)

    await handle.closed
    expect(isMounted()).toBe(false)
  })

  it('点击空白区域关闭，点击图片不关闭', async () => {
    const handle = await openPreview()
    const image = queryA11y(hostElement(), 'img')

    image?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(isMounted()).toBe(true)

    dialogElement().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await handle.closed
    expect(isMounted()).toBe(false)
  })

  it('原生 dialog 暴露可访问名称，计数器宣告当前位置', async () => {
    const handle = await openPreview()
    const host = hostElement()

    expect(queryA11y(host, 'dialog')?.getAttribute('aria-label')).toBe('图片预览')
    expect(queryA11y(host, '[aria-live]')?.textContent?.trim()).toBe(`1 / ${IMAGES.length}`)

    handle.next()
    await host.updateComplete
    expect(queryA11y(host, '[aria-live]')?.textContent?.trim()).toBe(`2 / ${IMAGES.length}`)

    handle.close()
    await handle.closed
  })

  it('显式 container 决定挂载位置', async () => {
    const container = document.createElement('div')
    document.body.append(container)

    const handle = imagePreview({ images: IMAGES, container })
    expect(container.querySelector('web-ui-image-preview')).not.toBeNull()

    handle.close()
    await handle.closed
    cleanupElement(container)
  })
})
