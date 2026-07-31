import type { IconifyIcon } from '@iconify/types'
import { describe, expect, it, afterEach } from 'vite-plus/test'

import type { WebUiIcon } from '..'
import '..'

const aIcon: IconifyIcon = { body: '<path d="M3 2h18v20H3z"/>' }

describe('WebUiIcon 组件', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('属性：icon', () => {
    it('无 icon 时不渲染 SVG', async () => {
      const el = document.createElement('web-ui-icon')

      document.body.appendChild(el)
      await el.updateComplete

      expect(el.shadowRoot?.querySelector('svg[aria-hidden="true"]')).toBeNull()
    })

    it('有 icon 时渲染带 aria-hidden 的 SVG', async () => {
      const el = document.createElement('web-ui-icon')
      el.icon = aIcon

      document.body.appendChild(el)
      await el.updateComplete

      const svg = el.shadowRoot?.querySelector('svg[aria-hidden="true"]')
      expect(svg).toBeTruthy()
    })
  })

  describe('属性：size', () => {
    it('默认值为 18', async () => {
      const el = document.createElement('web-ui-icon')
      el.icon = aIcon

      document.body.appendChild(el)
      await el.updateComplete

      expect(el.size).toBe(18)
    })

    it('反射为 size 属性', async () => {
      const el = document.createElement('web-ui-icon')
      el.icon = aIcon
      el.size = 32

      document.body.appendChild(el)
      await el.updateComplete

      expect(el.getAttribute('size')).toBe('32')
    })
  })

  describe('属性：spin', () => {
    it('默认值为 false', async () => {
      const el = document.createElement('web-ui-icon')

      document.body.appendChild(el)
      await el.updateComplete

      expect(el.spin).toBe(false)
    })

    it('true 时反射为 spin 属性', async () => {
      const el = document.createElement('web-ui-icon')

      document.body.appendChild(el)
      el.spin = true
      await el.updateComplete

      expect(el.hasAttribute('spin')).toBe(true)
    })

    it('false 时移除 spin 属性', async () => {
      const el = document.createElement('web-ui-icon')
      el.spin = true

      document.body.appendChild(el)
      await el.updateComplete

      el.spin = false
      await el.updateComplete

      expect(el.hasAttribute('spin')).toBe(false)
    })
  })

  describe('属性：color', () => {
    it('反射为 color 属性', async () => {
      const el = document.createElement('web-ui-icon')
      el.color = 'red'

      document.body.appendChild(el)
      await el.updateComplete

      expect(el.getAttribute('color')).toBe('red')
    })
  })
})
