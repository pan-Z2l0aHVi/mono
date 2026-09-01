import { afterEach, describe, expect, it } from 'vite-plus/test'

import { lucidePlus } from '@/icons'

import '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiButton 组件（浏览器）', () => {
  it('glass 按钮使用不占布局的 glass border ring', async () => {
    const btn = document.createElement('web-ui-button')
    btn.variant = 'glass'
    btn.textContent = 'OK'
    document.body.append(btn)
    await btn.updateComplete

    const inner = btn.shadowRoot?.querySelector('button') as HTMLElement
    const boxShadow = getComputedStyle(inner).boxShadow
    expect(boxShadow).toContain('0px 0px 0px 1px inset')
    expect(boxShadow).toContain('51, 51, 51')
  })

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

describe('Icon button 尺寸行为', () => {
  it('无 size 时 padding 为零，按钮包裹 icon 内容', async () => {
    const btn = document.createElement('web-ui-button')
    btn.setAttribute('icon', '')
    btn.setAttribute('aria-label', 'test')
    const icon = document.createElement('web-ui-icon')
    icon.icon = lucidePlus
    btn.append(icon)
    document.body.append(btn)
    await btn.updateComplete

    const inner = btn.shadowRoot?.querySelector('button') as HTMLElement
    const cs = window.getComputedStyle(inner)
    expect(cs.paddingTop).toBe('0px')
    expect(cs.paddingBottom).toBe('0px')
    expect(cs.height).toBe('40px')
    // 按钮宽度应由 icon 内容撑开
    expect(parseFloat(cs.width)).toBeGreaterThan(0)
  })

  it('有 size 时按钮高度和最小宽度均为 size，保持正方形', async () => {
    const btn = document.createElement('web-ui-button')
    btn.setAttribute('icon', '')
    btn.setAttribute('size', '32')
    btn.setAttribute('aria-label', 'test')
    document.body.append(btn)
    await btn.updateComplete

    const inner = btn.shadowRoot?.querySelector('button') as HTMLElement
    const rect = inner.getBoundingClientRect()
    expect(rect.height).toBe(32)
    expect(rect.width).toBe(32)
  })

  it('full + icon 时按钮撑满容器宽度', async () => {
    const btn = document.createElement('web-ui-button')
    btn.setAttribute('icon', '')
    btn.setAttribute('full', '')
    btn.setAttribute('size', '32')
    btn.setAttribute('aria-label', 'test')
    document.body.append(btn)
    await btn.updateComplete

    const inner = btn.shadowRoot?.querySelector('button') as HTMLElement
    const rect = inner.getBoundingClientRect()
    expect(rect.width).toBe(btn.parentElement?.clientWidth ?? 0)
    expect(rect.height).toBe(32)
  })

  it('icon + 显式宽度时变为胶囊形', async () => {
    const btn = document.createElement('web-ui-button')
    btn.setAttribute('icon', '')
    btn.setAttribute('size', '32')
    btn.style.setProperty('--wui-button-width', '120px')
    btn.setAttribute('aria-label', 'test')
    document.body.append(btn)
    await btn.updateComplete

    const inner = btn.shadowRoot?.querySelector('button') as HTMLElement
    const rect = inner.getBoundingClientRect()
    expect(rect.height).toBe(32)
    expect(rect.width).toBe(120)
  })
})

it('非 icon 模式下 size 仅控制高度，宽度由内容决定', async () => {
  const btn = document.createElement('web-ui-button')
  btn.setAttribute('size', '32')
  btn.textContent = 'OK'
  document.body.append(btn)
  await btn.updateComplete

  const inner = btn.shadowRoot?.querySelector('button') as HTMLElement
  const rect = inner.getBoundingClientRect()
  expect(rect.height).toBe(32)
  // 宽度由文本内容撑开，大于高度
  expect(rect.width).toBeGreaterThan(rect.height)
})
