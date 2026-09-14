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

    // 拖拽过程中保持 is-pressed 按压反馈
    expect(thumb.classList.contains('is-pressed')).toBe(true)
  })

  it('拖拽中光标从 default 切换为 grabbing', async () => {
    const el = createSwitch()
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
    await el.updateComplete
    expect(getComputedStyle(track).cursor).toBe('default')

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
    expect(getComputedStyle(track).cursor).toBe('grabbing')
  })

  it('移动端轨道禁止浏览器手势接管，横向拖拽交给组件手势处理', async () => {
    const el = createSwitch()
    await el.updateComplete

    expect(getComputedStyle(getTrack(el)).touchAction).toBe('none')
  })

  it('静止态实体白 thumb，按压/拖拽切换为玻璃（backdrop blur + 透明背景 + 放大 + 深阴影）', async () => {
    const el = createSwitch()
    await el.updateComplete

    const track = getTrack(el)
    const thumb = track.querySelector('.wui-switch-thumb') as HTMLElement

    // 静止态：无玻璃类，backdrop-filter 为 none，背景为实体白。
    const restBackdrop = getComputedStyle(thumb).backdropFilter
    const restBg = getComputedStyle(thumb).backgroundColor
    const restShadow = getComputedStyle(thumb).boxShadow
    expect(thumb.classList.contains('wui-glass')).toBe(false)
    expect(restBackdrop).toBe('none')
    expect(restBg).toBe('rgb(255, 255, 255)')

    // 按压：切换为玻璃（wui-glass），背景透明让 backdrop blur 透出，放大 1.5x。
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
    expect(thumb.classList.contains('wui-glass')).toBe(true)
    expect(getComputedStyle(thumb).backdropFilter).not.toBe('none')
    // 立体玻璃感：按压时背景切透明（backdrop blur 透出）、投影加深。box-shadow 与
    // 背景都直接写值（不经自定义属性中转，iOS 可靠），等 80ms 过渡收敛后计算值才到位。
    await new Promise(resolve => setTimeout(resolve, 120))
    expect(getComputedStyle(thumb).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    const pressedShadow = getComputedStyle(thumb).boxShadow
    expect(pressedShadow).not.toBe(restShadow)
    // 用户两次要求减档后的最终值：三层投影逐值断言（直接写值，不经 var 中转）。
    expect(pressedShadow).toContain('0px 1px 6px')
    expect(pressedShadow).toContain('0px 6px 16px')
    expect(pressedShadow).toContain('0px 14px 28px')
    expect(pressedShadow).toContain('rgba(0, 0, 0, 0.2)')
    expect(pressedShadow).toContain('rgba(0, 0, 0, 0.16)')
    expect(pressedShadow).toContain('rgba(0, 0, 0, 0.1)')

    // 拖拽：玻璃组成与按压态一致（背景透明 + backdrop blur），阴影保持加深。
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
    expect(thumb.classList.contains('wui-glass')).toBe(true)
    expect(getComputedStyle(thumb).backdropFilter).not.toBe('none')
    expect(getComputedStyle(thumb).backgroundColor).toBe('rgba(0, 0, 0, 0)')

    // 松手：回到实体白静止态。
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
    // 背景从透明切回实体白有 80ms 过渡，等收敛后再断言静止态。
    await new Promise(resolve => setTimeout(resolve, 120))
    expect(thumb.classList.contains('wui-glass')).toBe(false)
    expect(getComputedStyle(thumb).backdropFilter).toBe('none')
    expect(getComputedStyle(thumb).backgroundColor).toBe('rgb(255, 255, 255)')
  })
})
