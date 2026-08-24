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

  describe('默认属性与反射（合并）', () => {
    it('默认值符合契约', async () => {
      const el = document.createElement('web-ui-icon')
      document.body.appendChild(el)
      await el.updateComplete
      expect(el.size).toBe(18)
      expect(el.spin).toBe(false)
      expect(el.hasAttribute('spin')).toBe(false)
    })

    it.each([
      ['size', 32, '32'],
      ['color', 'red', 'red']
    ] as const)('%s 反射到宿主 attribute', async (prop, value, expected) => {
      const el = document.createElement('web-ui-icon') as any
      el.icon = aIcon
      document.body.appendChild(el)
      await el.updateComplete
      el[prop] = value
      await el.updateComplete
      expect(el.getAttribute(prop)).toBe(expected)
    })

    it('spin 布尔存在语义', async () => {
      const el = document.createElement('web-ui-icon')
      document.body.appendChild(el)
      await el.updateComplete
      el.spin = true
      await el.updateComplete
      expect(el.hasAttribute('spin')).toBe(true)
      el.spin = false
      await el.updateComplete
      expect(el.hasAttribute('spin')).toBe(false)
    })
  })
})
