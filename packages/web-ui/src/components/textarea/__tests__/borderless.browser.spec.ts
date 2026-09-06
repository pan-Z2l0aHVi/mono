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

    await userEvent.keyboard('{Tab}')
    await el.updateComplete
    const focusedStyle = getComputedStyle(inner)
    expect(el.hasAttribute('focused')).toBe(true)
    expect(el.shadowRoot?.querySelector('textarea')?.matches(':focus-visible')).toBe(true)
    expect(focusedStyle.outlineStyle).toBe('solid')
    expect(Number.parseFloat(focusedStyle.outlineWidth)).toBeGreaterThan(0)
  })
})
