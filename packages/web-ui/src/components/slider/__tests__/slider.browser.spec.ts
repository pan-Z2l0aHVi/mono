import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiSlider } from '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiSlider 组件（浏览器）', () => {
  it('真实指针拖拽更新 value 并触发 change', async () => {
    const el = document.createElement('web-ui-slider')
    document.body.append(el)
    await el.updateComplete

    const slider = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]')
    expect(slider).toBeTruthy()
    const rect = slider!.getBoundingClientRect()

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    el.addEventListener('input', e => inputEvents.push(e))
    el.addEventListener('change', e => changeEvents.push(e))

    const y = rect.top + rect.height / 2
    // pointerdown 在轨道 25% 处
    slider!.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: rect.left + rect.width * 0.25,
        clientY: y,
        pointerId: 1
      })
    )
    await el.updateComplete
    const afterDown = el.value

    // pointermove 拖到 75%
    slider!.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: rect.left + rect.width * 0.75,
        clientY: y,
        pointerId: 1
      })
    )
    await el.updateComplete
    await new Promise(r => setTimeout(r, 140))
    const afterMove = el.value

    const thumb = slider!.querySelector('.wui-slider-thumb') as HTMLElement
    expect(thumb.classList.contains('is-dragging')).toBe(true)

    // pointerup 结束拖拽
    slider!.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        clientX: rect.left + rect.width * 0.75,
        clientY: y,
        pointerId: 1
      })
    )
    await el.updateComplete

    expect(afterDown).toBeLessThan(50)
    expect(afterMove).toBeGreaterThan(50)
    expect(inputEvents.length).toBeGreaterThan(0)
    expect(changeEvents).toHaveLength(1) // 拖拽结束时 value 已变化，触发一次 change
  })

  it('pointerup 后继续移动不再更新 value', async () => {
    const el = document.createElement('web-ui-slider')
    document.body.append(el)
    await el.updateComplete

    const slider = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]')
    const rect = slider!.getBoundingClientRect()
    const y = rect.top + rect.height / 2

    slider!.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: rect.left + rect.width * 0.5,
        clientY: y,
        pointerId: 1
      })
    )
    await el.updateComplete
    const valueAtDown = el.value

    slider!.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        clientX: rect.left + rect.width * 0.5,
        clientY: y,
        pointerId: 1
      })
    )
    await el.updateComplete

    // pointerup 后不再处于拖拽状态，move 不应改变 value
    slider!.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: rect.left + rect.width * 0.9,
        clientY: y,
        pointerId: 1
      })
    )
    await el.updateComplete

    expect(el.value).toBe(valueAtDown)
  })

  it('指针交互后获得键盘焦点且响应键盘方向键', async () => {
    const el = document.createElement('web-ui-slider')
    document.body.append(el)
    await el.updateComplete

    const slider = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]')
    expect(slider).toBeTruthy()
    const rect = slider!.getBoundingClientRect()

    // 点击 50% 位置
    slider!.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        composed: true,
        clientX: rect.left + rect.width * 0.5,
        clientY: rect.top + rect.height / 2,
        pointerId: 1
      })
    )
    slider!.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        composed: true,
        clientX: rect.left + rect.width * 0.5,
        clientY: rect.top + rect.height / 2,
        pointerId: 1
      })
    )
    await el.updateComplete

    expect(el.value).toBe(50)

    // 键盘方向键操作
    slider!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await el.updateComplete

    expect(el.value).toBe(51)
  })

  it('禁用时不响应指针拖拽', async () => {
    const el = document.createElement('web-ui-slider')
    el.disabled = true
    document.body.append(el)
    await el.updateComplete

    const slider = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]')
    const rect = slider!.getBoundingClientRect()
    slider!.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: rect.left + rect.width * 0.8,
        clientY: rect.top + rect.height / 2,
        pointerId: 1
      })
    )
    await el.updateComplete

    expect(el.value).toBe(0)
  })
})
