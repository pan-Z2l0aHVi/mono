import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import { cleanupElement, waitForUpdate } from '@/shared/test-utils'

import type { WebUiContextMenu } from '..'

function createContextMenu(attrs?: Record<string, string>, innerHtml = ''): WebUiContextMenu {
  const el = document.createElement('web-ui-context-menu')
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
  return fallbackRoot?.querySelector<HTMLElement>('[role="menu"][aria-label="上下文菜单"]') ?? null
}

function getSubmenu(): HTMLElement | null {
  const fallbackRoot = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
  return fallbackRoot?.querySelector<HTMLElement>('[role="menu"][aria-label="子菜单"]') ?? null
}

function getFirstMenuItem(): HTMLElement {
  const item = getMenu()?.querySelector<HTMLElement>('web-ui-dropdown-item')
  if (!item) throw new Error('Expected the context menu to contain a menu item')
  return item
}

function getMenuItems(): HTMLElement[] {
  return [...(getMenu()?.querySelectorAll<HTMLElement>('web-ui-dropdown-item') ?? [])]
}

function touchPointerEvent(type: string): PointerEvent {
  const event = new PointerEvent(type)
  Object.defineProperty(event, 'pointerType', { value: 'touch' })
  return event
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('WebUiContextMenu 组件', () => {
  describe('基础渲染', () => {
    it('默认关闭', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      expect(getMenu()).toBeNull()
      cleanupElement(el)
    })
  })

  describe('属性：disabled', () => {
    it('disabled 反射到 host', async () => {
      const el = createContextMenu({ disabled: '' }, SIMPLE)
      await waitForUpdate(el)
      expect(el.hasAttribute('disabled')).toBe(true)
      cleanupElement(el)
    })

    it('disabled 时 openAt() 不生效', async () => {
      const el = createContextMenu({ disabled: '' }, SIMPLE)
      await waitForUpdate(el)
      el.openAt(100, 100)
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })

    it('disabled 时右键不打开', async () => {
      const el = createContextMenu({ disabled: '' }, SIMPLE)
      await waitForUpdate(el)
      el.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          clientX: 100,
          clientY: 100
        })
      )
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })
  })

  describe('公开 API：openAt()', () => {
    it('在指定坐标打开菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)
      el.openAt(50, 60)
      await waitForMenuOpen(el)
      expect(el.isOpen).toBe(true)
      expect(getMenu()).toBeTruthy()
      cleanupElement(el)
    })

    it('菜单定位在指定坐标', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)
      el.openAt(100, 200)
      await waitForMenuOpen(el)
      const menu = getMenu()!
      expect(menu).toBeTruthy()
      expect(menu.style.left).toBe('100px')
      expect(menu.style.top).toBe('200px')
      cleanupElement(el)
    })

    it('在外部点击事件中调用时保持打开', async () => {
      const el = createContextMenu({}, SIMPLE)
      const button = document.createElement('button')
      button.addEventListener('click', () => el.openAt(100, 200))
      document.body.appendChild(button)
      await waitForUpdate(el)

      button.click()
      await waitForMenuOpen(el)

      expect(el.isOpen).toBe(true)

      cleanupElement(el)
      button.remove()
    })
  })

  describe('公开 API：close()', () => {
    it('关闭打开的菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)
      el.openAt(100, 100)
      await waitForMenuOpen(el)
      expect(el.isOpen).toBe(true)

      el.close()
      await waitForMenuClose(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })

    it('关闭未打开的菜单无副作用', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)
      el.close()
      await waitForUpdate(el)
      expect(el.isOpen).toBe(false)
      cleanupElement(el)
    })
  })

  describe('事件：open-change', () => {
    it('命令式打开不触发', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.openAt(100, 100)
      await waitForMenuOpen(el)

      expect(handler).not.toHaveBeenCalled()

      cleanupElement(el)
    })

    it('命令式关闭不触发', async () => {
      const el = createContextMenu({}, SIMPLE)
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)

      el.close()
      await waitForMenuClose(el)

      expect(handler).not.toHaveBeenCalled()

      cleanupElement(el)
    })

    it('右键打开时触发', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)

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

      cleanupElement(el)
    })

    it('按 Escape 关闭时触发', async () => {
      const el = createContextMenu({}, SIMPLE)
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await waitForMenuClose(el)

      expect(el.isOpen).toBe(false)
      expect(handler).toHaveBeenCalledTimes(1)
      expect((handler.mock.calls[0][0] as CustomEvent).detail.open).toBe(false)
      cleanupElement(el)
    })

    it('重新定位已打开菜单后，命令式关闭不派发残留事件', async () => {
      const el = createContextMenu({}, SIMPLE)
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const handler = vi.fn<(e: Event) => void>()
      el.addEventListener('open-change', handler)
      el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 200, clientY: 200 }))
      await new Promise(resolve => requestAnimationFrame(resolve))
      el.close()
      await waitForMenuClose(el)

      expect(handler).not.toHaveBeenCalled()
      cleanupElement(el)
    })
  })

  describe('右键触发', () => {
    it('阻止浏览器原生菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)

      const event = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      el.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()

      cleanupElement(el)
    })

    it('打开更新尚未完成时卸载不会遗留滚动锁', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)

      el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 100, clientY: 100 }))
      cleanupElement(el)
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

      expect(document.documentElement.style.overflow).toBe('')
      expect(document.body.style.position).toBe('')
    })

    it('右键打开菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)

      el.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          clientX: 100,
          clientY: 200
        })
      )
      await waitForMenuOpen(el)

      expect(el.isOpen).toBe(true)
      const menu = getMenu()!
      expect(menu.style.left).toBe('100px')
      expect(menu.style.top).toBe('200px')

      cleanupElement(el)
    })
  })

  describe('点击外部关闭', () => {
    it('点击外部关闭菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)

      el.openAt(100, 100)
      await waitForMenuOpen(el)
      expect(el.isOpen).toBe(true)

      // flush setTimeout so _ignoreOutsideClick is reset
      await new Promise(resolve => setTimeout(resolve))
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await waitForMenuClose(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('点击普通菜单项后关闭菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)

      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const item = getFirstMenuItem()
      item.click()
      await waitForMenuClose(el)

      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })
  })

  describe('菜单项交互', () => {
    it('点击子菜单项时打开子菜单', async () => {
      const el = createContextMenu(
        {},
        '<web-ui-dropdown-item submenu>导出<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'
      )
      await waitForUpdate(el)

      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const item = getFirstMenuItem()
      item.click()
      await waitForUpdate(el)

      const submenu = getSubmenu()
      expect(submenu?.querySelector('web-ui-dropdown-item')?.textContent).toContain('PDF')

      cleanupElement(el)
    })

    it('打开菜单时锁定页面滚动，并在关闭后恢复', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)

      el.openAt(100, 100)
      await waitForMenuOpen(el)

      expect(document.documentElement.style.overflow).toBe('hidden')

      el.close()
      await waitForMenuClose(el)

      expect(document.documentElement.style.overflow).toBe('')

      cleanupElement(el)
    })

    it('no-scroll-lock 为 true 时打开不锁定页面滚动', async () => {
      const el = createContextMenu({ 'no-scroll-lock': '' }, SIMPLE)
      await waitForUpdate(el)
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      expect(document.body.style.position).toBe('')
      cleanupElement(el)
    })

    it('打开菜单时阻止外部容器滚动', async () => {
      const el = createContextMenu({}, SIMPLE)
      const container = document.createElement('div')
      document.body.appendChild(container)
      await waitForUpdate(el)

      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const event = new WheelEvent('wheel', { bubbles: true, cancelable: true })
      container.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)

      cleanupElement(el)
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

      cleanupElement(first)
      cleanupElement(second)
    })
  })

  describe('Escape 关闭', () => {
    it('Escape 关闭菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)

      el.openAt(100, 100)
      await waitForMenuOpen(el)
      expect(el.isOpen).toBe(true)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await waitForMenuClose(el)
      expect(el.isOpen).toBe(false)

      cleanupElement(el)
    })

    it('有子菜单时先关闭最深层子菜单', async () => {
      const el = createContextMenu(
        {},
        '<web-ui-dropdown-item submenu>导出<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'
      )
      await waitForUpdate(el)
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const item = getFirstMenuItem()
      item.click()
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await waitForUpdate(el)

      expect(el.isOpen).toBe(true)
      expect(getSubmenu()).toBeNull()

      cleanupElement(el)
    })
  })

  describe('子菜单悬停', () => {
    it('停留 200ms 后用 pointerenter 打开子菜单', async () => {
      const el = createContextMenu(
        {},
        '<web-ui-dropdown-item submenu>导出<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'
      )
      await waitForUpdate(el)
      el.openAt(100, 100)
      await waitForMenuOpen(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      vi.useFakeTimers()
      try {
        const item = getFirstMenuItem()
        item.dispatchEvent(new PointerEvent('pointerenter'))
        await vi.advanceTimersByTimeAsync(200)

        expect(getSubmenu()).toBeTruthy()

        cleanupElement(el)
      } finally {
        vi.useRealTimers()
      }
    })

    it('touch pointerenter 不打开子菜单', async () => {
      const el = createContextMenu(
        {},
        '<web-ui-dropdown-item submenu>导出<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'
      )
      await waitForUpdate(el)
      el.openAt(100, 100)
      await waitForMenuOpen(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      vi.useFakeTimers()
      try {
        const item = getFirstMenuItem()
        item.dispatchEvent(touchPointerEvent('pointerenter'))
        await vi.advanceTimersByTimeAsync(200)

        expect(getSubmenu()).toBeNull()

        cleanupElement(el)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('已打开时再次定位', () => {
    it('宿主重渲染嵌套子项后重新打开，新子项被重新隐藏', async () => {
      const el = createContextMenu(
        {},
        '<web-ui-dropdown-item submenu>导出<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'
      )
      await waitForUpdate(el)
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      // 模拟宿主切换上下文：重建嵌套子项（新节点不携带隐藏 slot）
      const parentItem = getFirstMenuItem()
      parentItem.replaceChildren()
      const freshChild = document.createElement('web-ui-dropdown-item')
      freshChild.textContent = 'DOCX'
      parentItem.appendChild(freshChild)

      // 在另一个位置重新定位打开
      el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 200, clientY: 200 }))
      await waitForMenuOpen(el)

      const nested = parentItem.querySelector('web-ui-dropdown-item')!
      expect(nested.getAttribute('slot')).toBe('context-menu-hidden')

      // 隐藏不破坏子菜单打开：点击父项仍能以重建的子项打开子菜单
      parentItem.click()
      await waitForUpdate(el)
      expect(getSubmenu()?.textContent).toContain('DOCX')

      cleanupElement(el)
    })

    it('无重定位的宿主重建嵌套子项，观察者刷新后新子项被重新隐藏', async () => {
      const el = createContextMenu(
        {},
        '<web-ui-dropdown-item submenu>导出<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'
      )
      await waitForUpdate(el)
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      // 不经重定位（无 contextmenu/openAt），宿主直接重建父项的嵌套子项
      const parentItem = getFirstMenuItem()
      parentItem.replaceChildren()
      const freshChild = document.createElement('web-ui-dropdown-item')
      freshChild.textContent = 'DOCX'
      parentItem.appendChild(freshChild)

      // MutationObserver 微任务 + 刷新 rAF
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(el.isOpen).toBe(true)
      expect(freshChild.getAttribute('slot')).toBe('context-menu-hidden')

      cleanupElement(el)
    })

    it('子菜单打开期间重建子项后关闭子菜单，归还的子项被重新隐藏', async () => {
      const el = createContextMenu(
        {},
        '<web-ui-dropdown-item submenu>导出<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'
      )
      await waitForUpdate(el)
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const parentItem = getFirstMenuItem()
      parentItem.click()
      await waitForUpdate(el)
      expect(getSubmenu()).toBeTruthy()

      // 子菜单打开期间宿主重建父项内的嵌套子项
      const freshChild = document.createElement('web-ui-dropdown-item')
      freshChild.textContent = 'DOCX'
      parentItem.appendChild(freshChild)
      await new Promise(resolve => requestAnimationFrame(resolve))

      // Escape 关闭子菜单，归还的子项必须回到隐藏态
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(getSubmenu()).toBeNull()
      const nestedSlots = [...parentItem.querySelectorAll('web-ui-dropdown-item')].map(item =>
        item.getAttribute('slot')
      )
      expect(nestedSlots).toEqual(['context-menu-hidden', 'context-menu-hidden'])

      cleanupElement(el)
    })

    it('宿主替换整个父项节点，观察者刷新后新父项的嵌套子项被重新隐藏', async () => {
      const el = createContextMenu(
        {},
        '<web-ui-dropdown-item submenu>导出<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'
      )
      await waitForUpdate(el)
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      // 模拟宿主框架整体替换父项节点（旧父项连同隐藏子项一并丢弃）
      const oldParent = getFirstMenuItem()
      const newParent = document.createElement('web-ui-dropdown-item')
      newParent.setAttribute('submenu', '')
      newParent.textContent = '导出'
      const nested = document.createElement('web-ui-dropdown-item')
      nested.textContent = 'DOCX'
      newParent.appendChild(nested)
      oldParent.replaceWith(newParent)

      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(el.isOpen).toBe(true)
      expect(nested.getAttribute('slot')).toBe('context-menu-hidden')

      // 新父项仍可打开子菜单
      newParent.click()
      await waitForUpdate(el)
      expect(getSubmenu()?.textContent).toContain('DOCX')

      cleanupElement(el)
    })

    it('打开期间宿主新增顶层项，刷新后进入 portal 内容', async () => {
      const el = createContextMenu({}, '<web-ui-dropdown-item>编辑</web-ui-dropdown-item>')
      await waitForUpdate(el)
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const freshItem = document.createElement('web-ui-dropdown-item')
      freshItem.textContent = '复制'
      el.appendChild(freshItem)

      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(el.isOpen).toBe(true)
      expect(getMenuItems().map(item => item.textContent?.trim())).toContain('复制')

      cleanupElement(el)
    })
  })

  describe('生命周期', () => {
    it('打开期间脱离文档后重连，状态复位且菜单可重新打开', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)
      el.openAt(100, 100)
      await waitForMenuOpen(el)
      expect(el.isOpen).toBe(true)

      // detach-while-open：菜单开着时移出文档再挂回
      el.remove()
      document.body.appendChild(el)
      await waitForUpdate(el)

      expect(el.isOpen).toBe(false)

      // 重连后 openAt 走全新打开路径，portal 正常重建
      el.openAt(200, 200)
      await waitForMenuOpen(el)
      expect(el.isOpen).toBe(true)
      expect(getMenu()).toBeTruthy()
      expect(getMenuItems().map(item => item.textContent?.trim())).toEqual(['编辑', '复制'])

      cleanupElement(el)
    })
  })

  describe('键盘 ContextMenu 键', () => {
    it('ContextMenu 键打开菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)

      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true }))
      await waitForMenuOpen(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })

    it('Shift+F10 打开菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)

      el.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'F10',
          shiftKey: true,
          bubbles: true
        })
      )
      await waitForMenuOpen(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })
  })

  describe('无障碍', () => {
    it('菜单设置 role="menu"', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)

      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const menu = getMenu()
      expect(menu?.getAttribute('role')).toBe('menu')

      cleanupElement(el)
    })
  })

  describe('边界处理', () => {
    it('右下角边界检测', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)

      el.openAt(9999, 9999)
      await waitForMenuOpen(el)

      const menu = getMenu()!
      expect(menu).toBeTruthy()
      const left = Number.parseInt(menu.style.left)
      const top = Number.parseInt(menu.style.top)
      expect(left).toBeLessThan(window.innerWidth)
      expect(top).toBeLessThan(window.innerHeight)

      cleanupElement(el)
    })

    it('左上角负坐标检测', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)

      el.openAt(-100, -100)
      await waitForMenuOpen(el)

      const menu = getMenu()!
      expect(menu).toBeTruthy()
      const left = Number.parseInt(menu.style.left)
      const top = Number.parseInt(menu.style.top)
      expect(left).toBeGreaterThanOrEqual(0)
      expect(top).toBeGreaterThanOrEqual(0)

      cleanupElement(el)
    })
  })

  describe('滚动锁定', () => {
    it('滚动事件不会关闭已打开的菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)

      el.openAt(100, 100)
      await waitForMenuOpen(el)
      expect(el.isOpen).toBe(true)

      document.dispatchEvent(new Event('scroll'))
      await waitForUpdate(el)
      expect(el.isOpen).toBe(true)

      cleanupElement(el)
    })
  })

  describe('条件渲染边界', () => {
    it('关闭状态把注释锚点替换为 wrapper 后，新成员进入菜单', async () => {
      const el = createContextMenu({}, '<!--items--><web-ui-dropdown-item>编辑</web-ui-dropdown-item>')
      await waitForUpdate(el)

      const comment = [...el.childNodes].find(node => node.nodeType === Node.COMMENT_NODE) as Comment
      const wrapper = document.createElement('div')
      wrapper.innerHTML = '<web-ui-dropdown-item>复制</web-ui-dropdown-item>'
      el.replaceChild(wrapper, comment)
      await waitForUpdate(el)

      el.openAt(100, 100)
      await waitForMenuOpen(el)

      expect(getMenuItems().map(item => item.textContent?.trim())).toEqual(['复制', '编辑'])

      cleanupElement(el)
    })

    it('打开时删除 wrapper 后立即从菜单移除成员', async () => {
      const el = createContextMenu(
        {},
        '<web-ui-dropdown-item>编辑</web-ui-dropdown-item><div><web-ui-dropdown-item>复制</web-ui-dropdown-item></div>'
      )
      await waitForUpdate(el)
      const wrapper = el.querySelector('div')!
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      wrapper.remove()
      await waitForMenuClose(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(getMenuItems().map(item => item.textContent?.trim())).toEqual(['编辑'])

      cleanupElement(el)
    })

    it('打开时删除嵌套子菜单 wrapper 后同步移除子成员', async () => {
      const el = createContextMenu(
        {},
        '<web-ui-dropdown-item submenu>导出<div><web-ui-dropdown-item>PDF</web-ui-dropdown-item></div></web-ui-dropdown-item>'
      )
      await waitForUpdate(el)

      const wrapper = el.querySelector('web-ui-dropdown-item div')!
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      getFirstMenuItem().click()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      wrapper.remove()
      await waitForUpdate(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(getSubmenu()?.querySelectorAll('web-ui-dropdown-item')).toHaveLength(0)

      cleanupElement(el)
    })
  })
})
