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

  it('borderless 输入框隐藏玻璃描边、保留 padding 并在键盘聚焦时保留 focus ring', async () => {
    const input = document.createElement('web-ui-input')
    input.setAttribute('borderless', '')
    document.body.append(input)
    await input.updateComplete

    const wrapper = input.shadowRoot?.querySelector<HTMLElement>('.wui-input-inner')
    expect(getComputedStyle(wrapper!, '::before').content).toBe('none')
    // ghost 形态只剥表面装饰，保留 padding 与高度度量
    const baseStyle = getComputedStyle(wrapper!)
    expect(baseStyle.paddingLeft).toBe('12px')
    expect(baseStyle.paddingRight).toBe('12px')

    const nativeInput = input.shadowRoot?.querySelector<HTMLInputElement>('input')
    await userEvent.keyboard('{Tab}')
    await input.updateComplete
    // focus ring 走 200ms box-shadow 过渡，等过渡完成后再断言终值
    await new Promise(resolve => setTimeout(resolve, 300))

    // 与 normal 变体同款：inset accent 内圈 + focus-ring halo 的 box-shadow
    const style = getComputedStyle(wrapper!)
    expect(nativeInput?.matches(':focus-visible')).toBe(true)
    expect(input.hasAttribute('focused')).toBe(true)
    expect(style.boxShadow).toContain('inset')
    expect(style.boxShadow).toContain('rgb(0, 136, 255)')
    expect(style.boxShadow).toContain(`0px 0px 0px 3px`)
  })

  it('borderless 输入框鼠标/程序化聚焦同样显示 focus ring（不 gate 在 :focus-visible）', async () => {
    const input = document.createElement('web-ui-input')
    input.setAttribute('borderless', '')
    document.body.append(input)
    await input.updateComplete

    // 无键盘路径的程序化聚焦：ring 由 focused 属性驱动，与 normal 变体一致
    const nativeInput = input.shadowRoot?.querySelector<HTMLInputElement>('input')
    nativeInput?.focus()
    await input.updateComplete
    // focus ring 走 200ms box-shadow 过渡，等过渡完成后再断言终值
    await new Promise(resolve => setTimeout(resolve, 300))

    const wrapper = input.shadowRoot?.querySelector<HTMLElement>('.wui-input-inner')
    const style = getComputedStyle(wrapper!)
    expect(input.hasAttribute('focused')).toBe(true)
    expect(style.boxShadow).toContain('inset')
    expect(style.boxShadow).toContain('rgb(0, 136, 255)')
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
