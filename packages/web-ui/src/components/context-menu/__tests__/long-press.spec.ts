import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import '@/components/dropdown-item'
import { cleanupElement, waitForUpdate } from '@/shared/test-utils'

import type { WebUiContextMenu } from '..'

const ITEMS = '<web-ui-dropdown-item>编辑</web-ui-dropdown-item>'

afterEach(() => {
  vi.useRealTimers()
  document.body.replaceChildren()
})

function createMenu(attrs: Record<string, string> = {}): WebUiContextMenu {
  const el = document.createElement('web-ui-context-menu')
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
  el.innerHTML = `<div id="press-area">${ITEMS}</div>`
  document.body.append(el)
  return el
}

function touchPointer(type: string, init: PointerEventInit = {}): PointerEvent {
  const event = new PointerEvent(type, { bubbles: true, cancelable: true, ...init })
  Object.defineProperty(event, 'pointerType', { value: 'touch' })
  return event
}

function press(el: WebUiContextMenu, type = 'pointerdown') {
  el.querySelector('#press-area')?.dispatchEvent(touchPointer(type, { clientX: 120, clientY: 80 }))
}

function contextMenuEvent(clientX = 300, clientY = 200): MouseEvent {
  return new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY })
}

function trackChanges(el: WebUiContextMenu): CustomEvent<{ open: boolean }>[] {
  const events: CustomEvent<{ open: boolean }>[] = []
  el.addEventListener('open-change', e => events.push(e as CustomEvent<{ open: boolean }>))
  return events
}

describe('context-menu 长按（jsdom 逻辑）', () => {
  it('未启用 long-press 时长按不开菜单', async () => {
    vi.useFakeTimers()
    const el = createMenu()
    await waitForUpdate(el)

    press(el)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)

    expect(el.isOpen).toBe(false)
    cleanupElement(el)
  })

  it('鼠标指针不触发长按', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)

    const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'pointerType', { value: 'mouse' })
    el.querySelector('#press-area')?.dispatchEvent(event)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)

    expect(el.isOpen).toBe(false)
    cleanupElement(el)
  })

  it('长按达到延迟后打开菜单', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)
    const events = trackChanges(el)

    press(el)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)

    expect(el.isOpen).toBe(true)
    expect(events.filter(event => event.detail.open)).toHaveLength(1)
    cleanupElement(el)
  })

  it('long-press-delay 可调', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '', 'long-press-delay': '1200' })
    await waitForUpdate(el)

    press(el)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)
    expect(el.isOpen).toBe(false)

    await vi.advanceTimersByTimeAsync(700)
    await waitForUpdate(el)
    expect(el.isOpen).toBe(true)
    cleanupElement(el)
  })

  it('long-press-delay 写错时回退到默认值，不退化成同帧开菜单', async () => {
    vi.useFakeTimers()
    // "abc" 经 Lit 的 Number converter 得到 NaN；Math.max(0, NaN) === NaN，
    // 而 setTimeout(fn, NaN) 会立刻触发 —— 那样长按在 pointerdown 同一帧就开菜单，
    // 绕过全部时长语义。所以断言「499ms 内不开、到 500ms 才开」，而不是只断言属性值。
    const el = createMenu({ 'long-press': '', 'long-press-delay': 'abc' })
    await waitForUpdate(el)

    expect(el.longPressDelay).toBe(500)

    press(el)
    await vi.advanceTimersByTimeAsync(499)
    await waitForUpdate(el)
    expect(el.isOpen).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    await waitForUpdate(el)
    expect(el.isOpen).toBe(true)
    cleanupElement(el)
  })

  it('long-press-delay 越界时钳到 [0, 5000]', async () => {
    vi.useFakeTimers()
    const tooLong = createMenu({ 'long-press': '', 'long-press-delay': '999999' })
    const negative = createMenu({ 'long-press': '', 'long-press-delay': '-50' })
    await Promise.all([waitForUpdate(tooLong), waitForUpdate(negative)])

    expect(tooLong.longPressDelay).toBe(5000)
    expect(negative.longPressDelay).toBe(0)

    // 下界 0 仍是被允许的值：抬手前就会开，不能被钳成默认 500。
    press(negative)
    await vi.advanceTimersByTimeAsync(0)
    await waitForUpdate(negative)
    expect(negative.isOpen).toBe(true)

    cleanupElement(tooLong)
    cleanupElement(negative)
  })

  it('位移超出阈值取消长按', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)

    press(el)
    el.querySelector('#press-area')?.dispatchEvent(touchPointer('pointermove', { clientX: 120 + 40, clientY: 80 }))
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)

    expect(el.isOpen).toBe(false)
    cleanupElement(el)
  })

  it('阈值内的位移不取消长按', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)

    press(el)
    el.querySelector('#press-area')?.dispatchEvent(touchPointer('pointermove', { clientX: 120 + 4, clientY: 80 + 3 }))
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)

    expect(el.isOpen).toBe(true)
    cleanupElement(el)
  })

  it('抬手早于延迟则取消', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)

    press(el)
    press(el, 'pointerup')
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)

    expect(el.isOpen).toBe(false)
    cleanupElement(el)
  })

  it('disabled 时长按不开菜单', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '', disabled: '' })
    await waitForUpdate(el)

    press(el)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)

    expect(el.isOpen).toBe(false)
    cleanupElement(el)
  })

  it('长按后浏览器补发的 contextmenu 被吞掉，不重复派发', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)
    const events = trackChanges(el)

    press(el)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)
    expect(events.filter(event => event.detail.open)).toHaveLength(1)

    // 浏览器在长按后补发原生 contextmenu：应被吞掉，既不重开也不派发。
    const suppressed = contextMenuEvent()
    el.dispatchEvent(suppressed)
    await waitForUpdate(el)

    expect(suppressed.defaultPrevented).toBe(true)
    expect(events.filter(event => event.detail.open)).toHaveLength(1)
    cleanupElement(el)
  })

  it('抑制标志不吞掉后续的真实右键', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)

    press(el)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)
    // 菜单已由长按打开：补发的 contextmenu 被吞。
    el.dispatchEvent(contextMenuEvent())
    await waitForUpdate(el)

    // 关闭后标志必须已清空，否则这一次真实右键会被吞掉。
    el.close()
    await waitForUpdate(el)
    expect(el.isOpen).toBe(false)

    const genuine = contextMenuEvent()
    el.dispatchEvent(genuine)
    await waitForUpdate(el)

    expect(genuine.defaultPrevented).toBe(true)
    expect(el.isOpen).toBe(true)
    cleanupElement(el)
  })

  it('抬手后浏览器合成的 click 不会把刚打开的菜单关掉', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)

    press(el)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)
    expect(el.isOpen).toBe(true)

    // 真实触控管线里 touchend 之后引擎补发的 click：它属于长按那一次意图。
    el.querySelector('#press-area')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await waitForUpdate(el)

    expect(el.isOpen).toBe(true)
    cleanupElement(el)
  })

  it('吸收窗口过期后，真实点击照常 light-dismiss', async () => {
    vi.useFakeTimers()
    const el = createMenu({ 'long-press': '' })
    await waitForUpdate(el)

    press(el)
    await vi.advanceTimersByTimeAsync(600)
    await waitForUpdate(el)
    expect(el.isOpen).toBe(true)

    el.close()
    await waitForUpdate(el)
    expect(el.isOpen).toBe(false)

    // 走过吸收窗口与 outside-click guard 的解除（guard 用的是零延迟 setTimeout）。
    await vi.advanceTimersByTimeAsync(1200)
    el.openAt(100, 100)
    await vi.advanceTimersByTimeAsync(0)
    await waitForUpdate(el)
    expect(el.isOpen).toBe(true)

    // 窗口已过期：这次真实点击必须照常 light-dismiss。
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await waitForUpdate(el)
    expect(el.isOpen).toBe(false)
    cleanupElement(el)
  })
})
