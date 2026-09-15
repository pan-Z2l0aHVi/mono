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
  it('host 使用 contents 盒且不绘制页面背景，自定义属性仍继承到内容', async () => {
    const theme = createTheme()
    const child = document.createElement('span')
    child.textContent = 'content'
    theme.appendChild(child)
    await theme.updateComplete

    // contents：宿主不生成盒、不绘制页面背景（嵌入方保留背景控制权）。
    expect(getComputedStyle(theme).display).toBe('contents')
    expect(getComputedStyle(theme).backgroundColor).toBe('rgba(0, 0, 0, 0)')

    // display 不影响自定义属性继承：slotted/子树内容仍取到主题 token。
    expect(getComputedStyle(child).getPropertyValue('--wui-duration-trigger').trim()).toBe('.16s')
    expect(getComputedStyle(child).getPropertyValue('--wui-color-accent').trim()).toBe('#08f')

    theme.appearance = 'dark'
    await theme.updateComplete
    expect(getComputedStyle(child).getPropertyValue('--wui-color-accent').trim()).toBe('#0a84ff')
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
    // swipe-settle 从组件内 fallback 提升为 theme token，reduced 下才会归零。
    expect(getComputedStyle(outer).getPropertyValue('--wui-duration-swipe-settle').trim()).toBe('0s')
    // 加载循环相反：不停，只放慢。
    expect(getComputedStyle(outer).getPropertyValue('--wui-duration-spin').trim()).toBe('1.6s')
    expect(getComputedStyle(outer).getPropertyValue('--wui-duration-spinner').trim()).toBe('1.6s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-feedback').trim()).toBe('.1s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-trigger').trim()).toBe('.16s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-float-enter').trim()).toBe('.24s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-float-exit').trim()).toBe('.16s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-toast-enter').trim()).toBe('.28s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-toast-exit').trim()).toBe('.2s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-dialog-enter').trim()).toBe('.32s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-dialog-exit').trim()).toBe('.26s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-swipe-settle').trim()).toBe('.22s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-spin').trim()).toBe('.6s')
    expect(getComputedStyle(inner).getPropertyValue('--wui-duration-spinner').trim()).toBe('.8s')
    expect(['cubic-bezier(0.2, 0, 0, 1)', 'cubic-bezier(.2, 0, 0, 1)']).toContain(
      getComputedStyle(inner).getPropertyValue('--wui-ease-dialog').trim()
    )
    expect(['cubic-bezier(0.4, 0.38, 0.2, 1)', 'cubic-bezier(.4, .38, .2, 1)']).toContain(
      getComputedStyle(inner).getPropertyValue('--wui-ease-float').trim()
    )
    expect(getComputedStyle(outer).getPropertyValue('--wui-scale-enter').trim()).toBe('1')
    expect(getComputedStyle(inner).getPropertyValue('--wui-scale-enter').trim()).toBe('.95')
    expect(getComputedStyle(outer).getPropertyValue('--wui-dialog-scale-enter').trim()).toBe('1')
    expect(getComputedStyle(inner).getPropertyValue('--wui-dialog-scale-enter').trim()).toBe('1.2')
  })
})
