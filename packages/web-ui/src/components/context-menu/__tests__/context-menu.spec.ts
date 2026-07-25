import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiContextMenu } from '..'

function createContextMenu(attrs?: Record<string, string>, innerHtml = ''): WebUiContextMenu {
  const el = document.createElement('web-ui-context-menu') as WebUiContextMenu
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v)
    }
  }
  el.innerHTML = innerHtml
  document.body.appendChild(el)
  return el
}

const SIMPLE = '<web-ui-dropdown-item>编辑</web-ui-dropdown-item><web-ui-dropdown-item>复制</web-ui-dropdown-item>'

/** 等待 openAt/requestAnimationFrame + updateComplete 全部完成 */
async function waitForMenuOpen(el: WebUiContextMenu) {
  await el.updateComplete
  await new Promise(resolve => requestAnimationFrame(resolve))
  await el.updateComplete
}

async function waitForMenuClose(el: WebUiContextMenu) {
  await el.updateComplete
}

function getMenu(): HTMLElement | null {
  const fallbackRoot = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
  return fallbackRoot?.querySelector<HTMLElement>('.context-menu') ?? null
}

function getSubmenu(): HTMLElement | null {
  const fallbackRoot = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
  return fallbackRoot?.querySelector<HTMLElement>('.context-submenu') ?? null
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('WebUiContextMenu', () => {
  describe('基础渲染', () => {
    it('渲染默认插槽内容', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete
      expect(el.shadowRoot?.querySelector('.context-menu-anchor')).toBeTruthy()
      expect(el.textContent).toContain('编辑')
      el.remove()
    })

    it('关闭时不投影菜单项到触发区域', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      const slot = el.shadowRoot?.querySelector<HTMLSlotElement>('.context-menu-anchor slot')
      expect(slot?.assignedElements().map(item => item.tagName)).not.toContain('WEB-UI-DROPDOWN-ITEM')

      el.remove()
    })

    it('默认关闭', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete
      expect(el.isOpen).toBe(false)
      expect(getMenu()).toBeNull()
      el.remove()
    })
  })

  describe('prop: disabled', () => {
    it('disabled 反射到 host', async () => {
      const el = createContextMenu({ disabled: '' }, SIMPLE)
      await el.updateComplete
      expect(el.hasAttribute('disabled')).toBe(true)
      el.remove()
    })

    it('disabled 时 openAt() 不生效', async () => {
      const el = createContextMenu({ disabled: '' }, SIMPLE)
      await el.updateComplete
      el.openAt(100, 100)
      await el.updateComplete
      expect(el.isOpen).toBe(false)
      el.remove()
    })

    it('disabled 时右键不打开', async () => {
      const el = createContextMenu({ disabled: '' }, SIMPLE)
      await el.updateComplete
      el.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          clientX: 100,
          clientY: 100
        })
      )
      await el.updateComplete
      expect(el.isOpen).toBe(false)
      el.remove()
    })
  })

  describe('Public API: openAt()', () => {
    it('在指定坐标打开菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete
      el.openAt(50, 60)
      await waitForMenuOpen(el)
      expect(el.isOpen).toBe(true)
      expect(getMenu()).toBeTruthy()
      el.remove()
    })

    it('菜单定位在指定坐标', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete
      el.openAt(100, 200)
      await waitForMenuOpen(el)
      const menu = getMenu() as HTMLElement
      expect(menu).toBeTruthy()
      expect(menu.style.left).toBe('100px')
      expect(menu.style.top).toBe('200px')
      el.remove()
    })

    it('在外部点击事件中调用时保持打开', async () => {
      const el = createContextMenu({}, SIMPLE)
      const button = document.createElement('button')
      button.addEventListener('click', () => el.openAt(100, 200))
      document.body.appendChild(button)
      await el.updateComplete

      button.click()
      await waitForMenuOpen(el)

      expect(el.isOpen).toBe(true)

      el.remove()
      button.remove()
    })
  })

  describe('Public API: close()', () => {
    it('关闭打开的菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete
      el.openAt(100, 100)
      await waitForMenuOpen(el)
      expect(el.isOpen).toBe(true)

      el.close()
      await waitForMenuClose(el)
      expect(el.isOpen).toBe(false)
      el.remove()
    })

    it('关闭未打开的菜单无副作用', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete
      el.close()
      await el.updateComplete
      expect(el.isOpen).toBe(false)
      el.remove()
    })
  })

  describe('event: open-change', () => {
    it('打开时触发', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.openAt(100, 100)
      await waitForMenuOpen(el)

      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent).detail.open).toBe(true)

      el.remove()
    })

    it('关闭时触发', async () => {
      const el = createContextMenu({}, SIMPLE)
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.close()
      await waitForMenuClose(el)

      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent).detail.open).toBe(false)

      el.remove()
    })

    it('右键打开时触发', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          clientX: 50,
          clientY: 60
        })
      )
      await waitForMenuOpen(el)

      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent).detail.open).toBe(true)

      el.remove()
    })
  })

  describe('右键触发', () => {
    it('阻止浏览器原生菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      el.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()

      el.remove()
    })

    it('右键打开菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      el.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          clientX: 100,
          clientY: 200
        })
      )
      await waitForMenuOpen(el)

      expect(el.isOpen).toBe(true)
      const menu = getMenu() as HTMLElement
      expect(menu.style.left).toBe('100px')
      expect(menu.style.top).toBe('200px')

      el.remove()
    })
  })

  describe('点击外部关闭', () => {
    it('点击外部关闭菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      el.openAt(100, 100)
      await waitForMenuOpen(el)
      expect(el.isOpen).toBe(true)

      document.body.click()
      await waitForMenuClose(el)
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('点击普通菜单项后关闭菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const item = getMenu()?.querySelector('web-ui-dropdown-item') as HTMLElement
      item.click()
      await waitForMenuClose(el)

      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('点击菜单内部不关闭', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const menu = el.shadowRoot?.querySelector('.context-menu')
      menu?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await waitForMenuClose(el)

      expect(el.isOpen).toBe(true)

      el.remove()
    })
  })

  describe('菜单项交互', () => {
    it('点击子菜单项时打开子菜单', async () => {
      const el = createContextMenu(
        {},
        '<web-ui-dropdown-item submenu>导出<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'
      )
      await el.updateComplete

      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const item = getMenu()?.querySelector('web-ui-dropdown-item') as HTMLElement
      item.click()
      await el.updateComplete

      const submenu = getSubmenu()
      expect(submenu?.querySelector('web-ui-dropdown-item')?.textContent).toContain('PDF')

      el.remove()
    })

    it('打开菜单时锁定页面滚动，并在关闭后恢复', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      el.openAt(100, 100)
      await waitForMenuOpen(el)

      expect(document.documentElement.style.overflow).toBe('hidden')

      el.close()
      await waitForMenuClose(el)

      expect(document.documentElement.style.overflow).toBe('')

      el.remove()
    })

    it('lock-scroll=false 时打开不锁定页面滚动', async () => {
      const el = createContextMenu({}, SIMPLE)
      el.lockScroll = false
      await el.updateComplete
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      expect(document.body.style.position).toBe('')
      el.remove()
    })

    it('打开菜单时阻止外部容器滚动', async () => {
      const el = createContextMenu({}, SIMPLE)
      const container = document.createElement('div')
      document.body.appendChild(container)
      await el.updateComplete

      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const event = new WheelEvent('wheel', { bubbles: true, cancelable: true })
      container.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)

      el.remove()
      container.remove()
    })

    it('在另一个区域右键打开时关闭当前菜单', async () => {
      const first = createContextMenu({}, SIMPLE)
      const second = createContextMenu({}, SIMPLE)
      await Promise.all([first.updateComplete, second.updateComplete])

      first.openAt(100, 100)
      await waitForMenuOpen(first)

      second.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 200, clientY: 200 }))
      await Promise.all([first.updateComplete, second.updateComplete])

      expect(first.isOpen).toBe(false)
      expect(second.isOpen).toBe(true)

      first.remove()
      second.remove()
    })
  })

  describe('Escape 关闭', () => {
    it('Escape 关闭菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      el.openAt(100, 100)
      await waitForMenuOpen(el)
      expect(el.isOpen).toBe(true)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await waitForMenuClose(el)
      expect(el.isOpen).toBe(false)

      el.remove()
    })

    it('有子菜单时先关闭最深层子菜单', async () => {
      const el = createContextMenu(
        {},
        '<web-ui-dropdown-item submenu>导出<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'
      )
      await el.updateComplete
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const item = getMenu()?.querySelector('web-ui-dropdown-item') as HTMLElement
      item.click()
      await el.updateComplete

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await el.updateComplete

      expect(el.isOpen).toBe(true)
      expect(getSubmenu()).toBeNull()

      el.remove()
    })
  })

  describe('子菜单悬停', () => {
    it('停留 200ms 后打开子菜单', async () => {
      const el = createContextMenu(
        {},
        '<web-ui-dropdown-item submenu>导出<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'
      )
      await el.updateComplete
      el.openAt(100, 100)
      await waitForMenuOpen(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      vi.useFakeTimers()
      try {
        const item = getMenu()?.querySelector('web-ui-dropdown-item') as HTMLElement
        item.dispatchEvent(new MouseEvent('mouseenter'))
        await vi.advanceTimersByTimeAsync(200)

        expect(getSubmenu()).toBeTruthy()

        el.remove()
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('键盘 ContextMenu 键', () => {
    it('ContextMenu 键打开菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true }))
      await waitForMenuOpen(el)
      expect(el.isOpen).toBe(true)

      el.remove()
    })

    it('Shift+F10 打开菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'F10',
          shiftKey: true,
          bubbles: true
        })
      )
      await waitForMenuOpen(el)
      expect(el.isOpen).toBe(true)

      el.remove()
    })
  })

  describe('无障碍', () => {
    it('菜单设置 role="menu"', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const menu = getMenu()
      expect(menu?.getAttribute('role')).toBe('menu')

      el.remove()
    })

    it('菜单项复用 web-ui-dropdown-item', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      el.openAt(100, 100)
      await waitForMenuOpen(el)

      // 菜单项被移动到 shadow root 的 .context-menu 内
      const menu = getMenu()
      const items = menu?.querySelectorAll('web-ui-dropdown-item')
      expect(items?.length).toBe(2)

      el.remove()
    })
  })

  describe('边界处理', () => {
    it('右下角边界检测', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      el.openAt(9999, 9999)
      await waitForMenuOpen(el)

      const menu = getMenu() as HTMLElement
      expect(menu).toBeTruthy()
      const left = Number.parseInt(menu.style.left)
      const top = Number.parseInt(menu.style.top)
      expect(left).toBeLessThan(window.innerWidth)
      expect(top).toBeLessThan(window.innerHeight)

      el.remove()
    })

    it('左上角负坐标检测', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      el.openAt(-100, -100)
      await waitForMenuOpen(el)

      const menu = getMenu() as HTMLElement
      expect(menu).toBeTruthy()
      const left = Number.parseInt(menu.style.left)
      const top = Number.parseInt(menu.style.top)
      expect(left).toBeGreaterThanOrEqual(0)
      expect(top).toBeGreaterThanOrEqual(0)

      el.remove()
    })
  })

  describe('滚动锁定', () => {
    it('滚动事件不会关闭已打开的菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await el.updateComplete

      el.openAt(100, 100)
      await waitForMenuOpen(el)
      expect(el.isOpen).toBe(true)

      document.dispatchEvent(new Event('scroll'))
      await el.updateComplete
      expect(el.isOpen).toBe(true)

      el.remove()
    })
  })
})
