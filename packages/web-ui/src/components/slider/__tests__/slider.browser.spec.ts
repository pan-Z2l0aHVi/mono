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
    expect(getComputedStyle(slider!).cursor).toBe('grabbing')
    expect(getComputedStyle(thumb).cursor).toBe('grabbing')

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

  it('按住未移动时呈现按压反馈且不进入拖拽状态', async () => {
    const el = document.createElement('web-ui-slider')
    document.body.append(el)
    await el.updateComplete

    expect(el.shadowRoot).toBeTruthy()
    const slider = el.shadowRoot!.querySelector<HTMLElement>('[role="slider"]') as HTMLElement
    const thumb = slider.querySelector('.wui-slider-thumb') as HTMLElement
    const rect = slider.getBoundingClientRect()

    slider.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: rect.left + rect.width * 0.25,
        clientY: rect.top + rect.height / 2,
        pointerId: 1
      })
    )
    await el.updateComplete

    expect(thumb.classList.contains('is-pressed')).toBe(true)
    expect(thumb.classList.contains('is-dragging')).toBe(false)
    expect(getComputedStyle(slider).cursor).toBe('default')
  })

  it('移动未超过意图阈值时不进入拖拽状态', async () => {
    const el = document.createElement('web-ui-slider')
    document.body.append(el)
    await el.updateComplete

    expect(el.shadowRoot).toBeTruthy()
    const slider = el.shadowRoot!.querySelector<HTMLElement>('[role="slider"]') as HTMLElement
    const thumb = slider.querySelector('.wui-slider-thumb') as HTMLElement
    const rect = slider.getBoundingClientRect()
    const y = rect.top + rect.height / 2

    slider.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: rect.left + rect.width * 0.25,
        clientY: y,
        pointerId: 1
      })
    )
    await el.updateComplete

    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        clientX: rect.left + rect.width * 0.25 + 4,
        clientY: y
      })
    )
    await el.updateComplete
    expect(thumb.classList.contains('is-dragging')).toBe(false)
    expect(getComputedStyle(slider).cursor).toBe('default')

    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        clientX: rect.left + rect.width * 0.25 + 8,
        clientY: y
      })
    )
    await el.updateComplete
    expect(thumb.classList.contains('is-dragging')).toBe(true)
    expect(getComputedStyle(slider).cursor).toBe('grabbing')
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

  it('移动端水平轨道禁止浏览器手势接管，横向拖拽交给组件手势处理', async () => {
    const el = document.createElement('web-ui-slider')
    document.body.append(el)
    await el.updateComplete

    const slider = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]')
    expect(getComputedStyle(slider!).touchAction).toBe('none')
  })

  it('移动端垂直轨道禁止浏览器手势接管，纵向拖拽交给组件手势处理', async () => {
    const el = document.createElement('web-ui-slider')
    el.setAttribute('vertical', '')
    document.body.append(el)
    await el.updateComplete

    const slider = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]')
    expect(getComputedStyle(slider!).touchAction).toBe('none')
  })

  it('host 同时声明 touch-action: none，覆盖 light DOM 命中链', async () => {
    const el = document.createElement('web-ui-slider')
    document.body.append(el)
    await el.updateComplete

    expect(getComputedStyle(el).touchAction).toBe('none')
  })

  it('拖拽期间 touchmove 默认滚动被阻止，松手后解除', async () => {
    const el = document.createElement('web-ui-slider')
    document.body.append(el)
    await el.updateComplete

    const slider = el.shadowRoot!.querySelector<HTMLElement>('[role="slider"]') as HTMLElement
    const thumb = slider.querySelector('.wui-slider-thumb') as HTMLElement
    const rect = slider.getBoundingClientRect()
    const y = rect.top + rect.height / 2

    slider.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: rect.left + rect.width * 0.25,
        clientY: y,
        pointerId: 1
      })
    )
    await el.updateComplete

    // 意图判定前：命中深层 thumb 的非 composed touchmove（不跨 shadow 边界）也被
    // composedPath 挂载的守护阻止，这正是 iOS Safari 滚动接管前需要的关键兜底。
    const onThumb = new TouchEvent('touchmove', { bubbles: true, composed: false, cancelable: true })
    thumb.dispatchEvent(onThumb)
    expect(onThumb.defaultPrevented).toBe(true)

    // 确认拖拽后：命中链上的守护持续有效。
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        clientX: rect.left + rect.width * 0.75,
        clientY: y
      })
    )
    await el.updateComplete

    const onThumbAfterCommit = new TouchEvent('touchmove', { bubbles: true, composed: false, cancelable: true })
    thumb.dispatchEvent(onThumbAfterCommit)
    expect(onThumbAfterCommit.defaultPrevented).toBe(true)

    // document/window 收不到 shadow 内 touchmove，不挂死代码。
    const onWindow = new TouchEvent('touchmove', { bubbles: true, cancelable: true })
    window.dispatchEvent(onWindow)
    expect(onWindow.defaultPrevented).toBe(false)

    // 松手后守护全部卸载，页面滚动恢复。
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 1,
        clientX: rect.left + rect.width * 0.75,
        clientY: y
      })
    )
    await el.updateComplete

    const onThumbAfter = new TouchEvent('touchmove', { bubbles: true, composed: false, cancelable: true })
    thumb.dispatchEvent(onThumbAfter)
    expect(onThumbAfter.defaultPrevented).toBe(false)
  })

  it('捕获转手：命中元素的 lostpointercapture 不取消拖拽，track 自身丢失才取消', async () => {
    const el = document.createElement('web-ui-slider')
    document.body.append(el)
    await el.updateComplete

    const slider = el.shadowRoot!.querySelector<HTMLElement>('[role="slider"]') as HTMLElement
    const thumb = slider.querySelector('.wui-slider-thumb') as HTMLElement
    const rect = slider.getBoundingClientRect()
    const y = rect.top + rect.height / 2

    // 触摸落在 thumb（命中元素），指针隐式捕获到 thumb；组件随后把捕获转手到 track。
    slider.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: rect.left + rect.width * 0.25,
        clientY: y,
        pointerId: 1
      })
    )
    await el.updateComplete

    // 越过 6px 意图阈值：组件 setPointerCapture(track)（真实捕获）。
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        clientX: rect.left + rect.width * 0.25 + 10,
        clientY: y
      })
    )
    await el.updateComplete
    expect(thumb.classList.contains('is-dragging')).toBe(true)

    // 命中元素（thumb）收到 lostpointercapture（隐式捕获被 track 抢走）——必须忽略。
    thumb.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, composed: true, pointerId: 1 }))
    await el.updateComplete
    expect(thumb.classList.contains('is-dragging')).toBe(true)

    // 拖拽继续跟手。
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        clientX: rect.left + rect.width * 0.75,
        clientY: y
      })
    )
    await el.updateComplete
    expect(el.value).toBeGreaterThan(50)

    // track 自身意外丢失捕获：取消拖拽。
    slider.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, composed: true, pointerId: 1 }))
    await el.updateComplete
    expect(thumb.classList.contains('is-dragging')).toBe(false)
    expect(thumb.classList.contains('is-pressed')).toBe(false)

    // 取消后 value 不再跟随。
    const afterCancel = el.value
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 1,
        clientX: rect.left + rect.width * 0.2,
        clientY: y
      })
    )
    await el.updateComplete
    expect(el.value).toBe(afterCancel)
  })

  it('按压与拖拽期间 handle 的毛玻璃表面组成恒定（backdrop-filter 与背景不变）', async () => {
    const el = document.createElement('web-ui-slider')
    document.body.append(el)
    await el.updateComplete

    const slider = el.shadowRoot?.querySelector<HTMLElement>('[role="slider"]')
    expect(slider).toBeTruthy()
    const thumb = slider!.querySelector('.wui-slider-thumb') as HTMLElement
    const rect = slider!.getBoundingClientRect()
    const restBackdrop = getComputedStyle(thumb).backdropFilter
    const restBg = getComputedStyle(thumb).backgroundColor
    expect(restBackdrop).not.toBe('none')
    expect(restBg).not.toBe('rgba(0, 0, 0, 0)')

    const y = rect.top + rect.height / 2
    // 按压（pointerdown）：背景与 backdrop-filter 必须与静止态完全一致。
    slider!.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: rect.left + rect.width * 0.25,
        clientY: y,
        pointerId: 1
      })
    )
    await el.updateComplete
    expect(thumb.classList.contains('is-pressed')).toBe(true)
    expect(getComputedStyle(thumb).backdropFilter).toBe(restBackdrop)
    expect(getComputedStyle(thumb).backgroundColor).toBe(restBg)

    // 拖拽：仍一致。
    slider!.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: rect.left + rect.width * 0.75,
        clientY: y,
        pointerId: 1
      })
    )
    await el.updateComplete
    expect(thumb.classList.contains('is-dragging')).toBe(true)
    expect(getComputedStyle(thumb).backdropFilter).toBe(restBackdrop)
    expect(getComputedStyle(thumb).backgroundColor).toBe(restBg)

    slider!.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        clientX: rect.left + rect.width * 0.75,
        clientY: y,
        pointerId: 1
      })
    )
    await el.updateComplete
    expect(getComputedStyle(thumb).backdropFilter).toBe(restBackdrop)
    expect(getComputedStyle(thumb).backgroundColor).toBe(restBg)
  })
})
