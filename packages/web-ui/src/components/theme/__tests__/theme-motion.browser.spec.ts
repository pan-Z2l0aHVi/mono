import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiTheme } from '..'

function createTheme(appearance: 'light' | 'dark' | 'system' = 'light'): WebUiTheme {
  const theme = document.createElement('web-ui-theme')
  theme.appearance = appearance
  document.body.appendChild(theme)
  return theme
}

afterEach(() => document.body.replaceChildren())

describe('WebUiTheme motion（浏览器）', () => {
  it('host 使用 block 盒并绘制页面背景，避免 iOS Safari 上 display:contents 的 token 继承缺口', async () => {
    const theme = createTheme()
    await theme.updateComplete

    expect(getComputedStyle(theme).display).toBe('block')
    expect(getComputedStyle(theme).backgroundColor).toBe('rgb(255, 255, 255)')

    theme.appearance = 'dark'
    await theme.updateComplete
    expect(getComputedStyle(theme).backgroundColor).toBe('rgb(36, 38, 40)')
  })

  it('reduced scope 覆盖 motion token，嵌套 full scope 可恢复默认值', async () => {
    const outer = createTheme()
    outer.motion = 'reduced'
    const inner = document.createElement('web-ui-theme')
    inner.appearance = 'dark'
    inner.motion = 'full'
    outer.appendChild(inner)

    await outer.updateComplete
    await inner.updateComplete

    expect(getComputedStyle(outer).getPropertyValue('--wui-duration-feedback').trim()).toBe('0s')
    expect(getComputedStyle(outer).getPropertyValue('--wui-duration-trigger').trim()).toBe('0s')
    expect(getComputedStyle(outer).getPropertyValue('--wui-duration-float-enter').trim()).toBe('0s')
    expect(getComputedStyle(outer).getPropertyValue('--wui-duration-float-exit').trim()).toBe('0s')
    expect(getComputedStyle(outer).getPropertyValue('--wui-duration-toast-enter').trim()).toBe('0s')
    expect(getComputedStyle(outer).getPropertyValue('--wui-duration-toast-exit').trim()).toBe('0s')
    expect(getComputedStyle(outer).getPropertyValue('--wui-duration-dialog-enter').trim()).toBe('0s')
    expect(getComputedStyle(outer).getPropertyValue('--wui-duration-dialog-exit').trim()).toBe('0s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-feedback').trim()).toBe('.1s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-trigger').trim()).toBe('.16s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-float-enter').trim()).toBe('.16s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-float-exit').trim()).toBe('.12s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-toast-enter').trim()).toBe('.28s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-toast-exit').trim()).toBe('.2s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-dialog-enter').trim()).toBe('.32s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-dialog-exit').trim()).toBe('.26s')
    expect(['cubic-bezier(0.2, 0, 0, 1)', 'cubic-bezier(.2, 0, 0, 1)']).toContain(
      getComputedStyle(inner).getPropertyValue('--wui-ease-dialog').trim()
    )
    expect(getComputedStyle(outer).getPropertyValue('--wui-scale-enter').trim()).toBe('1')
    expect(getComputedStyle(inner).getPropertyValue('--wui-scale-enter').trim()).toBe('.97')
  })
})
