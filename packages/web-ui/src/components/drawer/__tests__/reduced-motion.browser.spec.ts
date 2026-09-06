import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/theme'

import type { WebUiDrawer } from '..'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

async function waitForOpenTransition() {
  await new Promise(resolve => setTimeout(resolve, 350))
}

afterEach(() => document.body.replaceChildren())

describe('减少动效下的 Drawer 拖拽关闭（浏览器）', () => {
  it('超过阈值松手：跳过弹簧动画即时关闭', async () => {
    const el = document.createElement('web-ui-drawer')
    document.body.append(el)
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition()

    const dragZone = el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
    dragZone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    )
    await el.updateComplete
    dragZone.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 300, clientY: 300 })
    )
    await el.updateComplete
    dragZone.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 300, clientY: 300 })
    )

    // reduced-motion 下松手即时到位：无需等待弹簧动画，open 立即变化
    expect(el.open).toBe(false)
    await nextFrame()
    expect(el.shadowRoot?.querySelector('dialog')?.open).toBe(false)
  })

  it('未达阈值松手：即时弹回打开位', async () => {
    const el = document.createElement('web-ui-drawer')
    document.body.append(el)
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition()

    const dialog = el.shadowRoot?.querySelector('dialog') as HTMLDialogElement
    const dragZone = el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
    dragZone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    )
    await el.updateComplete
    dragZone.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 130, clientY: 300 })
    )
    await el.updateComplete
    dragZone.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 130, clientY: 300 })
    )
    await el.updateComplete
    await nextFrame()

    expect(el.open).toBe(true)
    expect(dialog.open).toBe(true)
    // 即时清除拖拽内联样式，交还 CSS 管辖；reduced-motion 打开态为零位移
    //（none 与 translate(0,0) 渲染等价，不锁定序列化格式）
    const transform = getComputedStyle(dialog).transform
    const matrix = !transform || transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(transform)
    expect(matrix.m41).toBe(0)
    expect(matrix.m42).toBe(0)
    expect(dialog.classList.contains('is-dragging')).toBe(false)
  })

  it('所在 web-ui-theme 设置 motion=reduced 时：跳过弹簧动画即时关闭', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    theme.setAttribute('motion', 'reduced')
    document.body.append(theme)

    const el = document.createElement('web-ui-drawer')
    theme.append(el)
    el.draggable = true
    el.open = true
    await el.updateComplete
    await waitForOpenTransition()

    const dragZone = el.shadowRoot?.querySelector('.wui-drawer-drag-zone') as HTMLElement
    dragZone.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 100, clientY: 300 })
    )
    await el.updateComplete
    dragZone.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 300, clientY: 300 })
    )
    await el.updateComplete
    dragZone.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 1, isPrimary: true, clientX: 300, clientY: 300 })
    )

    // theme motion=reduced 时松手即时到位：无需等待弹簧动画，open 立即变化
    expect(el.open).toBe(false)
    await nextFrame()
    expect(el.shadowRoot?.querySelector('dialog')?.open).toBe(false)
  })
})
