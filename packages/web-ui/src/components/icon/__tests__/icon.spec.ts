import type { IconifyIcon } from '@iconify/types'
import { describe, expect, it } from 'vite-plus/test'

import '..'

const createIcon = (body = '<path d="M3 2h18v20H3z"/>'): IconifyIcon => ({ body })

describe('WebUiIcon', () => {
  describe('prop: icon', () => {
    it('无 icon 时不渲染 SVG', async () => {
      const el = document.createElement('web-ui-icon')
      document.body.appendChild(el)
      await el.updateComplete

      expect(el.shadowRoot?.querySelector('svg')).toBeNull()

      el.remove()
    })

    it('有 icon 时渲染 SVG', async () => {
      const el = document.createElement('web-ui-icon')
      el.icon = createIcon()
      document.body.appendChild(el)
      await el.updateComplete

      const svg = el.shadowRoot?.querySelector('svg')
      expect(svg).toBeTruthy()
      expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')

      el.remove()
    })

    it('清空 icon 后 SVG 消失', async () => {
      const el = document.createElement('web-ui-icon')
      el.icon = createIcon()
      document.body.appendChild(el)
      await el.updateComplete
      expect(el.shadowRoot?.querySelector('svg')).toBeTruthy()

      el.icon = undefined
      await el.updateComplete
      expect(el.shadowRoot?.querySelector('svg')).toBeNull()

      el.remove()
    })
  })

  describe('prop: spin', () => {
    it('spin=true 时 SVG 添加 spin class', async () => {
      const el = document.createElement('web-ui-icon')
      el.icon = createIcon()
      el.spin = true
      document.body.appendChild(el)
      await el.updateComplete

      const svg = el.shadowRoot?.querySelector('svg')
      expect(svg?.classList.contains('spin')).toBe(true)

      el.remove()
    })

    it('spin=false 时 SVG 无 spin class', async () => {
      const el = document.createElement('web-ui-icon')
      el.icon = createIcon()
      el.spin = false
      document.body.appendChild(el)
      await el.updateComplete

      const svg = el.shadowRoot?.querySelector('svg')
      expect(svg?.classList.contains('spin')).toBe(false)

      el.remove()
    })
  })

  describe('prop: size', () => {
    it('自定义 size 应用到 SVG', async () => {
      const el = document.createElement('web-ui-icon')
      el.icon = createIcon()
      el.size = 32
      document.body.appendChild(el)
      await el.updateComplete

      const svg = el.shadowRoot?.querySelector('svg')
      expect(svg?.getAttribute('width')).toBe('32')
      expect(svg?.getAttribute('height')).toBe('32')

      el.remove()
    })

    it('默认值为 18', async () => {
      const el = document.createElement('web-ui-icon')
      el.icon = createIcon()
      document.body.appendChild(el)
      await el.updateComplete

      const svg = el.shadowRoot?.querySelector('svg')
      expect(svg?.getAttribute('width')).toBe('18')
      expect(svg?.getAttribute('height')).toBe('18')

      el.remove()
    })
  })

  describe('prop: color', () => {
    it('设置 color 时应用 CSS 变量', async () => {
      const el = document.createElement('web-ui-icon')
      el.icon = createIcon()
      el.color = 'red'
      document.body.appendChild(el)
      await el.updateComplete

      expect(el.shadowRoot?.querySelector('svg')?.getAttribute('style')).toContain('color: red')

      el.remove()
    })
  })
})
