import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiSwitch } from '..'

afterEach(() => document.body.replaceChildren())

function createSwitch(): WebUiSwitch {
  const el = document.createElement('web-ui-switch')
  document.body.appendChild(el)
  return el
}

function getTrack(el: WebUiSwitch): HTMLElement {
  return el.shadowRoot?.querySelector('.wui-switch-track') as HTMLElement
}

describe('WebUiSwitch 手势拖拽（浏览器）', () => {
  it('拖拽超过 50% 行程松手：切换状态并触发 input 与 change 事件', async () => {
    const el = createSwitch()
    await el.updateComplete

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    el.addEventListener('input', e => inputEvents.push(e))
    el.addEventListener('change', e => changeEvents.push(e))

    const track = getTrack(el)
    expect(track).toBeTruthy()

    // 1. pointerdown 启动
    track.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 10,
        clientY: 10
      })
    )
    await el.updateComplete

    // 2. 拖拽 8px (> 50% 的 12px 行程)
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 18,
        clientY: 10
      })
    )
    await el.updateComplete
    expect(track.classList.contains('is-dragging')).toBe(true)

    // 3. pointerup 松手
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 18,
        clientY: 10
      })
    )
    await el.updateComplete

    expect(el.checked).toBe(true)
    expect(inputEvents).toHaveLength(1)
    expect(changeEvents).toHaveLength(1)
    expect(track.classList.contains('is-dragging')).toBe(false)
  })

  it('已开启状态反向拖拽不足 50% 行程且无 flick 松手：回弹保持开启状态，不触发 input/change', async () => {
    const el = createSwitch()
    el.checked = true
    await el.updateComplete

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    el.addEventListener('input', e => inputEvents.push(e))
    el.addEventListener('change', e => changeEvents.push(e))

    const track = getTrack(el)

    track.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 30,
        clientY: 10
      })
    )
    await el.updateComplete

    // 向左拖拽 3px（越过 6px 意图死区若判定，不足 6px 的 50% 行程）
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 27,
        clientY: 10
      })
    )
    await el.updateComplete

    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 27,
        clientY: 10
      })
    )
    await el.updateComplete

    expect(el.checked).toBe(true)
    expect(inputEvents).toHaveLength(0)
    expect(changeEvents).toHaveLength(0)
    expect(track.classList.contains('is-dragging')).toBe(false)
  })

  it('flick 抛掷速度触发：拖拽位移较小但速度快时触发切换', async () => {
    const el = createSwitch()
    await el.updateComplete

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    el.addEventListener('input', e => inputEvents.push(e))
    el.addEventListener('change', e => changeEvents.push(e))

    const track = getTrack(el)

    track.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 10,
        clientY: 10
      })
    )
    await el.updateComplete

    // 快速移动产生高速采样点（间隔 > 8ms 以满足速度估算窗口）
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 18,
        clientY: 10
      })
    )
    await new Promise(r => setTimeout(r, 16))
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 26,
        clientY: 10
      })
    )
    await el.updateComplete

    // 即使位移只有 10px (< 12px)，瞬时速度足够大也会切换为 true
    expect(el.checked).toBe(true)
    expect(inputEvents).toHaveLength(1)
    expect(changeEvents).toHaveLength(1)
  })

  it('快速点击依然正常即时切换', async () => {
    const el = createSwitch()
    await el.updateComplete

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    el.addEventListener('input', e => inputEvents.push(e))
    el.addEventListener('change', e => changeEvents.push(e))

    const track = getTrack(el)
    track.click()
    await el.updateComplete

    expect(el.checked).toBe(true)
    expect(inputEvents).toHaveLength(1)
    expect(changeEvents).toHaveLength(1)
  })

  it('disabled 状态下禁止拖拽切换', async () => {
    const el = createSwitch()
    el.disabled = true
    await el.updateComplete

    const track = getTrack(el)
    track.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 10,
        clientY: 10
      })
    )
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 40,
        clientY: 10
      })
    )
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 40,
        clientY: 10
      })
    )
    await el.updateComplete

    expect(el.checked).toBe(false)
    expect(track.classList.contains('is-dragging')).toBe(false)
  })

  it('指针按住未拖拽时呈现 is-pressed 按压挤压反馈', async () => {
    const el = createSwitch()
    await el.updateComplete

    const track = getTrack(el)
    const thumb = el.shadowRoot?.querySelector('.wui-switch-thumb') as HTMLElement

    track.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 10,
        clientY: 10
      })
    )
    await el.updateComplete

    expect(thumb.classList.contains('is-pressed')).toBe(true)
    expect(track.classList.contains('is-dragging')).toBe(false)

    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 10,
        clientY: 10
      })
    )
    await el.updateComplete

    expect(thumb.classList.contains('is-pressed')).toBe(false)
  })

  it('跨越 50% 拖拽过程中 thumb 持续平滑跟手，不发生瞬跳', async () => {
    const el = createSwitch()
    await el.updateComplete

    const track = getTrack(el)
    const thumb = el.shadowRoot?.querySelector('.wui-switch-thumb') as HTMLElement

    track.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 10,
        clientY: 10
      })
    )
    await el.updateComplete

    // 移动 8px（超过中点 6px，is-open 变为 true）
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 18,
        clientY: 10
      })
    )
    await el.updateComplete

    expect(track.classList.contains('is-open')).toBe(true)
    expect(track.classList.contains('is-dragging')).toBe(true)

    // 验证 transform 准确应用 8px 变量位移（DOMMatrix m41 === 8）与 scale(1.2)，且保持 is-pressed 胶囊样式
    expect(thumb.classList.contains('is-pressed')).toBe(true)
    const transform = getComputedStyle(thumb).transform
    expect(transform).not.toBe('none')
    const matrix = new DOMMatrixReadOnly(transform)
    expect(matrix.m41).toBeCloseTo(8, 0)
    expect(matrix.a).toBeCloseTo(1.2, 1)
  })
})
