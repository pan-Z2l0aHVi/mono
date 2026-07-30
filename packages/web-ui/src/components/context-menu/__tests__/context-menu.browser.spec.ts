import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import type { WebUiContextMenu } from '..'

const SUBMENU =
  '<web-ui-dropdown-item submenu>Export<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'

function getMenus(): HTMLElement[] {
  const root = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
  return Array.from(root?.querySelectorAll<HTMLElement>('[role="menu"]') ?? [])
}

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

afterEach(() => document.body.replaceChildren())

describe('WebUiContextMenu（浏览器）', () => {
  it('openAt() 以即时状态显示根菜单', async () => {
    const menu = document.createElement('web-ui-context-menu') as WebUiContextMenu
    menu.innerHTML = '<web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()

    expect(getMenus()[0]?.dataset.wuiPresence).toBe('open')
  })

  it('指针右键以入场状态打开根菜单', async () => {
    const menu = document.createElement('web-ui-context-menu') as WebUiContextMenu
    menu.innerHTML = '<web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 100, clientY: 100 }))
    await menu.updateComplete
    await nextFrame()

    expect(getMenus()[0]?.dataset.wuiPresence).toBe('entering')
  })

  it('键盘打开后，子菜单在退出中重新打开仍可用', async () => {
    const menu = document.createElement('web-ui-context-menu') as WebUiContextMenu
    menu.innerHTML = SUBMENU
    document.body.append(menu)
    await menu.updateComplete

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true, composed: true }))
    await menu.updateComplete
    await nextFrame()

    expect(getMenus()[0]?.dataset.wuiPresence).toBe('open')

    await nextFrame()

    const parentItem = getMenus()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
    parentItem?.click()
    await nextFrame()
    await nextFrame()

    expect(menu.isOpen).toBe(true)
    expect(getMenus()).toHaveLength(2)
    expect(getMenus()[1]?.textContent).toContain('PDF')

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
    parentItem?.click()
    await nextFrame()

    expect(getMenus()).toHaveLength(2)
    expect(getMenus()[1]?.hasAttribute('hidden')).toBe(false)
    expect(getMenus()[1]?.textContent).toContain('PDF')
  })
})
