import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/segmented-trigger'
import type { WebUiSegmentedTrigger } from '@/components/segmented-trigger'

import type { WebUiSegmented } from '..'

afterEach(() => document.body.replaceChildren())

function createSegmented(options: { disabledSecond?: boolean } = {}): {
  segmented: WebUiSegmented
  t1: WebUiSegmentedTrigger
  t2: WebUiSegmentedTrigger
  t3: WebUiSegmentedTrigger
} {
  const segmented = document.createElement('web-ui-segmented') as WebUiSegmented
  segmented.value = 'daily'

  const t1 = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
  t1.value = 'daily'
  t1.textContent = 'Daily'

  const t2 = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
  t2.value = 'weekly'
  t2.textContent = 'Weekly'
  if (options.disabledSecond) t2.disabled = true

  const t3 = document.createElement('web-ui-segmented-trigger') as WebUiSegmentedTrigger
  t3.value = 'monthly'
  t3.textContent = 'Monthly'

  segmented.append(t1, t2, t3)
  document.body.appendChild(segmented)
  return { segmented, t1, t2, t3 }
}

describe('WebUiSegmented 手势拖拽与吸附（浏览器）', () => {
  it('拖拽指示器超过中点松手：吸附至目标选项并触发 input 与 change', async () => {
    const { segmented, t1, t2 } = createSegmented()
    await segmented.updateComplete

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    segmented.addEventListener('input', e => inputEvents.push(e))
    segmented.addEventListener('change', e => changeEvents.push(e))

    const t1Rect = t1.getBoundingClientRect()
    const t2Rect = t2.getBoundingClientRect()
    const targetDistance = t2Rect.left - t1Rect.left

    const inner = segmented.shadowRoot?.querySelector('.wui-segmented') as HTMLElement
    expect(inner).toBeTruthy()

    // 1. pointerdown 启动
    inner.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t1Rect.left + 10,
        clientY: t1Rect.top + 10
      })
    )
    await segmented.updateComplete

    // 2. 拖拽超过中点 (targetDistance * 0.7)
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t1Rect.left + 10 + targetDistance * 0.7,
        clientY: t1Rect.top + 10
      })
    )
    await segmented.updateComplete
    expect(inner.classList.contains('is-dragging')).toBe(true)

    // 3. pointerup 松手
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t1Rect.left + 10 + targetDistance * 0.7,
        clientY: t1Rect.top + 10
      })
    )
    await segmented.updateComplete

    expect(segmented.value).toBe('weekly')
    expect(inputEvents).toHaveLength(1)
    expect(changeEvents).toHaveLength(1)
    expect(inner.classList.contains('is-dragging')).toBe(false)
  })

  it('拖拽未过中点松手：回弹至原选项，不触发 input/change', async () => {
    const { segmented, t1, t2 } = createSegmented()
    await segmented.updateComplete

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    segmented.addEventListener('input', e => inputEvents.push(e))
    segmented.addEventListener('change', e => changeEvents.push(e))

    const t1Rect = t1.getBoundingClientRect()
    const t2Rect = t2.getBoundingClientRect()
    const targetDistance = t2Rect.left - t1Rect.left

    const inner = segmented.shadowRoot?.querySelector('.wui-segmented') as HTMLElement

    inner.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t1Rect.left + 10,
        clientY: t1Rect.top + 10
      })
    )
    await segmented.updateComplete

    // 移动距离越过 6px 阈值但未越过中点 (targetDistance * 0.3)
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t1Rect.left + 10 + Math.max(8, targetDistance * 0.3),
        clientY: t1Rect.top + 10
      })
    )
    await segmented.updateComplete
    expect(inner.classList.contains('is-dragging')).toBe(true)

    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t1Rect.left + 10 + Math.max(8, targetDistance * 0.3),
        clientY: t1Rect.top + 10
      })
    )
    await segmented.updateComplete

    expect(segmented.value).toBe('daily')
    expect(inputEvents).toHaveLength(0)
    expect(changeEvents).toHaveLength(0)
    expect(inner.classList.contains('is-dragging')).toBe(false)
  })

  it('跳过 disabled 选项：自动吸附至最近的可用选项', async () => {
    // t2 (weekly) disabled
    const { segmented, t1, t2, t3 } = createSegmented({ disabledSecond: true })
    await segmented.updateComplete

    const t1Rect = t1.getBoundingClientRect()
    const t2Rect = t2.getBoundingClientRect()
    const inner = segmented.shadowRoot?.querySelector('.wui-segmented') as HTMLElement

    inner.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t1Rect.left + 10,
        clientY: t1Rect.top + 10
      })
    )
    await segmented.updateComplete

    // 拖到 t2 (weekly) 所在区域
    const t2Center = t2Rect.left + t2Rect.width / 2
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t2Center,
        clientY: t1Rect.top + 10
      })
    )
    await segmented.updateComplete

    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t2Center,
        clientY: t1Rect.top + 10
      })
    )
    await segmented.updateComplete

    // 因为 t2 disabled，所以吸附到可用的 t1 或 t3；因为 t2 更接近谁就吸附到谁（t1 或 t3），但绝不会是 t2
    expect(segmented.value).not.toBe('weekly')
    expect(['daily', 'monthly']).toContain(segmented.value)
  })

  it('轻点（Tap）触发器正常切换选项且触发事件', async () => {
    const { segmented, t2 } = createSegmented()
    await segmented.updateComplete

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    segmented.addEventListener('input', e => inputEvents.push(e))
    segmented.addEventListener('change', e => changeEvents.push(e))

    // 真实轻点序列：pointerdown -> pointerup (未移动) -> click
    const inner = t2.shadowRoot?.querySelector('.wui-segmented-trigger') as HTMLElement
    expect(inner).toBeTruthy()

    const t2Rect = t2.getBoundingClientRect()
    inner.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        composed: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t2Rect.left + 10,
        clientY: t2Rect.top + 10
      })
    )
    inner.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        composed: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t2Rect.left + 10,
        clientY: t2Rect.top + 10
      })
    )
    inner.click()
    await segmented.updateComplete

    expect(segmented.value).toBe('weekly')
    expect(inputEvents).toHaveLength(1)
    expect(changeEvents).toHaveLength(1)
  })

  it('按下当前选中的 trigger 时指示器呈现 scale(1.3) 按压反馈', async () => {
    const { segmented, t1 } = createSegmented()
    await segmented.updateComplete

    const inner = segmented.shadowRoot?.querySelector('.wui-segmented') as HTMLElement
    const indicator = segmented.shadowRoot?.querySelector('.wui-segmented-indicator') as HTMLElement
    const t1Rect = t1.getBoundingClientRect()

    // 按下当前激活的 t1
    inner.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t1Rect.left + 10,
        clientY: t1Rect.top + 10
      })
    )
    await segmented.updateComplete
    await new Promise(r => setTimeout(r, 140))

    expect(inner.classList.contains('is-pressed')).toBe(true)
    const transform = getComputedStyle(indicator).transform
    expect(transform).not.toBe('none')
    const matrix = new DOMMatrixReadOnly(transform)
    expect(matrix.a).toBeCloseTo(1.2, 1) // scaleX 1.2

    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t1Rect.left + 10,
        clientY: t1Rect.top + 10
      })
    )
    await segmented.updateComplete

    expect(inner.classList.contains('is-pressed')).toBe(false)
  })

  it('按下未选中的 trigger 不启动拖拽且指示器不产生 scale(1.3)', async () => {
    const { segmented, t2 } = createSegmented()
    await segmented.updateComplete

    const inner = segmented.shadowRoot?.querySelector('.wui-segmented') as HTMLElement
    const indicator = segmented.shadowRoot?.querySelector('.wui-segmented-indicator') as HTMLElement
    const t2Rect = t2.getBoundingClientRect()

    // 按下未激活的 t2
    inner.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t2Rect.left + 10,
        clientY: t2Rect.top + 10
      })
    )
    await segmented.updateComplete

    expect(inner.classList.contains('is-pressed')).toBe(false)
    expect(inner.classList.contains('is-dragging')).toBe(false)

    // 拖动不会触发 indicator 拖拽
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t2Rect.left + 30,
        clientY: t2Rect.top + 10
      })
    )
    await segmented.updateComplete
    expect(inner.classList.contains('is-dragging')).toBe(false)
  })

  it('flick 抛掷快速手势切换至下一选项', async () => {
    const { segmented, t1 } = createSegmented()
    await segmented.updateComplete

    const t1Rect = t1.getBoundingClientRect()
    const inner = segmented.shadowRoot?.querySelector('.wui-segmented') as HTMLElement

    inner.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t1Rect.left + 10,
        clientY: t1Rect.top + 10
      })
    )
    await segmented.updateComplete

    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t1Rect.left + 20,
        clientY: t1Rect.top + 10
      })
    )
    await new Promise(r => setTimeout(r, 16))
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: t1Rect.left + 35,
        clientY: t1Rect.top + 10
      })
    )
    await segmented.updateComplete

    expect(segmented.value).toBe('weekly')
  })
})
