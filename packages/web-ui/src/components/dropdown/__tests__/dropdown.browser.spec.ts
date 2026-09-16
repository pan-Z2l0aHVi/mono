import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import '@/components/drawer'
import '@/components/popover'
import type { WebUiPopover } from '@/components/popover'

import '..'
import { getMenuPanels, getPortalPanels, queryA11y } from '@/shared/test-utils'

import type { WebUiDropdown } from '..'

const SUBMENU =
  '<button slot="trigger">Menu</button><web-ui-dropdown-item submenu>Export<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'

const SIMPLE = '<button slot="trigger">Menu</button><web-ui-dropdown-item>Open</web-ui-dropdown-item>'

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

// drawer/dialog 的入场由多帧 rAF + presence 驱动，时钟时长不可依赖；
// 轮询到确定性信号（面板挂载）为止，避免固定 sleep 的竞态。
async function waitFor(predicate: () => boolean, message: string): Promise<void> {
  const deadline = performance.now() + 1000
  while (performance.now() < deadline) {
    if (predicate()) return
    await nextFrame()
  }
  throw new Error(message)
}

/** 焦点是组件内部元素时可观察的焦点落点（文档级 activeElement 会重定位到宿主）。 */
function focusedControl(host: HTMLElement): Element | null {
  return queryA11y(host, '[role="menuitem"]')
}

afterEach(() => document.body.replaceChildren())

describe('WebUiDropdown 组件（浏览器）', () => {
  it('直接设置 open 时以即时状态显示根菜单', async () => {
    const menu = document.createElement('web-ui-dropdown')
    menu.innerHTML = SIMPLE
    document.body.append(menu)
    await menu.updateComplete

    menu.open = true
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    // 「即时」指不经入场过渡；可观察后果是菜单面板已就位且带 aria 语义。
    const panels = getMenuPanels()
    expect(menu.open).toBe(true)
    expect(panels).toHaveLength(1)
    expect(panels[0]?.getAttribute('role')).toBe('menu')
    expect(panels[0]?.textContent).toContain('Open')
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

      expect(getMenuPanels()).toHaveLength(1)

      await nextFrame()

      const parentItem = getMenuPanels()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
      parentItem?.click()
      await nextFrame()
      await nextFrame()

      const panels = getMenuPanels()
      expect(panels).toHaveLength(2)
      expect(panels[1]?.textContent).toContain('PDF')
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Element web-ui-dropdown scheduled an update'))
    } finally {
      warn.mockRestore()
    }
  })

  it('根菜单打开后同帧卸载不重建 panel 或焦点', async () => {
    const menu = document.createElement('web-ui-dropdown')
    menu.innerHTML = SIMPLE
    document.body.append(menu)
    await menu.updateComplete

    menu.open = true
    await menu.updateComplete
    menu.remove()
    await nextFrame()
    await nextFrame()

    expect(getMenuPanels()).toHaveLength(0)
    expect(document.activeElement).toBe(document.body)
  })

  it('子菜单打开后同帧卸载不重建子面板', async () => {
    const menu = document.createElement('web-ui-dropdown')
    menu.innerHTML = SUBMENU
    document.body.append(menu)
    await menu.updateComplete

    menu.open = true
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const parentItem = getMenuPanels()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
    parentItem?.click()
    await menu.updateComplete
    menu.remove()
    await nextFrame()
    await nextFrame()

    expect(getMenuPanels()).toHaveLength(0)
  })

  it('dropdown panel 内的嵌套子 overlay 不会被 outside click 关闭', async () => {
    const menu = document.createElement('web-ui-dropdown')
    menu.innerHTML = `
      <button slot="trigger">Menu</button>
      <web-ui-dropdown-item>
        Actions
        <web-ui-popover portal>
          <button slot="trigger">Nested</button>
          <div>Nested panel</div>
        </web-ui-popover>
      </web-ui-dropdown-item>
    `
    document.body.append(menu)
    await menu.updateComplete

    menu.open = true
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const nested = getMenuPanels()[0]?.querySelector<WebUiPopover>('web-ui-popover')
    expect(nested).toBeTruthy()
    nested!.show()
    await nested!.updateComplete
    await nextFrame()

    const nestedPanel = getPortalPanels('dialog').find(panel => panel.textContent?.includes('Nested panel'))
    expect(nestedPanel).toBeTruthy()
    nestedPanel?.click()
    await menu.updateComplete
    await nested!.updateComplete

    expect(menu.open).toBe(true)
    expect(nested!.open).toBe(true)

    document.body.click()
    await menu.updateComplete
    await nested!.updateComplete
    expect(menu.open).toBe(false)
    expect(nested!.open).toBe(false)
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
    const parentItem = getMenuPanels()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
    const parentControl = parentItem ? (focusedControl(parentItem) as HTMLElement | null) : null
    parentControl?.focus()
    expect(parentItem?.shadowRoot?.activeElement, '父项内部的 menuitem 应取得焦点').toBe(parentControl)

    parentItem?.click()
    await nextFrame()
    await nextFrame()
    await nextFrame()
    await nextFrame()

    expect(getMenuPanels()).toHaveLength(2)
    expect(getMenuPanels()[1]?.textContent).toContain('PDF')

    const submenuItem = getMenuPanels()[1]?.querySelector<HTMLElement>('web-ui-dropdown-item')
    const submenuControl = submenuItem ? (focusedControl(submenuItem) as HTMLElement | null) : null
    expect(submenuItem).toBeTruthy()
    expect(submenuControl).toBeTruthy()

    submenuControl!.focus()
    submenuControl!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }))
    const closingSubmenu = getMenuPanels()[1]
    closingSubmenu?.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity', bubbles: true }))
    await nextFrame()
    await nextFrame()

    expect(getMenuPanels()).toHaveLength(1)

    parentControl!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    await nextFrame()
    await nextFrame()

    const reopened = getMenuPanels()
    expect(reopened).toHaveLength(2)
    expect(reopened[1]?.hasAttribute('hidden')).toBe(false)
    expect(reopened[1]?.textContent).toContain('PDF')
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

    const parentItem = getMenuPanels()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
    const parentControl = parentItem ? (focusedControl(parentItem) as HTMLElement | null) : null
    expect(parentControl).toBeTruthy()
    parentItem?.click()
    await nextFrame()
    await nextFrame()

    const submenu = getMenuPanels()[1]
    const submenuItem = submenu?.querySelector<HTMLElement>('web-ui-dropdown-item')
    const submenuControl = submenuItem ? (focusedControl(submenuItem) as HTMLElement | null) : null
    expect(submenuControl).toBeTruthy()

    submenuControl!.focus()
    submenuControl!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }))

    // 退场进行中被重新打开：面板不得被销毁，且最终仍可见。
    parentControl!.focus()
    parentControl!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    submenu?.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity', bubbles: true }))
    await nextFrame()
    await nextFrame()

    const panels = getMenuPanels()
    expect(panels).toHaveLength(2)
    expect(panels[1]?.hasAttribute('hidden')).toBe(false)
    expect(panels[1]?.textContent).toContain('PDF')
  })
})

describe('WebUiDropdown 在已打开原生 dialog 内（top layer）', () => {
  it('overlay 面板挂载到 dialog 内而非普通 overlay 容器，进入 top layer', async () => {
    const drawer = document.createElement('web-ui-drawer')
    const menu = document.createElement('web-ui-dropdown')
    menu.innerHTML = '<button slot="trigger">Open with</button><web-ui-dropdown-item>Default</web-ui-dropdown-item>'
    drawer.append(menu)
    document.body.append(drawer)
    await drawer.updateComplete
    await menu.updateComplete

    const drawerDialog = drawer.shadowRoot?.querySelector('dialog')
    if (!drawerDialog) throw new Error('Expected the drawer to contain a dialog')

    drawer.open = true
    await drawer.updateComplete
    await waitFor(() => drawerDialog.open, 'Expected the drawer dialog to open')

    menu.open = true
    await menu.updateComplete
    await waitFor(
      () => drawerDialog.querySelector('[role="menu"]') !== null,
      'Expected the dropdown menu to mount inside the drawer dialog'
    )

    // 面板应被挂到 drawer 的 dialog 上（top layer），而不是 fallback/theme-owned overlay 容器。
    expect(drawerDialog.querySelector('[role="menu"]')).toBeTruthy()
    // 普通 overlay 容器内不应出现该面板。
    expect(getMenuPanels()).toHaveLength(0)
  })
})
