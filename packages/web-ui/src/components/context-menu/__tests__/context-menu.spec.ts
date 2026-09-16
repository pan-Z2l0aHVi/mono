import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
// 全量构建的 vue：含运行时模板编译器，用于真实 v-if 翻转（false 分支产生注释锚点）
import { createApp, ref } from 'vue/dist/vue.esm-bundler.js'

import '..'
import { cleanupElement, getMenuPanels, pollUntil, waitForUpdate } from '@/shared/test-utils'

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

  const deadline = performance.now() + 1000
  let menu = getMenu()
  while (performance.now() < deadline && (!menu?.style.left || !menu?.style.top)) {
    await new Promise(resolve => requestAnimationFrame(resolve))
    await el.updateComplete
    menu = getMenu()
  }
  if (!menu?.style.left || !menu?.style.top) {
    throw new Error('Expected the context menu to be positioned')
  }
}

async function waitForMenuClose(el: WebUiContextMenu) {
  await el.updateComplete
  await pollUntil(() => !el.isOpen && !getMenu(), 'Expected the context menu to close and dispose')
}

function sameOrder(actual: unknown[], expected: unknown[]) {
  return JSON.stringify(actual) === JSON.stringify(expected)
}

async function waitForMenuItemTexts(expected: string[], read: () => string[]) {
  await pollUntil(() => sameOrder(read(), expected), `Expected menu items to settle to ${expected.join(', ')}`)
}

// 根面板 / 子菜单面板都以公开语义 role="menu" + aria-label 挂载于 overlay 容器，
// 用 @/shared/test-utils 的共享定位器按 aria-label 区分（不再自建 root shadow 直查）。
function getMenu(): HTMLElement | null {
  return getMenuPanels('上下文菜单')[0] ?? null
}

function getSubmenu(): HTMLElement | null {
  return getMenuPanels('子菜单')[0] ?? null
}

// 面板内容容器 = 菜单条目的直接父级（公开 DOM 可查询），不依赖内部 class `.wui-menu-content`。
// 通过任一 `web-ui-dropdown-item` 的 parentElement 定位，避免断言实现态的选择器。
function getPortalContent(): HTMLElement {
  const panel = getMenu()
  const content = panel?.querySelector<HTMLElement>('web-ui-dropdown-item')?.parentElement ?? null
  if (!content) throw new Error('Expected portal content container')
  return content
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
      const x = 100
      const y = 200
      el.openAt(x, y)
      await waitForMenuOpen(el)
      const menu = getMenu()!
      expect(menu).toBeTruthy()
      // R3 例外：openAt(x,y) 的坐标→定位映射是唯一可观察通道，保留精确值断言（非视觉细节）
      expect(menu.style.left).toBe(`${x}px`)
      expect(menu.style.top).toBe(`${y}px`)
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
    // 以下「程序式静默 / 用户手势通知」四条契约已由共享矩阵
    // open-change-contract.spec.ts（web-ui-context-menu 覆盖）等价承接，本文件不再重复。

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

      // R3 例外：滚动锁的文档级副作用是唯一观察面（组件之外的副作用）
      expect(document.documentElement.style.overflow).toBe('')
      expect(document.body.style.position).toBe('')
    })

    it('右键打开菜单', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)

      const x = 100
      const y = 200
      el.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          clientX: x,
          clientY: y
        })
      )
      await waitForMenuOpen(el)

      expect(el.isOpen).toBe(true)
      const menu = getMenu()!
      // R3 例外：右键打开的坐标→定位映射是唯一可观察通道，保留精确值断言
      expect(menu.style.left).toBe(`${x}px`)
      expect(menu.style.top).toBe(`${y}px`)

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

      // R3 例外：滚动锁的文档级副作用是唯一观察面
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

      // R3 例外：滚动锁的文档级副作用是唯一观察面
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

      // R3 例外：打开态阻止外部容器滚动是公开事件的默认行为（组件之外的副作用）
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

  describe('框架直接操作 portal 内容', () => {
    it('框架把新项直接插入 portal，刷新后纳入托管且顺序正确', async () => {
      const el = createContextMenu({}, '<web-ui-dropdown-item>编辑</web-ui-dropdown-item>')
      await waitForUpdate(el)
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      // 模拟 Vue 以 portal 为插入点直接 append 新项（绕过宿主）
      const fresh = document.createElement('web-ui-dropdown-item')
      fresh.textContent = '直插项'
      getPortalContent().appendChild(fresh)

      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(el.isOpen).toBe(true)
      expect(getMenuItems().map(item => item.textContent?.trim())).toEqual(['编辑', '直插项'])
      // R4：纳入托管的可观察后果——关闭后框架直插的新项随其它项一起归还宿主 light DOM（无残留、顺序稳定）
      el.close()
      await waitForMenuClose(el)
      expect([...el.querySelectorAll(':scope > web-ui-dropdown-item')].map(item => item.textContent?.trim())).toEqual([
        '编辑',
        '直插项'
      ])

      cleanupElement(el)
    })

    it('框架卸载 portal 内旧项并以注释锚点与新项替换，刷新后菜单完整', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      // 模拟 Vue v-if 翻转：portal 内「编辑」被替换为注释锚点 + 新元素（插入点 = portal）
      const content = getPortalContent()
      const first = content.querySelector<HTMLElement>('web-ui-dropdown-item')
      if (!first) throw new Error('Expected first menu item')
      const anchor = document.createComment('v-if')
      const fresh = document.createElement('web-ui-dropdown-item')
      fresh.textContent = '找回资源'
      first.replaceWith(anchor, fresh)

      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))

      expect(el.isOpen).toBe(true)
      expect(getMenuItems().map(item => item.textContent?.trim())).toEqual(['找回资源', '复制'])
      // R4：卸载+锚点替换的可观察后果——关闭后旧项被框架卸载、新项与未变项一并归还宿主 light DOM
      el.close()
      await waitForMenuClose(el)
      expect([...el.querySelectorAll(':scope > web-ui-dropdown-item')].map(item => item.textContent?.trim())).toEqual([
        '找回资源',
        '复制'
      ])

      cleanupElement(el)
    })

    it('翻转多次后关闭重开，菜单项完整归还且 content 无残留注释', async () => {
      const el = createContextMenu({}, SIMPLE)
      await waitForUpdate(el)
      el.openAt(100, 100)
      await waitForMenuOpen(el)

      const content = getPortalContent()
      // 第一轮：替换 + 直插
      const first = content.querySelector<HTMLElement>('web-ui-dropdown-item')
      if (!first) throw new Error('Expected first menu item')
      const fresh = document.createElement('web-ui-dropdown-item')
      fresh.textContent = '找回资源'
      first.replaceWith(document.createComment('v-if'), fresh)
      const extra = document.createElement('web-ui-dropdown-item')
      extra.textContent = '直插项'
      content.appendChild(extra)
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve))

      // 关闭归还
      el.close()
      await waitForMenuClose(el)
      await new Promise(resolve => requestAnimationFrame(resolve))

      const restored = [...el.querySelectorAll(':scope > web-ui-dropdown-item')].map(item => item.textContent?.trim())
      expect(restored).toEqual(['找回资源', '复制', '直插项'])
      // R4：关闭后无残留的可观察后果 = 宿主 light DOM 项集合 == 期望项（marker 计数属内部机制，已删除）
      // 框架 v-if 锚点随元素迁回宿主而非被销毁，否则框架持有 detached 引用下次 patch 崩溃
      expect([...content.childNodes]).toHaveLength(0)
      expect([...el.childNodes].some(node => node.nodeType === Node.COMMENT_NODE && node.textContent === 'v-if')).toBe(
        true
      )

      // 重开后菜单完整
      el.openAt(200, 200)
      await waitForMenuOpen(el)
      expect(getMenuItems().map(item => item.textContent?.trim())).toEqual(['找回资源', '复制', '直插项'])

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
      // R3 例外：断言「不出视口」的行为约束（left < innerWidth），而非某个像素值
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
      // R3 例外：断言「不出视口」的行为约束（left >= 0），而非某个像素值
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
      await waitForUpdate(el)
      await waitForMenuItemTexts(['编辑'], () => getMenuItems().map(item => item.textContent?.trim() ?? ''))

      expect(el.isOpen).toBe(true)

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

  describe('Vue v-if 消费者集成（真实渲染器）', () => {
    interface VueMenuFixture {
      broken: { value: boolean }
      menuEl: () => WebUiContextMenu
      hostTexts: () => string[]
      unmount: () => void
    }

    function mountVueMenu(warnings: string[], template?: string): VueMenuFixture {
      const host = document.createElement('div')
      document.body.append(host)
      const broken = ref(false)
      const app = createApp({
        setup() {
          return { broken }
        },
        // 与原型页一致：v-if 切换 valid/broken 菜单项，false 分支产生注释锚点
        template:
          template ??
          `
            <web-ui-context-menu>
              <web-ui-dropdown-item v-if="!broken" key="a">预览</web-ui-dropdown-item>
              <web-ui-dropdown-item v-if="broken" key="b">找回资源</web-ui-dropdown-item>
              <web-ui-dropdown-item key="d">删除</web-ui-dropdown-item>
            </web-ui-context-menu>
          `
      })
      app.config.compilerOptions = {
        isCustomElement: (tag: string) => tag.startsWith('web-ui-')
      }
      app.config.warnHandler = (msg: string) => warnings.push('WARN: ' + msg.slice(0, 120))
      app.config.errorHandler = (err: unknown) => warnings.push('ERROR: ' + String((err as Error)?.message ?? err))
      app.mount(host)
      const getEl = () => {
        const el = host.querySelector('web-ui-context-menu')
        if (!el) throw new Error('Expected context menu element')
        return el
      }
      return {
        broken,
        menuEl: getEl,
        hostTexts: () =>
          [...getEl().querySelectorAll(':scope > web-ui-dropdown-item')].map(item => item.textContent?.trim()),
        unmount: () => app.unmount()
      }
    }

    const nextFrames = () =>
      new Promise(resolve => requestAnimationFrame(resolve)).then(
        () => new Promise(resolve => requestAnimationFrame(resolve))
      )

    it('菜单开着时 v-if 翻转、关闭后锚点迁回宿主，再翻转不崩溃', async () => {
      const warnings: string[] = []
      const fixture = mountVueMenu(warnings)
      try {
        fixture.menuEl().openAt(10, 10)
        await waitForMenuOpen(fixture.menuEl())
        await waitForMenuItemTexts(['预览', '删除'], () => getMenuItems().map(item => item.textContent?.trim() ?? ''))

        // 开着时翻转：valid → broken，注释锚点写进 portal
        fixture.broken.value = true
        await waitForMenuItemTexts(['找回资源', '删除'], () =>
          getMenuItems().map(item => item.textContent?.trim() ?? '')
        )

        // 关闭：元素与框架锚点一并迁回宿主
        fixture.menuEl().close()
        await waitForMenuClose(fixture.menuEl())

        // 再翻转回 valid：Vue 以宿主为容器 patch，不应崩溃
        fixture.broken.value = false
        await nextFrames()
        await waitForMenuItemTexts(['预览', '删除'], () => fixture.hostTexts())

        expect(warnings).toEqual([])
      } finally {
        fixture.menuEl().remove()
        fixture.unmount()
      }
    })

    it('打开态双向 v-if 翻转 + divider 中间插入，content 顺序保持模板序', async () => {
      const warnings: string[] = []
      const fixture = mountVueMenu(
        warnings,
        `
          <web-ui-context-menu>
            <web-ui-dropdown-item v-if="!broken" key="preview">预览</web-ui-dropdown-item>
            <web-ui-dropdown-item v-if="!broken" key="openwith">打开方式</web-ui-dropdown-item>
            <web-ui-dropdown-item v-if="broken" key="recover">找回资源</web-ui-dropdown-item>
            <web-ui-dropdown-divider key="d1"></web-ui-dropdown-divider>
            <web-ui-dropdown-item v-if="!broken" key="tags">管理标签</web-ui-dropdown-item>
            <web-ui-dropdown-divider v-if="!broken" key="d2"></web-ui-dropdown-divider>
            <web-ui-dropdown-item key="del">删除</web-ui-dropdown-item>
          </web-ui-context-menu>
        `
      )
      const el = fixture.menuEl()
      const broken = fixture.broken
      // 读取 portal 内容顺序（项 + 分隔符）：直接在面板内按文档序查询，不依赖内部 class
      const contentOrder = () => {
        const panel = getMenu()
        return Array.from(panel?.querySelectorAll('web-ui-dropdown-item, web-ui-dropdown-divider') ?? []).map(item =>
          item.tagName === 'WEB-UI-DROPDOWN-DIVIDER' ? 'DIV' : item.textContent?.trim()
        )
      }
      try {
        const validOrder = ['预览', '打开方式', 'DIV', '管理标签', 'DIV', '删除']
        const brokenOrder = ['找回资源', 'DIV', '删除']
        const waitForContentOrder = (expected: string[]) =>
          pollUntil(
            () => sameOrder(contentOrder(), expected),
            `Expected context menu content order to settle to ${expected.join(', ')}`
          )

        el.openAt(10, 10)
        await waitForContentOrder(validOrder)

        // 打开态 valid → broken：找回资源 应在无条件 divider 之前
        broken.value = true
        await waitForContentOrder(brokenOrder)

        // 打开态 broken → valid：管理标签与条件 divider 回到无条件 divider 之后
        broken.value = false
        await waitForContentOrder(validOrder)

        // close → reopen：顺序与无锚点残留
        el.close()
        await waitForMenuClose(el)
        el.openAt(20, 20)
        await waitForContentOrder(validOrder)

        expect(warnings).toEqual([])
      } finally {
        el.remove()
        fixture.unmount()
      }
    })

    it('多轮 v-if 翻转+全序锚点断言+reopen 稳定', async () => {
      const warnings: string[] = []
      const fixture = mountVueMenu(
        warnings,
        `
          <web-ui-context-menu>
            <web-ui-dropdown-item v-if="!broken" key="a">预览</web-ui-dropdown-item>
            <web-ui-dropdown-item v-if="!broken" key="b">打开方式</web-ui-dropdown-item>
            <web-ui-dropdown-item v-if="broken" key="c">找回资源</web-ui-dropdown-item>
            <web-ui-dropdown-divider key="d1"></web-ui-dropdown-divider>
            <web-ui-dropdown-item v-if="!broken" key="e">管理标签</web-ui-dropdown-item>
            <web-ui-dropdown-divider v-if="!broken" key="f"></web-ui-dropdown-divider>
            <web-ui-dropdown-item key="g">删除</web-ui-dropdown-item>
          </web-ui-context-menu>
        `
      )
      const el = fixture.menuEl()
      const broken = fixture.broken
      // 全序（派生 itemOrder）：直接在面板内按文档序查询项 + 分隔符，不依赖内部 class
      const fullOrder = () => {
        const panel = getMenu()
        return Array.from(panel?.querySelectorAll('web-ui-dropdown-item, web-ui-dropdown-divider') ?? []).map(item =>
          item.tagName === 'WEB-UI-DROPDOWN-DIVIDER' ? 'DIV' : 'I:' + item.textContent?.trim()
        )
      }
      try {
        const validItems = ['I:预览', 'I:打开方式', 'DIV', 'I:管理标签', 'DIV', 'I:删除']
        const brokenItems = ['I:找回资源', 'DIV', 'I:删除']
        const itemOrder = () => fullOrder()
        const waitForItemOrder = (expected: string[]) =>
          pollUntil(() => sameOrder(itemOrder(), expected), `Expected full order to settle to ${expected.join(', ')}`)

        el.openAt(10, 10)
        await waitForItemOrder(validItems)

        // 两轮连续翻转 + 最后 reopen
        // R4：Vue 的占位注释（#v-if 计数）不是本组件契约，已删除；
        // 改为断言每次翻转后菜单项+分隔符的「顺序/集合稳定」（itemOrder 即等价可观察后果）。
        for (let round = 0; round < 2; round++) {
          broken.value = true
          await waitForItemOrder(brokenItems)

          broken.value = false
          await waitForItemOrder(validItems)
        }

        // close → reopen
        el.close()
        await waitForMenuClose(el)
        el.openAt(20, 20)
        await waitForItemOrder(validItems)

        expect(warnings).toEqual([])
      } finally {
        el.remove()
        fixture.unmount()
      }
    })
  })
})
