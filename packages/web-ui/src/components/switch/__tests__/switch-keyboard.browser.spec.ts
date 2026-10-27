import '@/components/switch'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'

import { cleanupElement, mountElement, spyEvents, waitForUpdate } from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

type TestSwitch = HTMLElement & { updateComplete: Promise<unknown>; checked: boolean; disabled: boolean }

const mount = (attrs: Record<string, string> = {}): TestSwitch => mountElement<TestSwitch>('web-ui-switch', { attrs })

const switchControl = (el: TestSwitch): TestSwitch => {
  expect(el.getAttribute('role'), '宿主应承载 switch 语义').toBe('switch')
  return el
}

describe('WebUiSwitch 键盘契约（浏览器）', () => {
  it('Tab 使焦点进入 switch 宿主', async () => {
    const el = mount()
    await waitForUpdate(el)

    await userEvent.keyboard('{Tab}')

    // 语义 role 与键盘焦点都直接落在 custom element 宿主上。
    expect(document.activeElement, 'Tab 应把焦点交给 switch').toBe(el)
    expect(el.shadowRoot!.activeElement, 'switch 不应再把焦点藏在 shadow DOM 内').toBeNull()
    cleanupElement(el)
  })

  it('空格键切换并派发一次 input 与 change', async () => {
    const el = mount()
    await waitForUpdate(el)
    switchControl(el).focus()

    const [inputEvents, detachInput] = spyEvents(el, 'input')
    const [changeEvents, detachChange] = spyEvents(el, 'change')

    await userEvent.keyboard(' ')
    await waitForUpdate(el)

    expect(el.checked).toBe(true)
    expect(inputEvents).toHaveLength(1)
    expect(changeEvents).toHaveLength(1)

    detachInput()
    detachChange()
    cleanupElement(el)
  })

  it('连续两次空格键切回初始状态', async () => {
    const el = mount()
    await waitForUpdate(el)
    switchControl(el).focus()

    const [inputEvents, detachInput] = spyEvents(el, 'input')

    await userEvent.keyboard(' ')
    await waitForUpdate(el)
    expect(el.checked).toBe(true)

    await userEvent.keyboard(' ')
    await waitForUpdate(el)
    expect(el.checked).toBe(false)
    expect(inputEvents).toHaveLength(2)

    detachInput()
    cleanupElement(el)
  })

  it('保留作者设置的 tabindex，包括切换禁用态之后', async () => {
    const el = mount({ tabindex: '-1' })
    await waitForUpdate(el)
    expect(el.tabIndex).toBe(-1)

    el.checked = true
    await waitForUpdate(el)
    expect(el.tabIndex).toBe(-1)

    el.disabled = true
    await waitForUpdate(el)
    expect(el.tabIndex).toBe(-1)

    el.disabled = false
    await waitForUpdate(el)
    expect(el.tabIndex).toBe(-1)

    cleanupElement(el)
  })

  it('按住 Space 时重复 keydown 不会重复切换', async () => {
    const el = mount()
    await waitForUpdate(el)
    el.focus()

    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    await waitForUpdate(el)
    expect(el.checked).toBe(true)

    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, repeat: true }))
    await waitForUpdate(el)
    expect(el.checked).toBe(true)

    cleanupElement(el)
  })

  it('disabled 时空格键不切换且不派发事件', async () => {
    const el = mount({ disabled: '' })
    await waitForUpdate(el)
    switchControl(el).focus()

    const [inputEvents, detachInput] = spyEvents(el, 'input')
    const [changeEvents, detachChange] = spyEvents(el, 'change')

    await userEvent.keyboard(' ')
    await waitForUpdate(el)

    expect(el.checked).toBe(false)
    expect(inputEvents).toHaveLength(0)
    expect(changeEvents).toHaveLength(0)

    detachInput()
    detachChange()
    cleanupElement(el)
  })

  it('Enter 也能切换并派发一次 input 与 change', async () => {
    const el = mount()
    await waitForUpdate(el)
    switchControl(el).focus()

    const [inputEvents, detachInput] = spyEvents(el, 'input')
    const [changeEvents, detachChange] = spyEvents(el, 'change')

    await userEvent.keyboard('{Enter}')
    await waitForUpdate(el)

    expect(el.checked).toBe(true)
    expect(el.getAttribute('aria-checked')).toBe('true')
    expect(inputEvents).toHaveLength(1)
    expect(changeEvents).toHaveLength(1)

    detachInput()
    detachChange()
    cleanupElement(el)
  })

  it('disabled 时 Enter 不切换', async () => {
    const el = mount({ disabled: '' })
    await waitForUpdate(el)
    switchControl(el).focus()

    await userEvent.keyboard('{Enter}')
    await waitForUpdate(el)

    expect(el.checked).toBe(false)
    cleanupElement(el)
  })

  it('light DOM 文本可见并作为 switch 的默认可访问名', async () => {
    const el = mount()
    el.textContent = 'Enable notifications'
    await waitForUpdate(el)

    expect(page.getByRole('switch', { name: 'Enable notifications' }).length).toBe(1)
    expect(el.innerText).toContain('Enable notifications')

    cleanupElement(el)
  })

  it('host aria-label 与 aria-labelledby 可以命名 switch', async () => {
    const labelled = mount({ 'aria-label': 'Notification setting' })
    await waitForUpdate(labelled)
    expect(page.getByRole('switch', { name: 'Notification setting' }).length).toBe(1)

    const label = document.createElement('span')
    label.id = 'external-switch-label'
    label.textContent = 'Email updates'
    document.body.append(label)
    const labelledBy = mount({ 'aria-labelledby': label.id })
    await waitForUpdate(labelledBy)
    expect(page.getByRole('switch', { name: 'Email updates' }).length).toBe(1)

    cleanupElement(labelled)
    cleanupElement(labelledBy)
    label.remove()
  })

  it('没有可见标签时不额外增加 track 与标签之间的宽度', async () => {
    const unnamed = mount()
    const named = mount({ 'aria-label': 'Alpha' })
    await Promise.all([waitForUpdate(unnamed), waitForUpdate(named)])

    // 契约是「没有可见标签时不额外占宽」：两档互等且确实有宽度，不钉当前像素值。
    await expect.poll(() => named.getBoundingClientRect().width).toBeGreaterThan(0)
    expect(unnamed.getBoundingClientRect().width).toBeCloseTo(named.getBoundingClientRect().width, 1)

    cleanupElement(unnamed)
    cleanupElement(named)
  })

  it('键盘焦点只显示轨道上的 focus ring', async () => {
    const el = mount()
    await waitForUpdate(el)

    await userEvent.keyboard('{Tab}')

    const track = el.shadowRoot!.querySelector('.wui-switch-track')!
    expect(document.activeElement).toBe(el)
    expect(getComputedStyle(el).outlineStyle).toBe('none')
    expect(getComputedStyle(track).outlineColor).not.toBe('rgba(0, 0, 0, 0)')

    cleanupElement(el)
  })

  it('disabled 时可见标签与轨道一起变淡', async () => {
    const el = mount({ disabled: '' })
    el.textContent = 'Disabled option'
    await waitForUpdate(el)

    const label = el.shadowRoot!.querySelector('.wui-switch-label')!
    // 判据是「变淡」这个方向，具体档位归视觉基线。
    expect(Number.parseFloat(getComputedStyle(label).opacity)).toBeLessThan(1)

    cleanupElement(el)
  })
})
