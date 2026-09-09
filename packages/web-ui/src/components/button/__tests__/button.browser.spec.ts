import { afterEach, describe, expect, it } from 'vite-plus/test'

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
    const before = getComputedStyle(inner, '::before')
    expect(before.content).toBe('""')
    expect(before.background).toContain('radial-gradient')
    expect(before.background).toContain('0, 0, 0, 0.06')
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

describe('Icon button 行为', () => {
  it('有 size 时保持正方形比例', async () => {
    const btn = document.createElement('web-ui-button')
    btn.setAttribute('icon', '')
    btn.setAttribute('size', '32')
    btn.setAttribute('aria-label', 'test')
    document.body.append(btn)
    await btn.updateComplete

    const inner = btn.shadowRoot?.querySelector('button') as HTMLElement
    const rect = inner.getBoundingClientRect()
    expect(rect.width).toBe(rect.height)
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
    expect(rect.height).toBeGreaterThan(0)
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
    expect(rect.width).toBeGreaterThan(rect.height)
  })

  it('icon + loading 只渲染 spinner，保持正方形且不可交互', async () => {
    const btn = document.createElement('web-ui-button')
    btn.setAttribute('icon', '')
    btn.setAttribute('size', '32')
    btn.setAttribute('loading', '')
    btn.setAttribute('aria-label', 'test')
    btn.innerHTML = '<web-ui-icon data-role="mine"></web-ui-icon>'
    document.body.append(btn)
    await btn.updateComplete

    const inner = btn.shadowRoot?.querySelector<HTMLButtonElement>('button') as HTMLButtonElement
    // spinner 替换 icon 内容：shadow 内唯一的 web-ui-icon 是 spinner，默认 slot 不渲染
    expect(btn.shadowRoot!.querySelectorAll('web-ui-icon')).toHaveLength(1)
    expect(btn.shadowRoot!.querySelector('slot:not([name])')).toBeNull()

    // 组合尺寸保持正方形，与 icon-only 一致
    const rect = inner.getBoundingClientRect()
    expect(rect.width).toBe(rect.height)

    // 不可点击 + 不可聚焦（原生 disabled 语义）
    expect(inner.disabled).toBe(true)
    inner.focus()
    expect(document.activeElement).not.toBe(inner)
  })
})

it('非 icon 模式下宽度由内容决定', async () => {
  const btn = document.createElement('web-ui-button')
  btn.setAttribute('size', '32')
  btn.textContent = 'OK'
  document.body.append(btn)
  await btn.updateComplete

  const inner = btn.shadowRoot?.querySelector('button') as HTMLElement
  const rect = inner.getBoundingClientRect()
  // 宽度由文本内容撑开，大于高度
  expect(rect.width).toBeGreaterThan(rect.height)
})

it('hover/active 背景反馈即时切换，不做过渡动画', async () => {
  const btn = document.createElement('web-ui-button')
  btn.textContent = 'OK'
  document.body.append(btn)
  await btn.updateComplete

  const inner = btn.shadowRoot?.querySelector('button') as HTMLElement
  expect(getComputedStyle(inner).transitionProperty).not.toContain('background-color')
  // 拦截 transition: all 160ms 之类的回归写法：无过渡时 computed duration 必须为 0s
  expect(getComputedStyle(inner).transitionDuration).toBe('0s')
})
