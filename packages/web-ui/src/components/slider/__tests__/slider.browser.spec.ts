import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { cleanupElement, pollUntil, queryA11y } from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

/**
 * 指针拖拽契约：以公开 `value` 与 `input` / `change` 派发观察手势结果。
 * 内部态 class（is-pressed / is-dragging / is-open）、`cursor`、`touch-action` 与
 * thumb 的玻璃质感（backdrop-filter / 背景色 / box-shadow）属实现与视觉细节，
 * 按 ADR-0005 §5 不在契约 spec 断言，归真机验收。
 *
 * `touch-action: none` 的**行为后果**（拖拽期间阻止页面滚动）仍在此断言——
 * 它是可观察的交互契约，而非样式值。
 */
function createSlider(): HTMLElement {
  const el = document.createElement('web-ui-slider')
  document.body.append(el)
  return el
}

type Updatable = HTMLElement & { updateComplete: Promise<unknown>; value: number; disabled: boolean }

const trackOf = (el: HTMLElement): HTMLElement => {
  const node = queryA11y(el, '[role="slider"]')
  expect(node, '未找到 role="slider" 的可交互元素').toBeTruthy()
  return node as HTMLElement
}

const pointer = (type: string, x: number, y: number): PointerEvent =>
  new PointerEvent(type, { bubbles: true, pointerId: 1, clientX: x, clientY: y })

describe('WebUiSlider 指针拖拽（浏览器）', () => {
  it('真实指针拖拽更新 value 并在松手时派发一次 change', async () => {
    const el = createSlider() as Updatable
    await el.updateComplete

    const track = trackOf(el)
    const rect = track.getBoundingClientRect()
    const y = rect.top + rect.height / 2

    const inputEvents: Event[] = []
    const changeEvents: Event[] = []
    el.addEventListener('input', e => inputEvents.push(e))
    el.addEventListener('change', e => changeEvents.push(e))

    track.dispatchEvent(pointer('pointerdown', rect.left + rect.width * 0.25, y))
    await el.updateComplete
    const afterDown = el.value

    track.dispatchEvent(pointer('pointermove', rect.left + rect.width * 0.75, y))
    await pollUntil(() => el.value > 50, '拖拽到 75% 后 value 未越过中点')

    track.dispatchEvent(pointer('pointerup', rect.left + rect.width * 0.75, y))
    await el.updateComplete

    expect(afterDown).toBeLessThan(50)
    expect(el.value).toBeGreaterThan(50)
    expect(inputEvents.length).toBeGreaterThan(0)
    // 拖拽结束时 value 已变化，恰好派发一次 change
    expect(changeEvents).toHaveLength(1)
    cleanupElement(el)
  })

  it('pointerup 后继续移动不再更新 value', async () => {
    const el = createSlider() as Updatable
    await el.updateComplete

    const track = trackOf(el)
    const rect = track.getBoundingClientRect()
    const y = rect.top + rect.height / 2

    track.dispatchEvent(pointer('pointerdown', rect.left + rect.width * 0.5, y))
    await el.updateComplete
    const valueAtDown = el.value

    track.dispatchEvent(pointer('pointerup', rect.left + rect.width * 0.5, y))
    await el.updateComplete

    track.dispatchEvent(pointer('pointermove', rect.left + rect.width * 0.9, y))
    await el.updateComplete

    expect(el.value).toBe(valueAtDown)
    cleanupElement(el)
  })

  it('指针交互后仍可用方向键调整 value', async () => {
    const el = createSlider() as Updatable
    await el.updateComplete

    const track = trackOf(el)
    const rect = track.getBoundingClientRect()

    track.dispatchEvent(pointer('pointerdown', rect.left + rect.width * 0.5, rect.top + rect.height / 2))
    track.dispatchEvent(pointer('pointerup', rect.left + rect.width * 0.5, rect.top + rect.height / 2))
    await el.updateComplete
    expect(el.value).toBe(50)

    track.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await el.updateComplete

    expect(el.value).toBe(51)
    cleanupElement(el)
  })

  it('拖拽期间阻止 touchmove 默认滚动，松手后解除', async () => {
    const el = createSlider() as Updatable
    await el.updateComplete

    const track = trackOf(el)
    const rect = track.getBoundingClientRect()
    const y = rect.top + rect.height / 2

    track.dispatchEvent(pointer('pointerdown', rect.left + rect.width * 0.25, y))
    await el.updateComplete

    // 意图判定前：shadow 内非 composed 的 touchmove 也已被守卫阻止，
    // 这是 iOS Safari 滚动接管前需要的关键兜底。
    const onTrack = new TouchEvent('touchmove', { bubbles: true, composed: false, cancelable: true })
    track.dispatchEvent(onTrack)
    expect(onTrack.defaultPrevented).toBe(true)

    // 确认拖拽后：守卫持续有效。
    window.dispatchEvent(pointer('pointermove', rect.left + rect.width * 0.75, y))
    await el.updateComplete

    const onTrackAfterCommit = new TouchEvent('touchmove', { bubbles: true, composed: false, cancelable: true })
    track.dispatchEvent(onTrackAfterCommit)
    expect(onTrackAfterCommit.defaultPrevented).toBe(true)

    // shadow 外的 touchmove 不受影响，说明守卫没有挂成全局死代码。
    const onWindow = new TouchEvent('touchmove', { bubbles: true, cancelable: true })
    window.dispatchEvent(onWindow)
    expect(onWindow.defaultPrevented).toBe(false)

    // 松手后守卫卸载，页面滚动恢复。
    window.dispatchEvent(pointer('pointerup', rect.left + rect.width * 0.75, y))
    await el.updateComplete

    const onTrackAfterRelease = new TouchEvent('touchmove', { bubbles: true, composed: false, cancelable: true })
    track.dispatchEvent(onTrackAfterRelease)
    expect(onTrackAfterRelease.defaultPrevented).toBe(false)
    cleanupElement(el)
  })

  it('捕获转手：子节点丢失捕获不取消拖拽，track 自身丢失才取消', async () => {
    const el = createSlider() as Updatable
    await el.updateComplete

    const track = trackOf(el)
    // track 的子树节点（结构关系定位，非内部 class）：模拟指针命中到的深层元素
    const hitChild = track.firstElementChild as HTMLElement
    expect(hitChild, 'track 应有可命中的子节点').toBeTruthy()

    const rect = track.getBoundingClientRect()
    const y = rect.top + rect.height / 2

    track.dispatchEvent(pointer('pointerdown', rect.left + rect.width * 0.25, y))
    await el.updateComplete

    // 越过意图阈值：组件把指针捕获转手到 track
    window.dispatchEvent(pointer('pointermove', rect.left + rect.width * 0.25 + 10, y))
    await el.updateComplete

    // 命中元素收到 lostpointercapture（隐式捕获被 track 抢走）——必须忽略
    hitChild.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, composed: true, pointerId: 1 }))
    await el.updateComplete

    // 拖拽继续跟手
    window.dispatchEvent(pointer('pointermove', rect.left + rect.width * 0.75, y))
    await el.updateComplete
    expect(el.value).toBeGreaterThan(50)

    // track 自身意外丢失捕获：取消拖拽
    track.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, composed: true, pointerId: 1 }))
    await el.updateComplete

    // 取消后 value 不再跟随指针
    const afterCancel = el.value
    window.dispatchEvent(pointer('pointermove', rect.left + rect.width * 0.2, y))
    await el.updateComplete
    expect(el.value).toBe(afterCancel)
    cleanupElement(el)
  })
})
