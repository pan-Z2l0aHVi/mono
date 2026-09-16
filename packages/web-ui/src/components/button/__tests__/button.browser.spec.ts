import { afterEach, describe, expect, it } from 'vite-plus/test'

import { resetPointerFocusState } from '@/shared/focus/pointer-focus'

import '..'
import { mountElement, waitForUpdate } from '@/shared/test-utils'

import type { WebUiButton } from '..'

afterEach(() => {
  document.body.replaceChildren()
  resetPointerFocusState()
})

describe('WebUiButton 组件（浏览器）', () => {
  it('将规范化后的 type 传给真实原生按钮', async () => {
    const button = mountElement<WebUiButton>('web-ui-button', { attrs: { type: 'invalid' } })
    await waitForUpdate(button)

    const inner = button.shadowRoot?.querySelector<HTMLButtonElement>('button')
    expect(inner).toBeTruthy()
    expect(button.type).toBe('button')
    expect(inner?.type).toBe('button')

    button.type = 'reset'
    await waitForUpdate(button)
    expect(inner?.type).toBe('reset')
  })

  it('submit 和 reset 不影响 Shadow DOM 外的祖先表单', async () => {
    const form = document.createElement('form')
    const input = document.createElement('input')
    input.name = 'name'
    input.defaultValue = 'initial'
    input.value = 'changed'
    const submitButton = document.createElement('web-ui-button')
    submitButton.type = 'submit'
    const resetButton = document.createElement('web-ui-button')
    resetButton.type = 'reset'
    form.append(input, submitButton, resetButton)
    document.body.append(form)
    await Promise.all([waitForUpdate(submitButton), waitForUpdate(resetButton)])

    const submitEvents: SubmitEvent[] = []
    form.addEventListener('submit', event => {
      event.preventDefault()
      submitEvents.push(event)
    })

    const innerSubmit = submitButton.shadowRoot?.querySelector<HTMLButtonElement>('button')
    const innerReset = resetButton.shadowRoot?.querySelector<HTMLButtonElement>('button')
    expect(innerSubmit?.form).toBeNull()
    expect(innerReset?.form).toBeNull()

    innerSubmit?.click()
    innerReset?.click()

    expect(submitEvents).toHaveLength(0)
    expect(input.value).toBe('changed')
  })

  it('icon + loading 只渲染 spinner，且不可点击、不可聚焦', async () => {
    const btn = mountElement<WebUiButton>('web-ui-button', {
      attrs: { icon: '', size: '32', loading: '', 'aria-label': 'test' },
      html: '<web-ui-icon data-role="mine"></web-ui-icon>'
    })
    await waitForUpdate(btn)

    const inner = btn.shadowRoot?.querySelector<HTMLButtonElement>('button') as HTMLButtonElement
    // spinner 替换 icon 内容：shadow 内唯一的 web-ui-icon 是 spinner，默认 slot 不渲染
    expect(btn.shadowRoot!.querySelectorAll('web-ui-icon')).toHaveLength(1)
    expect(btn.shadowRoot!.querySelector('slot:not([name])')).toBeNull()

    // 不可点击 + 不可聚焦（原生 disabled 语义）
    expect(inner.disabled).toBe(true)
    inner.focus()
    expect(document.activeElement).not.toBe(inner)
  })

  it('指针点击后标记 pointer-focus，键盘导航恢复 focus-visible 状态', async () => {
    const btn = mountElement<WebUiButton>('web-ui-button')
    btn.textContent = 'Open'
    await waitForUpdate(btn)

    const inner = btn.shadowRoot?.querySelector('button') as HTMLButtonElement
    expect(inner).toBeTruthy()

    // 模拟点击打开浮层后的指针自动 focus：pointerdown 后聚焦内部按钮
    inner.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, composed: true, isPrimary: true, pointerId: 1 })
    )
    inner.focus()
    await waitForUpdate(btn)

    expect(btn.dataset.wuiPointerFocus).toBe('true')

    // Tab 键恢复键盘 focus ring：focusin 清除 pointer-focus 标记
    inner.blur()
    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }))
    inner.focus()
    await waitForUpdate(btn)

    expect(btn.hasAttribute('data-wui-pointer-focus')).toBe(false)
  })
})
