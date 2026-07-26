import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import type { WebUiContextMenu } from '@/components/context-menu'
import { toast } from '@/components/toast'

import { WebUiTheme } from '..'
import '@/components/context-menu'
import '@/components/toast'

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
  describe('prop: appearance', () => {
    it('appearance 反射到 host', async () => {
      const theme = createTheme('dark')
      await theme.updateComplete
      expect(theme.getAttribute('appearance')).toBe('dark')
      theme.remove()
    })

    it('非法的 appearance 值回退到 light', async () => {
      const theme = createTheme()
      ;(theme as unknown as Record<string, unknown>).appearance = 'invalid'
      await theme.updateComplete
      expect(theme.appearance).toBe('light')
      expect(theme.getAttribute('appearance')).toBe('light')
      theme.remove()
    })

    it('设置 appearance 时创建 overlay root', async () => {
      const theme = createTheme('light')
      await theme.updateComplete
      expect(theme.getOverlayRoot()).toBeTruthy()
      theme.remove()
    })

    it('缺少 appearance 时 getOverlayRoot 返回 undefined', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const theme = createTheme()
      await theme.updateComplete
      expect(theme.getOverlayRoot()).toBeUndefined()
      expect(warn).toHaveBeenCalledTimes(1)
      warn.mockRestore()
      theme.remove()
    })
  })

  describe('嵌套主题', () => {
    it('内层主题保持独立 overlay root', async () => {
      const outer = createTheme('light')
      const inner = document.createElement('web-ui-theme') as WebUiTheme
      inner.appearance = 'dark'
      outer.appendChild(inner)

      await outer.updateComplete
      await inner.updateComplete

      expect(outer.getOverlayRoot()).toBeTruthy()
      expect(inner.getOverlayRoot()).toBeTruthy()
      expect(inner.getAttribute('appearance')).toBe('dark')
      inner.remove()
      outer.remove()
    })
  })

  describe('Toast 集成', () => {
    it('Toast target 使用最近主题的 overlay root', async () => {
      const theme = createTheme('dark')
      const trigger = document.createElement('button')
      theme.appendChild(trigger)
      await theme.updateComplete

      toast.info('scoped', { target: trigger, duration: 0 })
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(theme.getOverlayRoot()?.querySelector('web-ui-toast')).toBeTruthy()
      theme.remove()
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
      theme.remove()
    })
  })

  describe('Context Menu 集成', () => {
    it('使用最近主题的 overlay root', async () => {
      const theme = createTheme('dark')
      const menu = document.createElement('web-ui-context-menu') as WebUiContextMenu
      menu.innerHTML = '<web-ui-dropdown-item>编辑</web-ui-dropdown-item>'
      theme.appendChild(menu)
      await theme.updateComplete
      await menu.updateComplete

      menu.openAt(80, 80)
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(theme.getOverlayRoot()?.querySelector('.context-menu')).toBeTruthy()
      theme.remove()
    })
  })

  describe('无主题 fallback', () => {
    it('Toast 在不设置主题时使用 fallback overlay root', async () => {
      const before = document.head.querySelectorAll('style').length

      toast.info('fallback', { duration: 0 })
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(document.head.querySelectorAll('style')).toHaveLength(before)
      toast._reset()
    })
  })
})
