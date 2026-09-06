import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import '..'
import '../../theme'

afterEach(() => document.body.replaceChildren())

describe('Web UI focus indicators（浏览器）', () => {
  it('键盘聚焦 button 使用统一 focus ring', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    const button = document.createElement('web-ui-button')
    button.textContent = 'Save'
    theme.append(button)
    document.body.append(theme)
    await theme.updateComplete
    await button.updateComplete

    await userEvent.keyboard('{Tab}')

    const inner = button.shadowRoot?.querySelector('button')
    expect(document.activeElement).toBe(button)
    const style = getComputedStyle(inner!)
    const focusRingWidth = getComputedStyle(inner!).getPropertyValue('--wui-focus-ring-width').trim()
    expect(style.outlineStyle).toBe('solid')
    expect(style.outlineWidth).toBe(focusRingWidth)
  })

  it('输入框 focus 使用 accent 内圈和 focus-ring halo', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    const input = document.createElement('web-ui-input')
    theme.append(input)
    document.body.append(theme)
    await theme.updateComplete
    await input.updateComplete

    const nativeInput = input.shadowRoot?.querySelector<HTMLInputElement>('input')
    nativeInput?.focus()
    await input.updateComplete

    const wrapper = input.shadowRoot?.querySelector<HTMLElement>('.wui-input-inner')
    const style = getComputedStyle(wrapper!)
    expect(input.hasAttribute('focused')).toBe(true)
    expect(style.boxShadow).toContain('inset')
    expect(style.boxShadow).toContain('rgb(0, 136, 255)')
    // computed style 会把 var() 解析为实际值，因此断言 halo 扩展值等于 --wui-focus-ring-width token
    const focusRingWidth = getComputedStyle(wrapper!).getPropertyValue('--wui-focus-ring-width').trim()
    expect(style.boxShadow).toContain(`0px 0px 0px ${focusRingWidth}`)
  })

  it('borderless 输入框隐藏玻璃描边，并在键盘聚焦时保留 focus 指示器', async () => {
    const input = document.createElement('web-ui-input')
    input.setAttribute('borderless', '')
    document.body.append(input)
    await input.updateComplete

    const wrapper = input.shadowRoot?.querySelector<HTMLElement>('.wui-input-inner')
    expect(getComputedStyle(wrapper!, '::before').content).toBe('none')

    const nativeInput = input.shadowRoot?.querySelector<HTMLInputElement>('input')
    await userEvent.keyboard('{Tab}')
    await input.updateComplete

    const style = getComputedStyle(wrapper!)
    expect(nativeInput?.matches(':focus-visible')).toBe(true)
    expect(input.hasAttribute('focused')).toBe(true)
    expect(style.outlineStyle).toBe('solid')
    expect(Number.parseFloat(style.outlineWidth)).toBeGreaterThan(0)
  })

  it('borderless 输入框移除 glass 描边环（.wui-glass::before）', async () => {
    // 非 borderless 基线：glass ::before 生成描边盒，确保断言非空转
    const base = document.createElement('web-ui-input')
    document.body.append(base)
    await base.updateComplete
    const baseInner = base.shadowRoot?.querySelector<HTMLElement>('.wui-input-inner')
    expect(getComputedStyle(baseInner!, '::before').content).toBe('""')

    const input = document.createElement('web-ui-input')
    input.setAttribute('borderless', '')
    document.body.append(input)
    await input.updateComplete

    const inner = input.shadowRoot?.querySelector<HTMLElement>('.wui-input-inner')
    expect(getComputedStyle(inner!, '::before').content).toBe('none')
  })
})
