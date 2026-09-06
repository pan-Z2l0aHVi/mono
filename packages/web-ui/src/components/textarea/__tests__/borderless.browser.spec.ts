import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'

afterEach(() => document.body.replaceChildren())

describe('WebUiTextarea borderless（浏览器）', () => {
  it('borderless 移除 glass 描边环（.wui-glass::before）且保留 focus 指示器', async () => {
    // 非 borderless 基线：glass ::before 生成描边盒，确保断言非空转
    const base = document.createElement('web-ui-textarea')
    document.body.append(base)
    await base.updateComplete
    const baseInner = base.shadowRoot!.querySelector<HTMLElement>('.wui-textarea-inner')!
    expect(getComputedStyle(baseInner, '::before').content).toBe('""')

    const el = document.createElement('web-ui-textarea')
    el.setAttribute('borderless', '')
    document.body.append(el)
    await el.updateComplete

    const inner = el.shadowRoot!.querySelector<HTMLElement>('.wui-textarea-inner')!
    const style = getComputedStyle(inner)
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(style.boxShadow).toBe('none')
    expect(getComputedStyle(inner, '::before').content).toBe('none')

    el.setAttribute('focused', '')
    await el.updateComplete
    const focusedStyle = getComputedStyle(inner)
    expect(focusedStyle.outlineStyle).toBe('solid')
    expect(Number.parseFloat(focusedStyle.outlineWidth)).toBeGreaterThan(0)
  })
})
