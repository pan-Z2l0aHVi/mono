import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import '@/components/drawer'
import '@/components/popover'

import '..'
import type { WebUiPopover } from '@/components/popover'

import type { WebUiDropdown } from '..'

const SUBMENU =
  '<button slot="trigger">Menu</button><web-ui-dropdown-item submenu>Export<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'

function getMenus(): HTMLElement[] {
  const root = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
  return Array.from(root?.querySelectorAll<HTMLElement>('[role="menu"]') ?? [])
}

function getPortalPanels(selector: string): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-wui-overlay-root]'))
    .flatMap(root =>
      Array.from(root.shadowRoot?.querySelectorAll<HTMLElement>('[data-wui-overlay-container] > div') ?? [])
    )
    .map(host => host?.shadowRoot?.querySelector<HTMLElement>(selector))
    .filter((panel): panel is HTMLElement => panel instanceof HTMLElement)
}

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

// drawer/dialog 的入场由多帧 rAF + presence 驱动，时钟时长不可依赖；
// 轮询到确定性信号（is-visible / 面板挂载）为止，避免固定 sleep 的竞态。
async function waitFor(predicate: () => boolean, message: string): Promise<void> {
  const deadline = performance.now() + 1000
  while (performance.now() < deadline) {
    if (predicate()) return
    await nextFrame()
  }
  throw new Error(message)
}

async function waitForDrawerVisible(drawer: HTMLElement, drawerDialog: HTMLDialogElement): Promise<void> {
  await waitFor(
    () => drawerDialog.open && drawerDialog.classList.contains('is-visible'),
    'Expected the drawer dialog to become visible'
  )
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

  it('菜单浮层面板使用双层玻璃结构：blur 层 + surface 层各自 opacity 过渡', async () => {
    const menu = document.createElement('web-ui-dropdown')
    menu.innerHTML = '<button slot="trigger">Menu</button><web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.open = true
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const panel = getMenus()[0]!
    // 单层玻璃：wui-glass 在面板自身，背景/阴影/blur 都由面板承担，
    // opacity + backdrop-filter（blur(0px)↔blur(4px)）+ transform 一起过渡。
    expect(panel.classList.contains('wui-glass')).toBe(true)
    expect(getComputedStyle(panel).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(getComputedStyle(panel).transitionProperty).toContain('opacity')
    expect(getComputedStyle(panel).transitionProperty).toContain('backdrop-filter')
    expect(getComputedStyle(panel).transitionProperty).toContain('transform')
    // blur 随 float 过渡（160ms）从 0px 插值到 4px：等待收敛再断言目标态。
    await new Promise(resolve => setTimeout(resolve, 250))
    expect(getComputedStyle(panel).backdropFilter).toContain('blur(4px)')
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

  it('根菜单打开后同帧卸载不重建 panel 或焦点', async () => {
    const menu = document.createElement('web-ui-dropdown')
    menu.innerHTML = '<button slot="trigger">Menu</button><web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.open = true
    await menu.updateComplete
    menu.remove()
    await nextFrame()
    await nextFrame()

    expect(getMenus()).toHaveLength(0)
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

    const parentItem = getMenus()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
    parentItem?.click()
    await menu.updateComplete
    menu.remove()
    await nextFrame()
    await nextFrame()

    expect(getMenus()).toHaveLength(0)
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

    const nested = getMenus()[0]?.querySelector<WebUiPopover>('web-ui-popover')
    expect(nested).toBeTruthy()
    nested!.show()
    await nested!.updateComplete
    await nextFrame()

    const nestedPanel = getPortalPanels('[role="dialog"]').find(panel => panel.textContent?.includes('Nested panel'))
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
    await waitForDrawerVisible(drawer, drawerDialog)

    menu.open = true
    await menu.updateComplete
    await waitFor(
      () => drawerDialog.querySelector('[role="menu"]') !== null,
      'Expected the dropdown menu to mount inside the drawer dialog'
    )

    // 面板应被挂到 drawer 的 dialog 上（top layer），而不是 fallback/theme-owned overlay 容器。
    expect(drawerDialog.querySelector('[role="menu"]')).toBeTruthy()
    // 普通 overlay 容器内不应出现该面板。
    const overlayPanel = document.querySelector('[data-wui-overlay-root]')?.shadowRoot?.querySelector('[role="menu"]')
    expect(overlayPanel).toBeFalsy()
  })
})
