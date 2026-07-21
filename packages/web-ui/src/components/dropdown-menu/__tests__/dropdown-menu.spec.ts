import { describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiDropdownMenu } from '..'

function createDropdown(attrs?: Record<string, string>, innerHtml = ''): WebUiDropdownMenu {
  const el = document.createElement('web-ui-dropdown-menu') as WebUiDropdownMenu
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.innerHTML = innerHtml
  document.body.appendChild(el)
  return el
}

const SIMPLE =
  '<button slot="trigger">M</button><web-ui-dropdown-item>a</web-ui-dropdown-item><web-ui-dropdown-item>b</web-ui-dropdown-item>'

describe('WebUiDropdownMenu', () => {
  describe('基础渲染', () => {
    it('渲染触发器', async () => {
      const el = createDropdown({}, SIMPLE)
      await el.updateComplete
      expect(el.shadowRoot?.querySelector('.dropdown-trigger')).toBeTruthy()
      el.remove()
    })

    it('默认关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await el.updateComplete
      expect(el.isOpen).toBe(false)
      el.remove()
    })
  })

  describe('prop', () => {
    it('disabled 反射到 host', async () => {
      const el = createDropdown({ disabled: '' }, SIMPLE)
      await el.updateComplete
      expect(el.hasAttribute('disabled')).toBe(true)
      el.remove()
    })

    it('placement 反射到 host', async () => {
      const el = createDropdown({ placement: 'top-end' }, SIMPLE)
      await el.updateComplete
      expect(el.getAttribute('placement')).toBe('top-end')
      el.remove()
    })

    it('offset 默认值', () => {
      const el = createDropdown({}, SIMPLE)
      expect(el.offset).toBe(4)
      el.remove()
    })
  })

  describe('打开/关闭', () => {
    it('open() 打开菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      await el.updateComplete
      el.open()
      await el.updateComplete
      expect(el.isOpen).toBe(true)
      el.remove()
    })

    it('closeAll() 关闭菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      await el.updateComplete
      el.open()
      await el.updateComplete
      el.closeAll()
      await el.updateComplete
      expect(el.isOpen).toBe(false)
      el.remove()
    })

    it('disabled 时 open() 不生效', async () => {
      const el = createDropdown({ disabled: '' }, SIMPLE)
      await el.updateComplete
      el.open()
      await el.updateComplete
      expect(el.isOpen).toBe(false)
      el.remove()
    })
  })

  describe('键盘', () => {
    it('Escape 关闭菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      await el.updateComplete
      el.open()
      await el.updateComplete
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await el.updateComplete
      expect(el.isOpen).toBe(false)
      el.remove()
    })
  })
})
