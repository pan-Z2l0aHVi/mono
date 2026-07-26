import { describe, expect, it, vi, afterEach, beforeEach } from 'vite-plus/test'

import '..'
import { cleanupElement, spyEvents, waitForUpdate } from '@/shared/test-utils'

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
    it('默认关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })
  })

  describe('prop: open', () => {
    it('open 属性反射到 host', async () => {
      const el = createDropdown({}, SIMPLE)
      el.open = true
      await waitForUpdate(el)
      expect(el.hasAttribute('open')).toBe(true)

      el.open = false
      await waitForUpdate(el)
      expect(el.hasAttribute('open')).toBe(false)

      cleanupElement(el)
    })

    it('设置 open=true 打开菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      el.open = true
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)
      cleanupElement(el)
    })

    it('设置 open=false 关闭菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      el.open = true
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      el.open = false
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })
  })

  describe('prop: disabled', () => {
    it('disabled 反射到 host', async () => {
      const el = createDropdown({ disabled: '' }, SIMPLE)
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)
      cleanupElement(el)
    })

    it('disabled 时 openMenu() 不生效', async () => {
      const el = createDropdown({ disabled: '' }, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })

    it('disabled 时 trigger 点击不打开', async () => {
      const el = createDropdown({ disabled: '' }, SIMPLE)
      await waitForUpdate(el)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })
  })

  describe('prop: placement / offset', () => {
    it('placement 反射到 host', async () => {
      const el = createDropdown({ placement: 'top-end' }, SIMPLE)
      await waitForUpdate(el)
      expect(el.getAttribute('placement')).toBe('top-end')
      cleanupElement(el)
    })

    it('placement 默认值为 bottom-start', async () => {
      const el = createDropdown({}, SIMPLE)
      expect(el.placement).toBe('bottom-start')
      cleanupElement(el)
    })

    it('offset 默认值为 4', () => {
      const el = createDropdown({}, SIMPLE)
      expect(el.offset).toBe(4)
      cleanupElement(el)
    })

    it('offset 支持自定义', () => {
      const el = createDropdown({}, SIMPLE)
      el.offset = 16
      expect(el.offset).toBe(16)
      cleanupElement(el)
    })
  })

  describe('打开/关闭', () => {
    it('卸载打开的菜单时恢复页面滚动', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      el.openMenu()
      await waitForUpdate(el)
      expect(document.body.style.position).toBe('fixed')

      cleanupElement(el)

      expect(document.body.style.position).toBe('')
    })

    it('lock-scroll=false 时打开不锁定页面滚动', async () => {
      const el = createDropdown({}, SIMPLE)
      el.lockScroll = false
      await waitForUpdate(el)
      el.openMenu()
      await waitForUpdate(el)

      expect(document.body.style.position).toBe('')
      cleanupElement(el)
    })

    it('openMenu() 打开菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)
      expect(el.open).toBe(true)
      cleanupElement(el)
    })

    it('closeAll() 关闭菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await waitForUpdate(el)
      el.closeAll()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      expect(el.open).toBe(false)
      cleanupElement(el)
    })

    it('trigger 点击切换打开/关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      clickTrigger(el)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })
  })

  describe('event: open-change', () => {
    it('打开时触发', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'open-change')

      el.openMenu()
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      expect((events[0] as CustomEvent).detail.open).toBe(true)
      detach()
      cleanupElement(el)
    })

    it('关闭时触发', async () => {
      const el = createDropdown({}, SIMPLE)
      el.openMenu()
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'open-change')

      el.closeAll()
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      expect((events[0] as CustomEvent).detail.open).toBe(false)
      detach()
      cleanupElement(el)
    })

    it('trigger 点击打开时触发', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'open-change')

      clickTrigger(el)
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      expect((events[0] as CustomEvent).detail.open).toBe(true)
      detach()
      cleanupElement(el)
    })

    it('trigger 点击关闭时触发', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      clickTrigger(el)
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'open-change')

      clickTrigger(el)
      await waitForUpdate(el)

      expect(events).toHaveLength(1)
      expect((events[0] as CustomEvent).detail.open).toBe(false)
      detach()
      cleanupElement(el)
    })
  })

  describe('外部点击关闭', () => {
    it('外部设置 open=true 的同一点击周期不关闭菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      el.addEventListener('open-change', () => document.body.click(), { once: true })
      el.open = true
      await waitForUpdate(el)

      expect(el.isOpen).toBe(true)
      cleanupElement(el)
    })

    it('打开菜单的同一次外部点击不关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      el.openMenu()
      document.body.click()
      await waitForUpdate(el)

      expect(el.isOpen).toBe(true)
      cleanupElement(el)
    })

    it('点击面板内部不关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      el.openMenu()
      await waitForUpdate(el)
      const item = el.querySelector('web-ui-dropdown-item') as HTMLElement
      item.click()
      await waitForUpdate(el)

      expect(el.isOpen).toBe(true)
      cleanupElement(el)
    })

    it('点击外部关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      el.openMenu()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      await new Promise(resolve => setTimeout(resolve))
      document.body.click()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })
  })

  describe('键盘', () => {
    it('Escape 关闭菜单', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      el.openMenu()
      await waitForUpdate(el)
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })
  })
})
