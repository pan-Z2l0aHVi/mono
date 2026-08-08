import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiButton 组件（浏览器）', () => {
  it('将规范化后的 type 传给真实原生按钮', async () => {
    const button = document.createElement('web-ui-button')
    button.setAttribute('type', 'invalid')
    document.body.append(button)
    await button.updateComplete

    const inner = button.shadowRoot?.querySelector<HTMLButtonElement>('button')
    expect(inner).toBeTruthy()
    expect(button.type).toBe('button')
    expect(inner?.type).toBe('button')

    button.type = 'reset'
    await button.updateComplete
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
    await Promise.all([submitButton.updateComplete, resetButton.updateComplete])

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
})
