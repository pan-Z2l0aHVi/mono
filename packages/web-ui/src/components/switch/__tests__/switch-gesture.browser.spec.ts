import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, mountElement, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiSwitch } from '..'

afterEach(() => document.body.replaceChildren())

/**
 * 拖拽手势契约：手势的**结果**（checked 状态与 input / change 派发）是公开可观察面。
 * 内部态 class（is-dragging / is-open / is-pressed）、光标与 touch-action 属实现细节，
 * 按 ADR-0005 §5 不在契约 spec 断言；指针交互的视觉反馈归真机验收。
 */
const createSwitch = (): WebUiSwitch => mountElement<WebUiSwitch>('web-ui-switch')

/** 断言语义角色存在后返回它；手势必须落在承载 role 的可交互元素上。 */
const trackOf = (el: WebUiSwitch): HTMLElement => {
  const node = queryA11y(el, '[role="switch"]')
  expect(node, '未找到 role="switch" 的可交互元素').toBeTruthy()
  return node as HTMLElement
}

const pointer = (type: string, x: number, y: number): PointerEvent =>
  new PointerEvent(type, { bubbles: true, isPrimary: true, pointerId: 1, clientX: x, clientY: y })

describe('WebUiSwitch 手势拖拽（浏览器）', () => {
  it('拖拽超过 50% 行程松手：切换状态并触发 input 与 change 事件', async () => {
    const el = createSwitch()
    await waitForUpdate(el)

    const [inputEvents] = spyEvents(el, 'input')
    const [changeEvents] = spyEvents(el, 'change')

    trackOf(el).dispatchEvent(pointer('pointerdown', 10, 10))
    await waitForUpdate(el)

    // 拖拽 8px，超过 12px 行程的一半
    window.dispatchEvent(pointer('pointermove', 18, 10))
    await waitForUpdate(el)

    window.dispatchEvent(pointer('pointerup', 18, 10))
    await waitForUpdate(el)

    expect(el.checked).toBe(true)
    expect(inputEvents).toHaveLength(1)
    expect(changeEvents).toHaveLength(1)
    cleanupElement(el)
  })

  it('已开启状态反向拖拽不足 50% 行程且无 flick 松手：保持开启状态，不触发事件', async () => {
    const el = createSwitch()
    el.checked = true
    await waitForUpdate(el)

    const [inputEvents] = spyEvents(el, 'input')
    const [changeEvents] = spyEvents(el, 'change')

    trackOf(el).dispatchEvent(pointer('pointerdown', 30, 10))
    await waitForUpdate(el)

    // 向左拖拽 3px（不足半程）。CI 慢环境渲染会跨毫秒，单次合成 move 的负向速度
    // 会被判 flick（<-300px/s）误翻转开关；用间隔 32ms 的多段 move 模拟真实慢拖。
    for (const x of [29, 28, 27]) {
      window.dispatchEvent(pointer('pointermove', x, 10))
      await new Promise(resolve => setTimeout(resolve, 32))
    }
    await waitForUpdate(el)

    window.dispatchEvent(pointer('pointerup', 27, 10))
    await waitForUpdate(el)

    expect(el.checked).toBe(true)
    expect(inputEvents).toHaveLength(0)
    expect(changeEvents).toHaveLength(0)
    cleanupElement(el)
  })

  it('flick 抛掷速度触发切换：位移不足半程但速度快时仍然翻转', async () => {
    const el = createSwitch()
    await waitForUpdate(el)

    const [inputEvents] = spyEvents(el, 'input')
    const [changeEvents] = spyEvents(el, 'change')

    trackOf(el).dispatchEvent(pointer('pointerdown', 10, 10))
    await waitForUpdate(el)

    // 快速移动产生高速采样点（间隔 > 8ms 以满足速度估算窗口）
    window.dispatchEvent(pointer('pointermove', 18, 10))
    await new Promise(r => setTimeout(r, 16))
    window.dispatchEvent(pointer('pointerup', 26, 10))
    await waitForUpdate(el)

    expect(el.checked).toBe(true)
    expect(inputEvents).toHaveLength(1)
    expect(changeEvents).toHaveLength(1)
    cleanupElement(el)
  })

  it('disabled 状态下禁止拖拽切换，也不派发事件', async () => {
    const el = createSwitch()
    el.disabled = true
    await waitForUpdate(el)

    const [inputEvents] = spyEvents(el, 'input')
    const [changeEvents] = spyEvents(el, 'change')

    trackOf(el).dispatchEvent(pointer('pointerdown', 10, 10))
    window.dispatchEvent(pointer('pointermove', 40, 10))
    window.dispatchEvent(pointer('pointerup', 40, 10))
    await waitForUpdate(el)

    expect(el.checked).toBe(false)
    expect(inputEvents).toHaveLength(0)
    expect(changeEvents).toHaveLength(0)
    cleanupElement(el)
  })
})
