import { describe, expect, it, vi, afterEach, beforeEach } from 'vite-plus/test'

import '..'
import { cleanupElement, spyEvents, waitForUpdate } from '@/shared/test-utils'

import type { WebUiDropdown } from '..'

function createDropdown(attrs?: Record<string, string>, innerHtml = ''): WebUiDropdown {
  const el = document.createElement('web-ui-dropdown')
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

const clickTrigger = (el: WebUiDropdown) => {
  const slot = el.shadowRoot!.querySelector('slot[name="trigger"]') as HTMLSlotElement
  const trigger = slot.assignedElements()[0] as HTMLElement
  trigger.click()
}

function touchPointerEvent(type: string): PointerEvent {
  const event = new PointerEvent(type)
  Object.defineProperty(event, 'pointerType', { value: 'touch' })
  return event
}

function getMenuItem(): HTMLElement | null {
  const fallbackRoot = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
  return fallbackRoot?.querySelector<HTMLElement>('.dropdown-overlay web-ui-dropdown-item') ?? null
}

function getMenuItems(): HTMLElement[] {
  const fallbackRoot = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
  return [...(fallbackRoot?.querySelectorAll<HTMLElement>('.dropdown-overlay web-ui-dropdown-item') ?? [])]
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('WebUiDropdown 组件', () => {
  describe('基础渲染', () => {
    it('默认关闭', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })
  })

  describe('属性：open', () => {
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

  describe('属性：disabled', () => {
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

  describe('属性：placement / offset', () => {
    it('match-width 映射到 matchWidth', async () => {
      const el = createDropdown({ 'match-width': '' }, SIMPLE)
      await waitForUpdate(el)
      expect(el.matchWidth).toBe(true)
      cleanupElement(el)
    })

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

    it('打开后修改定位属性保持菜单可用', async () => {
      const el = createDropdown({}, SIMPLE)
      el.openMenu()
      await waitForUpdate(el)
      el.placement = 'top'
      el.offset = 12
      el.matchWidth = true
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(el.isOpen).toBe(true)
      expect(getMenuItem()).toBeTruthy()
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

    it('no-scroll-lock 为 true 时打开不锁定页面滚动', async () => {
      const el = createDropdown({ 'no-scroll-lock': '' }, SIMPLE)
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

  describe('事件：open-change', () => {
    it('命令式打开不触发', async () => {
      const el = createDropdown({}, SIMPLE)
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'open-change')

      el.openMenu()
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
      detach()
      cleanupElement(el)
    })

    it('命令式关闭不触发', async () => {
      const el = createDropdown({}, SIMPLE)
      el.openMenu()
      await waitForUpdate(el)

      const [events, detach] = spyEvents(el, 'open-change')

      el.closeAll()
      await waitForUpdate(el)

      expect(events).toHaveLength(0)
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
      const item = el.querySelector('web-ui-dropdown-item')!
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

  describe('子菜单悬停', () => {
    it('touch pointerenter 不打开子菜单', async () => {
      const el = createDropdown(
        {},
        '<button slot="trigger">M</button><web-ui-dropdown-item submenu>导出<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'
      )
      await waitForUpdate(el)
      el.openMenu()
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))

      vi.useFakeTimers()
      try {
        const item = getMenuItem()!
        item.dispatchEvent(touchPointerEvent('pointerenter'))
        await vi.advanceTimersByTimeAsync(200)
        await el.updateComplete

        expect(item.hasAttribute('active')).toBe(false)

        cleanupElement(el)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('条件渲染边界', () => {
    it('关闭状态把注释锚点替换为 wrapper 后，新成员进入菜单', async () => {
      const el = createDropdown(
        {},
        '<button slot="trigger">M</button><!--items--><web-ui-dropdown-item>a</web-ui-dropdown-item>'
      )
      await waitForUpdate(el)

      const comment = [...el.childNodes].find(node => node.nodeType === Node.COMMENT_NODE) as Comment
      const wrapper = document.createElement('div')
      wrapper.innerHTML = '<web-ui-dropdown-item>b</web-ui-dropdown-item>'
      el.replaceChild(wrapper, comment)
      await waitForUpdate(el)

      el.openMenu()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(getMenuItems().map(item => item.textContent?.trim())).toEqual(['b', 'a'])

      cleanupElement(el)
    })

    it('打开时删除 wrapper 后立即从菜单移除成员并保持键盘导航有效', async () => {
      const el = createDropdown(
        {},
        '<button slot="trigger">M</button><web-ui-dropdown-item>a</web-ui-dropdown-item><div><web-ui-dropdown-item>b</web-ui-dropdown-item></div>'
      )
      await waitForUpdate(el)
      const wrapper = el.querySelector('div')!
      el.openMenu()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      wrapper.remove()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(getMenuItems().map(item => item.textContent?.trim())).toEqual(['a'])

      const overlay = document
        .querySelector<HTMLElement>('[data-wui-overlay-root]')
        ?.shadowRoot?.querySelector<HTMLElement>('.dropdown-overlay')
      overlay?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      await waitForUpdate(el)
      const items = getMenuItems()
      const focusedItem = items.find(item => item.shadowRoot?.activeElement)
      expect(focusedItem).toBe(items[0])

      cleanupElement(el)
    })

    it('打开时删除嵌套子菜单 wrapper 后同步移除子成员', async () => {
      const el = createDropdown(
        {},
        '<button slot="trigger">M</button><web-ui-dropdown-item submenu>导出<div><web-ui-dropdown-item>PDF</web-ui-dropdown-item></div></web-ui-dropdown-item>'
      )
      await waitForUpdate(el)

      const wrapper = el.querySelector('web-ui-dropdown-item div')!
      el.openMenu()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      const parent = document
        .querySelector<HTMLElement>('[data-wui-overlay-root]')
        ?.shadowRoot?.querySelector<HTMLElement>('.dropdown-overlay web-ui-dropdown-item[submenu]')
      parent?.click()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))

      wrapper.remove()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      const fallbackRoot = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
      const submenuItems = fallbackRoot?.querySelectorAll<HTMLElement>(
        '.dropdown-overlay[data-level]:not([data-level="0"]) web-ui-dropdown-item'
      )
      expect([...(submenuItems ?? [])]).toEqual([])

      cleanupElement(el)
    })
  })
})
