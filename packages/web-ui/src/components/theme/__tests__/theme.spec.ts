import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import type { WebUiContextMenu } from '@/components/context-menu'
import { toast } from '@/components/toast'
import '@/components/context-menu'

import { WebUiTheme } from '..'
function createTheme(appearance?: 'light' | 'dark' | 'system'): WebUiTheme {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  if (appearance) theme.appearance = appearance
  document.body.appendChild(theme)
  return theme
}

beforeEach(() => {
  document.body.innerHTML = ''
  toast._reset()
})

afterEach(() => {
  toast._reset()
  document.body.innerHTML = ''
})

describe('WebUiTheme', () => {
  it('appearance 反射为主题边界并创建作用域 overlay root', async () => {
    const theme = createTheme('dark')

    await theme.updateComplete

    expect(theme.getAttribute('appearance')).toBe('dark')
    expect(theme.getOverlayRoot()).toBeTruthy()
  })

  it('缺少 appearance 时不写入主题内容也不创建 overlay root', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const theme = createTheme()

    await theme.updateComplete

    expect(theme.getOverlayRoot()).toBeUndefined()
    expect(theme.shadowRoot?.querySelector('[data-wui-overlay-container]')).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('嵌套主题保持内层 appearance 的独立 token 边界', async () => {
    const outer = createTheme('light')
    const inner = document.createElement('web-ui-theme') as WebUiTheme
    inner.appearance = 'dark'
    outer.appendChild(inner)

    await outer.updateComplete
    await inner.updateComplete

    expect(outer.getOverlayRoot()).toBeTruthy()
    expect(inner.getOverlayRoot()).toBeTruthy()
    expect(inner.getAttribute('appearance')).toBe('dark')
  })

  it('Toast target 使用最近主题的 overlay root', async () => {
    const theme = createTheme('dark')
    const trigger = document.createElement('button')
    theme.appendChild(trigger)
    await theme.updateComplete

    toast.info('scoped', { target: trigger, duration: 0 })
    await new Promise(resolve => requestAnimationFrame(resolve))

    expect(theme.getOverlayRoot()?.querySelector('web-ui-toast')).toBeTruthy()
    expect(document.querySelector('[data-wui-overlay-root]')).toBeNull()
  })

  it('Toast container 显式覆盖主题 scope', async () => {
    const theme = createTheme('dark')
    const trigger = document.createElement('button')
    const container = document.createElement('div')
    theme.append(trigger, container)
    await theme.updateComplete

    toast.info('custom', { target: trigger, container, duration: 0 })
    await new Promise(resolve => requestAnimationFrame(resolve))

    expect(container.querySelector('web-ui-toast')).toBeTruthy()
    expect(theme.getOverlayRoot()?.querySelector('web-ui-toast')).toBeNull()
  })

  it('Context Menu 使用最近主题的 overlay root', async () => {
    const theme = createTheme('dark')
    const menu = document.createElement('web-ui-context-menu') as WebUiContextMenu
    menu.innerHTML = '<web-ui-dropdown-item>编辑</web-ui-dropdown-item>'
    theme.appendChild(menu)
    await theme.updateComplete
    await menu.updateComplete

    menu.openAt(80, 80)
    await new Promise(resolve => requestAnimationFrame(resolve))

    expect(theme.getOverlayRoot()?.querySelector('.context-menu')).toBeTruthy()
  })

  it('无主题的 Toast fallback 不向 document.head 注入样式', async () => {
    const before = document.head.querySelectorAll('style').length

    toast.info('fallback', { duration: 0 })
    await new Promise(resolve => requestAnimationFrame(resolve))

    expect(document.head.querySelectorAll('style')).toHaveLength(before)
    expect(document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot).toBeTruthy()
  })
})
