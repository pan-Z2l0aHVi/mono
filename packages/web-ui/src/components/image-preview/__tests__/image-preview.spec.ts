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

/** 合成触摸指针事件；捏合依赖 pointerId 区分两指。 */
function touchPointer(type: string, init: PointerEventInit): PointerEvent {
  return new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'touch', ...init })
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

  it('双指拉开按距离比例放大，捏合到下限时复位为 1x', async () => {
    const handle = await openPreview()
    const image = queryA11y(hostElement(), 'img') as HTMLImageElement
    const stage = image.parentElement as HTMLElement

    // 两指相距 100px 落下即进入捏合。第一根手指在真实浏览器里一定是主指针。
    stage.dispatchEvent(touchPointer('pointerdown', { pointerId: 11, clientX: 100, clientY: 100, isPrimary: true }))
    stage.dispatchEvent(touchPointer('pointerdown', { pointerId: 12, clientX: 200, clientY: 100, isPrimary: false }))

    // 拉开到 200px：比例 2。
    window.dispatchEvent(touchPointer('pointermove', { pointerId: 12, clientX: 300, clientY: 100 }))
    await hostElement().updateComplete
    expect(handle.scale).toBe(2)

    // 捏合到 25px：比例 0.25，被下限钳回 1x。
    window.dispatchEvent(touchPointer('pointermove', { pointerId: 12, clientX: 125, clientY: 100 }))
    await hostElement().updateComplete
    expect(handle.scale).toBe(1)

    window.dispatchEvent(touchPointer('pointerup', { pointerId: 11, clientX: 100, clientY: 100 }))
    window.dispatchEvent(touchPointer('pointerup', { pointerId: 12, clientX: 125, clientY: 100 }))

    handle.close()
    await handle.closed
  })

  it('双指缩放不触发遮罩关闭，余波 click 被吞掉后遮罩关闭仍可用', async () => {
    const handle = await openPreview()
    const image = queryA11y(hostElement(), 'img') as HTMLImageElement
    const stage = image.parentElement as HTMLElement

    // 第一根手指必须标记为主指针：真实浏览器的首指恒为 primary，也只有它会走
    // 「记录空白命中」的分支。漏掉 isPrimary 会让用例绕过该分支而恒真。
    stage.dispatchEvent(touchPointer('pointerdown', { pointerId: 21, clientX: 100, clientY: 100, isPrimary: true }))
    stage.dispatchEvent(touchPointer('pointerdown', { pointerId: 22, clientX: 200, clientY: 100, isPrimary: false }))
    window.dispatchEvent(touchPointer('pointermove', { pointerId: 22, clientX: 300, clientY: 100 }))
    await hostElement().updateComplete
    expect(isMounted()).toBe(true)

    window.dispatchEvent(touchPointer('pointerup', { pointerId: 21, clientX: 100, clientY: 100 }))
    window.dispatchEvent(touchPointer('pointerup', { pointerId: 22, clientX: 300, clientY: 100 }))
    // 混合输入可能补发一次兼容 click，它不是遮罩点击，不得关闭浮层。
    stage.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await hostElement().updateComplete
    expect(isMounted()).toBe(true)

    // 余波 click 被吞掉后，遮罩关闭不能被永久破坏：真正起于空白的点击仍应关闭。
    stage.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 23, isPrimary: true }))
    stage.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await handle.closed
    expect(isMounted()).toBe(false)
  })

  it('关闭后不再响应仍在进行中的双指缩放', async () => {
    const handle = await openPreview()
    const image = queryA11y(hostElement(), 'img') as HTMLImageElement
    const stage = image.parentElement as HTMLElement

    stage.dispatchEvent(touchPointer('pointerdown', { pointerId: 31, clientX: 100, clientY: 100, isPrimary: true }))
    stage.dispatchEvent(touchPointer('pointerdown', { pointerId: 32, clientX: 200, clientY: 100, isPrimary: false }))
    window.dispatchEvent(touchPointer('pointermove', { pointerId: 32, clientX: 300, clientY: 100 }))
    await hostElement().updateComplete
    expect(handle.scale).toBe(2)

    handle.close()
    // 退场动画期间宿主仍在 DOM 中、指针监听也还挂着，但已关闭的浮层不该再被缩放改写。
    window.dispatchEvent(touchPointer('pointermove', { pointerId: 32, clientX: 500, clientY: 100 }))
    await handle.closed

    expect(handle.scale).toBe(2)
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
    const host = hostElement()
    const image = queryA11y(host, 'img') as HTMLImageElement
    const stage = image.parentElement as HTMLElement

    // 真实指针 click 一定带 detail>=1；实现据此排除键盘/程序化激活的 click。
    // 起于图片的按下 + 被重定向到舞台的 click：指针捕获后 click 的真实形态，不得关闭。
    image.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, isPrimary: true }))
    stage.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    expect(isMounted()).toBe(true)

    // 起于空白区域（舞台）的按下 + click 才关闭。
    stage.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 2, isPrimary: true }))
    stage.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await handle.closed
    expect(isMounted()).toBe(false)
  })

  it('noBackdropClose 时点击空白区域不关闭', async () => {
    const handle = await openPreview({ noBackdropClose: true })
    const image = queryA11y(hostElement(), 'img') as HTMLImageElement
    const stage = image.parentElement as HTMLElement

    stage.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, isPrimary: true }))
    // detail>=1 才能走到 noBackdropClose 分支；否则会被「非指针 click」提前拦下，用例就失去意义。
    stage.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await hostElement().updateComplete

    expect(isMounted()).toBe(true)

    handle.close()
    await handle.closed
  })

  it('非指针来源的 click（detail 为 0）不当作遮罩点击', async () => {
    const handle = await openPreview()
    const stage = (queryA11y(hostElement(), 'img') as HTMLImageElement).parentElement as HTMLElement

    // 先留下一次「起于空白」的按下，再模拟键盘激活控件产生的 click：
    // 它不是遮罩点击，不得关闭浮层。
    stage.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, isPrimary: true }))
    dialogElement().dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await hostElement().updateComplete

    expect(isMounted()).toBe(true)

    handle.close()
    await handle.closed
  })

  it('副指针的按下不覆盖主指针记录的空白判定', async () => {
    const handle = await openPreview()
    const image = queryA11y(hostElement(), 'img') as HTMLImageElement
    const stage = image.parentElement as HTMLElement

    // 主指针起于空白区域：应判定为遮罩点击。
    stage.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, isPrimary: true }))
    // 副指针按在图片上：它不会产生 click，也不得改写上面的判定。
    image.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 2, isPrimary: false }))
    // 主指针释放产生的 click 仍应关闭浮层。
    stage.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await handle.closed
    expect(isMounted()).toBe(false)
  })

  it('noScrollLock 时打开期间不锁定页面滚动', async () => {
    const handle = await openPreview({ noScrollLock: true })

    expect(isMounted()).toBe(true)
    expect(document.body.style.position).toBe('')

    handle.close()
    await handle.closed
  })

  it('展示类选项默认全关，只渲染图片本身', async () => {
    const handle = await openPreview()
    const host = hostElement()

    expect(queryA11y(host, 'img')).not.toBeNull()
    expect(queryA11y(host, '[aria-live]')).toBeNull()
    expect(queryA11y(host, '[aria-label="关闭"]')).toBeNull()
    expect(queryA11y(host, '[aria-label="上一张"]')).toBeNull()
    expect(queryA11y(host, '[aria-label="下一张"]')).toBeNull()
    expect(queryA11y(host, '[aria-label="放大"]')).toBeNull()

    handle.close()
    await handle.closed
  })

  it('nav / toolbar / closable / indicator 各自独立开启对应 UI', async () => {
    const handle = await openPreview({ nav: true, toolbar: true, closable: true, indicator: true })
    const host = hostElement()

    expect(queryA11y(host, '[aria-live]')?.textContent?.trim()).toBe(`1 / ${IMAGES.length}`)
    expect(queryA11y(host, '[aria-label="关闭"]')).not.toBeNull()
    expect(queryA11y(host, '[aria-label="上一张"]')).not.toBeNull()
    expect(queryA11y(host, '[aria-label="下一张"]')).not.toBeNull()
    expect(queryA11y(host, '[aria-label="放大"]')).not.toBeNull()
    expect(queryA11y(host, '[aria-label="缩小"]')).not.toBeNull()
    expect(queryA11y(host, '[aria-label="重置缩放"]')).not.toBeNull()

    // 重置缩放用 radix-icons:reset 的 15x15 实心字形，而不是 lucide 的 24 网格描边字形。
    const resetIcon = queryA11y(host, '[aria-label="重置缩放"] web-ui-icon') as LitElement | null
    if (!resetIcon) throw new Error('reset icon is not rendered')
    await resetIcon.updateComplete
    const resetSvg = resetIcon.shadowRoot?.querySelector('svg')
    expect(resetSvg?.getAttribute('viewBox')).toBe('0 0 15 15')
    expect(resetSvg?.innerHTML).toContain('fill="currentColor"')

    handle.close()
    await handle.closed
  })

  it('closable 时点击关闭按钮关闭浮层', async () => {
    const handle = await openPreview({ closable: true })
    const closeButton = queryA11y(hostElement(), '[aria-label="关闭"]') as HTMLElement
    expect(closeButton).not.toBeNull()

    closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    await handle.closed
    expect(isMounted()).toBe(false)
  })

  it('nav 在只有一张图时不渲染切换按钮', async () => {
    const handle = await openPreview({ nav: true, images: [IMAGES[0]] })
    const host = hostElement()

    expect(queryA11y(host, '[aria-label="上一张"]')).toBeNull()
    expect(queryA11y(host, '[aria-label="下一张"]')).toBeNull()

    handle.close()
    await handle.closed
  })

  it('原生 dialog 暴露可访问名称，计数器宣告当前位置', async () => {
    const handle = await openPreview({ indicator: true })
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
