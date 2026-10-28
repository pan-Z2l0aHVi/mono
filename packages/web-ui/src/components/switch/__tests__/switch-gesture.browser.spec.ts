import '..'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { cleanupElement, mountElement, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiSwitch } from '..'

afterEach(() => document.body.replaceChildren())

/**
 * 拖拽手势契约：手势的**结果**（checked 状态与 input / change 派发）是公开可观察面。
 * 内部态 class（is-dragging / is-open / is-pressed）、光标与 touch-action 属实现细节，
 * 按 ADR-0005 §5 不在契约 spec 断言；指针交互的视觉反馈归真机验收。
 */
const createSwitch = (): WebUiSwitch => mountElement<WebUiSwitch>('web-ui-switch')

/** 返回承载指针手势的轨道；可访问角色由 switch host 承载。 */
const trackOf = (el: WebUiSwitch): HTMLElement => {
  const node = el.shadowRoot?.querySelector<HTMLElement>('.wui-switch-track')
  expect(node, '未找到 switch 轨道').toBeTruthy()
  return node as HTMLElement
}

const pointer = (type: string, x: number, y: number): PointerEvent =>
  new PointerEvent(type, { bubbles: true, isPrimary: true, pointerId: 1, clientX: x, clientY: y })

/**
 * 拖拽判定读 `PointerEvent.timeStamp`，速度 = 采样位移 / 采样时间差。合成事件的默认
 * 时间戳是墙钟，用 `setTimeout` 拉开间隔会随负载漂移（间隔失控时慢拖被判成 flick）；
 * 这里直接钉时间戳，让速度成为用例的输入。
 */
const at = (event: PointerEvent, timeStamp: number): PointerEvent => {
  Object.defineProperty(event, 'timeStamp', { value: timeStamp })
  return event
}

describe('WebUiSwitch 手势拖拽（浏览器）', () => {
  it('拖拽超过 50% 行程松手：切换状态并触发 input 与 change 事件', async () => {
    const el = createSwitch()
    await waitForUpdate(el)

    const [inputEvents] = spyEvents(el, 'input')
    const [changeEvents] = spyEvents(el, 'change')

    trackOf(el).dispatchEvent(pointer('pointerdown', 10, 10))
    await waitForUpdate(el)

    // 轨道 40px、行程 16px：拖 10px 明确越过半程（8px）。
    window.dispatchEvent(pointer('pointermove', 20, 10))
    await waitForUpdate(el)

    window.dispatchEvent(pointer('pointerup', 20, 10))
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

    trackOf(el).dispatchEvent(at(pointer('pointerdown', 30, 10), 1000))
    await waitForUpdate(el)

    // 向左拖拽 3px（不足半程）。采样间隔 32ms 时速度约 -31px/s，不会被判成 flick
    // （<-300px/s）；间隔被压到几毫秒的话同一段位移会被判成快速负向轻扫。
    for (const [x, timeStamp] of [
      [29, 1032],
      [28, 1064],
      [27, 1096]
    ] as const) {
      window.dispatchEvent(at(pointer('pointermove', x, 10), timeStamp))
    }
    await waitForUpdate(el)

    window.dispatchEvent(at(pointer('pointerup', 27, 10), 1096))
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

    trackOf(el).dispatchEvent(at(pointer('pointerdown', 10, 10), 1000))
    await waitForUpdate(el)

    // 只走 7px（行程 16px，进度 0.4375 < 0.5）：距离分支会判「不切换」，
    // 速度 =(17 - 10) / 20ms = 350px/s > 300，命中 flick 分支才翻转。
    window.dispatchEvent(at(pointer('pointermove', 17, 10), 1010))
    window.dispatchEvent(at(pointer('pointerup', 17, 10), 1020))
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
