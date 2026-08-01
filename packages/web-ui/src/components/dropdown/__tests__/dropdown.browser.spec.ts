import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import '..'
import type { WebUiDropdown } from '..'

const SUBMENU =
  '<button slot="trigger">Menu</button><web-ui-dropdown-item submenu>Export<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'

function getMenus(): HTMLElement[] {
  const root = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
  return Array.from(root?.querySelectorAll<HTMLElement>('[role="menu"]') ?? [])
}

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

afterEach(() => document.body.replaceChildren())

describe('WebUiDropdown 组件（浏览器）', () => {
  it('直接设置 open 时以即时状态显示根菜单', async () => {
    const menu = document.createElement('web-ui-dropdown')
    menu.innerHTML = '<button slot="trigger">Menu</button><web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.open = true
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    expect(getMenus()[0]?.dataset.wuiPresence).toBe('open')
  })

  it('指针点击可以打开子菜单', async () => {
    const warn = vi.spyOn(console, 'warn')
    try {
      const menu = document.createElement('web-ui-dropdown')
      menu.innerHTML = SUBMENU
      document.body.append(menu)
      await menu.updateComplete

      menu
        .querySelector<HTMLButtonElement>('button')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, detail: 1 }))
      await menu.updateComplete
      await nextFrame()

      expect(getMenus()[0]?.dataset.wuiPresence).toBe('entering')

      await nextFrame()

      const parentItem = getMenus()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
      parentItem?.click()
      await nextFrame()
      await nextFrame()

      expect(getMenus()).toHaveLength(2)
      expect(getMenus()[1]?.textContent).toContain('PDF')
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Element web-ui-dropdown scheduled an update'))
    } finally {
      warn.mockRestore()
    }
  })

  it('键盘语义激活可以关闭并重新打开子菜单', async () => {
    const menu = document.createElement('web-ui-dropdown')
    menu.innerHTML = SUBMENU
    document.body.append(menu)
    await menu.updateComplete

    menu.querySelector<HTMLButtonElement>('button')?.click()
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    const parentItem = getMenus()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
    const parentControl = parentItem?.shadowRoot?.querySelector<HTMLElement>('[role="menuitem"]')
    parentControl?.focus()
    expect(parentItem?.shadowRoot?.activeElement).toBe(parentControl)

    parentItem?.click()
    await nextFrame()
    await nextFrame()
    await nextFrame()
    await nextFrame()

    expect(getMenus()).toHaveLength(2)
    expect(getMenus()[1]?.textContent).toContain('PDF')

    const submenuItem = getMenus()[1]?.querySelector<HTMLElement>('web-ui-dropdown-item')
    const submenuControl = submenuItem?.shadowRoot?.querySelector<HTMLElement>('[role="menuitem"]')
    expect(submenuItem).toBeTruthy()
    expect(submenuControl).toBeTruthy()

    submenuControl!.focus()
    submenuControl!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }))
    const closingSubmenu = getMenus()[1]
    closingSubmenu?.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity', bubbles: true }))
    await nextFrame()
    await nextFrame()

    expect(getMenus()).toHaveLength(1)

    parentControl!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    await nextFrame()
    await nextFrame()

    expect(getMenus()).toHaveLength(2)
    expect(getMenus()[1]?.hasAttribute('hidden')).toBe(false)
    expect(getMenus()[1]?.textContent).toContain('PDF')
  })

  it('子菜单退出过渡中可以被键盘重新打开', async () => {
    const menu = document.createElement('web-ui-dropdown')
    menu.innerHTML = SUBMENU
    document.body.append(menu)
    await menu.updateComplete

    menu.querySelector<HTMLButtonElement>('button')?.click()
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const parentItem = getMenus()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
    const parentControl = parentItem?.shadowRoot?.querySelector<HTMLElement>('[role="menuitem"]')
    expect(parentControl).toBeTruthy()
    parentItem?.click()
    await nextFrame()
    await nextFrame()

    const submenu = getMenus()[1]
    const submenuControl = submenu
      ?.querySelector<HTMLElement>('web-ui-dropdown-item')
      ?.shadowRoot?.querySelector<HTMLElement>('[role="menuitem"]')
    expect(submenuControl).toBeTruthy()

    submenuControl!.focus()
    submenuControl!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }))
    expect(submenu?.dataset.wuiPresence).toBe('closing')

    parentControl!.focus()
    parentControl!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    submenu?.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity', bubbles: true }))
    await nextFrame()
    await nextFrame()

    expect(getMenus()).toHaveLength(2)
    expect(getMenus()[1]?.hasAttribute('hidden')).toBe(false)
    expect(getMenus()[1]?.textContent).toContain('PDF')
  })
})
