import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import '@/components/switch'
import { cleanupElement, mountElement, queryA11y, spyEvents, waitForUpdate } from '@/shared/test-utils'

afterEach(() => document.body.replaceChildren())

type TestSwitch = HTMLElement & { updateComplete: Promise<unknown>; checked: boolean }

const mount = (attrs: Record<string, string> = {}): TestSwitch => mountElement<TestSwitch>('web-ui-switch', { attrs })

/**
 * switch 自身不处理 keydown：键盘可达性由 label 内那个视觉隐藏（`sr-only`，clip-path 而非
 * display:none）的原生 `input[type=checkbox]` 提供——焦点落在它上面后按空格触发浏览器原生
 * 激活 → `click` 冒泡到 label → 组件切换状态。
 *
 * 该路径是真实的公开无障碍契约（见 `switch/style.css` 的 sr-only 注释），但**只能在真实
 * 浏览器里验证**：jsdom 不合成原生激活行为，合成 keydown 也不会命中任何处理器。
 */
const keyboardEntry = (el: TestSwitch): HTMLInputElement => {
  const input = queryA11y(el, 'input[type="checkbox"]')
  expect(input, 'switch 应提供原生 checkbox 作为键盘入口').toBeTruthy()
  return input as HTMLInputElement
}

describe('WebUiSwitch 键盘契约（浏览器）', () => {
  it('Tab 使焦点进入 switch 的原生键盘入口', async () => {
    const el = mount()
    await waitForUpdate(el)

    await userEvent.keyboard('{Tab}')

    // 焦点在 shadow 内，文档层重定位到宿主。
    expect(document.activeElement, 'Tab 应把焦点交给 switch').toBe(el)
    expect(el.shadowRoot!.activeElement, '组件内焦点应落在原生 checkbox 上').toBe(keyboardEntry(el))
    cleanupElement(el)
  })

  it('空格键切换并派发一次 input 与 change', async () => {
    const el = mount()
    await waitForUpdate(el)
    keyboardEntry(el).focus()

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
    keyboardEntry(el).focus()

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

  it('disabled 时空格键不切换且不派发事件', async () => {
    const el = mount({ disabled: '' })
    await waitForUpdate(el)
    keyboardEntry(el).focus()

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
})
