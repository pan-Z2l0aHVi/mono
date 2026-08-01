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
    expect(getComputedStyle(outer).getPropertyValue('--wui-duration-fast').trim()).toBe('0s')
    expect(getComputedStyle(outer).getPropertyValue('--wui-duration-menu-enter').trim()).toBe('0s')
    expect(getComputedStyle(outer).getPropertyValue('--wui-duration-menu-exit').trim()).toBe('0s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-feedback').trim()).toBe('.12s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-fast').trim()).toBe('.16s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-menu-enter').trim()).toBe('.14s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-menu-exit').trim()).toBe('.1s')
    expect(getComputedStyle(outer).getPropertyValue('--wui-scale-enter').trim()).toBe('1')
    expect(getComputedStyle(inner).getPropertyValue('--wui-scale-enter').trim()).toBe('.97')
  })
})
