import { describe, expect, it, vi, afterEach, beforeEach } from 'vite-plus/test'

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

const clickTrigger = (el: WebUiDropdownMenu) => {
  const slot = el.shadowRoot!.querySelector('slot[name="trigger"]') as HTMLSlotElement
  const trigger = slot.assignedElements()[0] as HTMLElement
  trigger.click()
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

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

  describe('prop: open', () => {
    it('open 属性反射到 host', async () => {
      const el = createDropdown({}, SIMPLE)
      el.open = true
      await el.updateComplete
      expect(el.hasAttribute('open')).toBe(true)

      el.open = false
      await el.updateComplete
      expect(el.hasAttribute('open')).toBe(false)

      el.remove()
    })

    it('设置 open=true 打开菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      el.open = true
      await el.updateComplete
      expect(el.isOpen).toBe(true)

      el.remove()
    })

    it('设置 open=false 关闭菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      el.open = true
      await el.updateComplete
      expect(el.isOpen).toBe(true)

      el.open = false
      await el.updateComplete
      expect(el.isOpen).toBe(false)

      el.remove()
    })
  })

  describe('prop: disabled', () => {
    it('disabled 反射到 host', async () => {
      const el = createDropdown({ disabled: '' }, SIMPLE)
      await el.updateComplete
      expect(el.hasAttribute('disabled')).toBe(true)
      el.remove()
    })

    it('disabled 时 openMenu() 不生效', async () => {
      const el = createDropdown({ disabled: '' }, SIMPLE)
      await el.updateComplete
      el.openMenu()
      await el.updateComplete
      expect(el.isOpen).toBe(false)
      el.remove()
    })

    it('disabled 时 trigger 点击不打开', async () => {
      const el = createDropdown({ disabled: '' }, SIMPLE)
      await el.updateComplete

      clickTrigger(el)
      await el.updateComplete
      expect(el.isOpen).toBe(false)

      el.remove()
    })
  })

  describe('prop: placement / offset', () => {
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
    it('openMenu() 打开菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      await el.updateComplete
      el.openMenu()
      await el.updateComplete
      expect(el.isOpen).toBe(true)
      expect(el.open).toBe(true)
      el.remove()
    })

    it('closeAll() 关闭菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      await el.updateComplete
      el.openMenu()
      await el.updateComplete
      el.closeAll()
      await el.updateComplete
      expect(el.isOpen).toBe(false)
      expect(el.open).toBe(false)
      el.remove()
    })

    it('trigger 点击切换打开/关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await el.updateComplete

      clickTrigger(el)
      await el.updateComplete
      expect(el.isOpen).toBe(true)

      clickTrigger(el)
      await el.updateComplete
      expect(el.isOpen).toBe(false)

      el.remove()
    })
  })

  describe('event: open-change', () => {
    it('打开时触发', async () => {
      const el = createDropdown({}, SIMPLE)
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.openMenu()
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent).detail.open).toBe(true)

      el.remove()
    })

    it('关闭时触发', async () => {
      const el = createDropdown({}, SIMPLE)
      el.openMenu()
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.closeAll()
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent).detail.open).toBe(false)

      el.remove()
    })

    it('trigger 点击打开时触发', async () => {
      const el = createDropdown({}, SIMPLE)
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      clickTrigger(el)
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent).detail.open).toBe(true)

      el.remove()
    })

    it('trigger 点击关闭时触发', async () => {
      const el = createDropdown({}, SIMPLE)
      await el.updateComplete

      clickTrigger(el)
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      clickTrigger(el)
      await el.updateComplete

      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent).detail.open).toBe(false)

      el.remove()
    })
  })

  describe('click outside', () => {
    it('外部设置 open=true 的同一点击周期不关闭菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      await el.updateComplete

      el.addEventListener('open-change', () => document.body.click(), { once: true })
      el.open = true
      await el.updateComplete

      expect(el.isOpen).toBe(true)

      el.remove()
    })

    it('打开菜单的同一次外部点击不关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await el.updateComplete

      el.openMenu()
      document.body.click()
      await el.updateComplete

      expect(el.isOpen).toBe(true)

      el.remove()
    })

    it('点击面板内部不关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await el.updateComplete

      el.openMenu()
      await el.updateComplete
      const item = el.querySelector('web-ui-dropdown-item') as HTMLElement
      item.click()
      await el.updateComplete

      expect(el.isOpen).toBe(true)

      el.remove()
    })

    it('点击外部关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await el.updateComplete

      el.openMenu()
      await el.updateComplete
      expect(el.isOpen).toBe(true)

      await new Promise(resolve => setTimeout(resolve))
      document.body.click()
      await el.updateComplete
      expect(el.isOpen).toBe(false)

      el.remove()
    })
  })

  describe('键盘', () => {
    it('Escape 关闭菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      await el.updateComplete
      el.openMenu()
      await el.updateComplete
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await el.updateComplete
      expect(el.isOpen).toBe(false)
      el.remove()
    })
  })
})
