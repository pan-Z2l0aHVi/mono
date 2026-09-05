import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import '@/components/button'
import '@/components/theme'

import type { WebUiBackTop } from '..'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

// back-top 自身不引 glass.css，内部默认按钮是树里唯一的 glass 元素。
// glass 内部变量隔离后，:host 级配置无法再到达该按钮（已删除），
// 按钮阴影一律走 .wui-glass 的 --wui-shadow-glass fallback。
function buttonBoxShadow(el: WebUiBackTop): string {
  const btn = el.shadowRoot?.querySelector('web-ui-button') as HTMLElement | null
  const native = btn?.shadowRoot?.querySelector('button') as HTMLElement | null
  return native ? getComputedStyle(native).boxShadow : ''
}

afterEach(() => document.body.replaceChildren())

describe('back-top 默认 glass 按钮阴影（浏览器）', () => {
  it('使用 glass fallback 阴影，不再继承 panel 阴影', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    const el = document.createElement('web-ui-back-top') as WebUiBackTop
    el.visible = true
    theme.append(el)
    await el.updateComplete
    await nextFrame()

    const shadow = buttonBoxShadow(el)
    expect(shadow).not.toBe('')
    // --wui-shadow-panel（light: 0 3px 9px 0.27）不应再出现在默认按钮上
    expect(shadow).not.toContain('3px 9px')
    // glass fallback 末层（light: 0 8px 32px 0.015）
    expect(shadow).toContain('8px 32px')
  })

  it('嵌套在 glass 容器内同样走 glass fallback，不继承容器阴影', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    document.body.append(theme)

    // 用 variant=glass 按钮构造 glass 容器，把 back-top 放进其默认 slot
    const container = document.createElement('web-ui-button') as HTMLElement & { variant: string }
    container.variant = 'glass'
    const el = document.createElement('web-ui-back-top') as WebUiBackTop
    el.visible = true
    container.append(el)
    theme.append(container)
    await el.updateComplete
    await nextFrame()

    const shadow = buttonBoxShadow(el)
    expect(shadow).not.toBe('')
    expect(shadow).not.toContain('3px 9px')
    expect(shadow).toContain('8px 32px')
  })
})
