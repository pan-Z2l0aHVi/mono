import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiTextarea borderless（浏览器）', () => {
  it('borderless 移除 glass 描边环并在键盘聚焦时保留 focus ring', async () => {
    // 非 borderless 基线：glass ::before 生成描边盒，确保断言非空转
    const base = document.createElement('web-ui-textarea')
    document.body.append(base)
    await base.updateComplete
    const baseInner = base.shadowRoot!.querySelector<HTMLElement>('.wui-textarea-inner')!
    expect(getComputedStyle(baseInner, '::before').content).toBe('""')
    base.remove()

    const el = document.createElement('web-ui-textarea')
    el.setAttribute('borderless', '')
    document.body.append(el)
    await el.updateComplete

    const inner = el.shadowRoot!.querySelector<HTMLElement>('.wui-textarea-inner')!
    const style = getComputedStyle(inner)
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(style.boxShadow).toBe('none')
    expect(getComputedStyle(inner, '::before').content).toBe('none')
    // ghost 形态只剥表面装饰，保留 padding 与高度度量
    expect(style.paddingTop).toBe('7.5px')
    expect(style.paddingLeft).toBe('12px')
    expect(style.paddingRight).toBe('12px')

    await userEvent.keyboard('{Tab}')
    await el.updateComplete
    // focus ring 走 200ms box-shadow 过渡，等过渡完成后再断言终值
    await new Promise(resolve => setTimeout(resolve, 300))
    const focusedStyle = getComputedStyle(inner, '::after')
    expect(el.hasAttribute('focused')).toBe(true)
    expect(el.shadowRoot?.querySelector('textarea')?.matches(':focus-visible')).toBe(true)
    // 与 normal 变体同款：inset accent 内圈 + focus-ring halo 的 box-shadow
    expect(focusedStyle.boxShadow).toContain('inset')
    expect(focusedStyle.boxShadow).toContain('rgb(0, 136, 255)')
    expect(focusedStyle.boxShadow).toContain('0px 0px 0px 3px')
  })
})
