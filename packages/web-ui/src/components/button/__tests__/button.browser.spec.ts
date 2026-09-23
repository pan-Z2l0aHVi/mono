import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { resetPointerFocusState } from '@/shared/focus/pointer-focus'

import '..'
import { flush, mountElement, waitForUpdate } from '@/shared/test-utils'

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

  it('submit 和 reset 通过宿主 form owner 驱动 Shadow DOM 外的祖先表单', async () => {
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
    let resetEvents = 0
    form.addEventListener('submit', event => {
      event.preventDefault()
      submitEvents.push(event)
    })
    form.addEventListener('reset', () => {
      resetEvents += 1
    })

    const innerSubmit = submitButton.shadowRoot?.querySelector<HTMLButtonElement>('button')
    const innerReset = resetButton.shadowRoot?.querySelector<HTMLButtonElement>('button')
    expect(innerSubmit?.form).toBeNull()
    expect(innerReset?.form).toBeNull()

    innerSubmit?.click()
    await flush()
    expect(submitEvents).toHaveLength(1)
    expect(submitEvents[0]?.submitter).toBeNull()
    expect([...new FormData(form).keys()]).toEqual(['name'])
    expect(input.value).toBe('changed')

    innerReset?.click()
    await flush()
    expect(resetEvents).toBe(1)
    expect(input.value).toBe('initial')
  })

  it('原生输入框按 Enter 恰好通过 type=submit 宿主触发一次隐式提交', async () => {
    const form = document.createElement('form')
    const input = document.createElement('input')
    input.name = 'name'
    const submitButton = document.createElement('web-ui-button')
    submitButton.type = 'submit'
    form.append(input, submitButton)
    document.body.append(form)
    await waitForUpdate(submitButton)

    let submitEvents = 0
    form.addEventListener('submit', event => {
      event.preventDefault()
      submitEvents += 1
    })

    input.focus()
    expect(document.activeElement).toBe(input)
    await userEvent.keyboard('{Enter}')
    await flush()

    expect(submitEvents).toBe(1)
  })

  it('type=submit/reset 没有 form owner 时不产生表单动作', async () => {
    const surface = document.createElement('div')
    const submitButton = document.createElement('web-ui-button')
    submitButton.type = 'submit'
    const resetButton = document.createElement('web-ui-button')
    resetButton.type = 'reset'
    surface.append(submitButton, resetButton)
    document.body.append(surface)
    await Promise.all([waitForUpdate(submitButton), waitForUpdate(resetButton)])

    const innerSubmit = submitButton.shadowRoot?.querySelector<HTMLButtonElement>('button')
    const innerReset = resetButton.shadowRoot?.querySelector<HTMLButtonElement>('button')
    expect(innerSubmit?.form).toBeNull()
    expect(innerReset?.form).toBeNull()

    let submitEvents = 0
    let resetEvents = 0
    surface.addEventListener('submit', event => {
      event.preventDefault()
      submitEvents += 1
    })
    surface.addEventListener('reset', () => {
      resetEvents += 1
    })

    innerSubmit?.click()
    innerReset?.click()
    await flush()

    expect(submitEvents).toBe(0)
    expect(resetEvents).toBe(0)
  })

  it('宿主 click 被 preventDefault 时取消转发的 submit', async () => {
    const form = document.createElement('form')
    const submitButton = document.createElement('web-ui-button')
    submitButton.type = 'submit'
    form.append(submitButton)
    document.body.append(form)
    await waitForUpdate(submitButton)

    let submitEvents = 0
    form.addEventListener('submit', event => {
      event.preventDefault()
      submitEvents += 1
    })
    submitButton.addEventListener('click', event => event.preventDefault())

    submitButton.shadowRoot?.querySelector<HTMLButtonElement>('button')?.click()
    await flush()

    expect(submitEvents).toBe(0)
  })

  it('宿主 click 被 preventDefault 时取消转发的 reset', async () => {
    const form = document.createElement('form')
    const input = document.createElement('input')
    input.name = 'name'
    input.defaultValue = 'initial'
    input.value = 'changed'
    const resetButton = document.createElement('web-ui-button')
    resetButton.type = 'reset'
    form.append(input, resetButton)
    document.body.append(form)
    await waitForUpdate(resetButton)

    let resetEvents = 0
    form.addEventListener('reset', () => {
      resetEvents += 1
    })
    resetButton.addEventListener('click', event => event.preventDefault())

    resetButton.shadowRoot?.querySelector<HTMLButtonElement>('button')?.click()
    await flush()

    expect(resetEvents).toBe(0)
    expect(input.value).toBe('changed')
  })

  it('祖先 fieldset 禁用时不转发 submit，重新启用后恢复', async () => {
    const form = document.createElement('form')
    const fieldset = document.createElement('fieldset')
    fieldset.disabled = true
    const submitButton = document.createElement('web-ui-button')
    submitButton.type = 'submit'
    fieldset.append(submitButton)
    form.append(fieldset)
    document.body.append(form)
    await waitForUpdate(submitButton)

    let submitEvents = 0
    form.addEventListener('submit', event => {
      event.preventDefault()
      submitEvents += 1
    })

    const inner = submitButton.shadowRoot?.querySelector<HTMLButtonElement>('button')
    expect(submitButton.hasAttribute('disabled')).toBe(false)
    expect(inner?.disabled).toBe(true)
    inner?.click()
    await flush()
    expect(submitEvents).toBe(0)

    fieldset.disabled = false
    await waitForUpdate(submitButton)
    expect(inner?.disabled).toBe(false)
    inner?.click()
    await flush()
    expect(submitEvents).toBe(1)
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
