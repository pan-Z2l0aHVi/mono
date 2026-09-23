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

  it('打开状态下重挂载会重建面板并把焦点交还菜单', async () => {
    /*
     * issue #120：`open` 是公开 prop，卸载不会改写它，而 Lit 在 detach 期间不记
     * changedProperties，所以重连后 `updated()` 不再命中 open 分支。真实引擎里验证的是
     * 用户可观测后果：面板重新存在、焦点落回首项、方向键重新可用 —— 不读 `_overlays`，
     * 也不测哪个生命周期回调被调用。
     */
    const menu = document.createElement('web-ui-dropdown')
    menu.innerHTML =
      '<button slot="trigger">Menu</button><web-ui-dropdown-item>One</web-ui-dropdown-item><web-ui-dropdown-item>Two</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.open = true
    await menu.updateComplete
    await waitFor(() => getMenuPanels().length === 1, '根菜单面板应挂载')

    menu.remove()
    await nextFrame()
    expect(getMenuPanels()).toHaveLength(0)

    document.body.append(menu)
    await waitFor(() => getMenuPanels().length === 1, '重挂载后应重建根菜单面板')
    await nextFrame()

    const items = [...(getMenuPanels()[0]?.querySelectorAll<HTMLElement>('web-ui-dropdown-item') ?? [])]
    expect(items).toHaveLength(2)
    // 面板挂在 overlay root 的 shadow 里，文档级 activeElement 只会重定位到那个 root；
    // 焦点落点因此认项内控件（见 focusedControl）。
    const firstControl = items[0] ? (focusedControl(items[0]) as HTMLElement | null) : null
    expect(firstControl, '首项应有可聚焦的内部控件').toBeTruthy()
    expect(items[0]?.shadowRoot?.activeElement, '重挂载后焦点应回到首个可用菜单项').toBe(firstControl)

    firstControl?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }))
    await nextFrame()
    const secondControl = items[1] ? (focusedControl(items[1]) as HTMLElement | null) : null
    expect(items[1]?.shadowRoot?.activeElement, 'ArrowDown 应把焦点移到下一项').toBe(secondControl)
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

  /*
   * 退场被打断时 `_closeRootAfterPresence` 提前 return，面板留在 DOM 里，而关闭分支已经
   * 撤销了登记。重开必须补登记：claim 根面板，并把仍在场的子层重新 adopt 回新会话子树。
   * 否则子菜单面板虽然可见，却落在根句柄子树之外，`contains` 判 false，点它的内部会被
   * document 上的守卫当成外部点击，把整张菜单关掉 —— 子菜单项因此点不动。
   *
   * 退场过渡被刻意拉长，把「退场进行中重开」这个窗口钉成确定性的。
   */
  it('退场窗口内重开后，仍在场的子菜单面板内点击不关闭整张菜单', async () => {
    const menu = document.createElement('web-ui-dropdown')
    menu.innerHTML = SUBMENU
    document.body.append(menu)
    await menu.updateComplete

    menu.openMenu()
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    const [rootPanel] = getMenuPanels()
    expect(rootPanel).toBeDefined()
    rootPanel!.style.transition = 'opacity 5s'

    // 点开子菜单：子层挂进根句柄子树。
    rootPanel?.querySelector<HTMLElement>('web-ui-dropdown-item')?.click()
    await nextFrame()
    await nextFrame()
    expect(getMenuPanels()).toHaveLength(2)
    const submenuPanel = getMenuPanels()[1]

    menu.closeAll()
    await menu.updateComplete
    await nextFrame()

    menu.openMenu()
    await menu.updateComplete
    await nextFrame()
    await menu.updateComplete
    await nextFrame()

    expect(getMenuPanels()[0]).toBe(rootPanel)
    expect(getMenuPanels()[1]).toBe(submenuPanel)
    expect(menu.open).toBe(true)

    submenuPanel?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await menu.updateComplete
    expect(menu.open).toBe(true)
  })

  /*
   * 同源的第二个入口：`open` 属性路径不经过 `openMenu()`，claim 必须由复用分支自己补。
   * 否则会出现「`open === true` + 面板可见 + 句柄为 null」—— 模块的核心不变量被破坏，
   * 且点面板内部立刻关闭整张菜单。同一组件两个公开入口一个正常、一个彻底无登记。
   *
   * 退场过渡被刻意拉长，把「退场进行中重开」这个窗口钉成确定性的；否则退场会在下一帧
   * 之前结束、面板被销毁，走的就不是复用分支了。
   */
  it('退场窗口内经 open 属性重开时仍保持登记：面板内点击不关闭菜单', async () => {
    const menu = document.createElement('web-ui-dropdown')
    menu.innerHTML = SIMPLE
    document.body.append(menu)
    await menu.updateComplete

    menu.openMenu()
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    const [rootPanel] = getMenuPanels()
    expect(rootPanel).toBeDefined()
    rootPanel!.style.transition = 'opacity 5s'

    menu.closeAll()
    await menu.updateComplete
    await nextFrame()

    // 框架把 open 绑到响应式属性的常见形态：走 updated() 的 scheduleFrame 分支。
    menu.open = true
    await menu.updateComplete
    await nextFrame()
    await menu.updateComplete
    await nextFrame()

    expect(getMenuPanels()[0]).toBe(rootPanel)
    expect(menu.open).toBe(true)

    rootPanel?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await menu.updateComplete
    expect(menu.open).toBe(true)
  })

  /*
   * 重挂的第三个来源：收尾栈。`_closeSubmenuFrom` 的非即时路径把子菜单面板移出 `_overlays`
   * 之后，只剩收尾栈还记得它 —— 面板仍在 DOM 里、仍在退场中。根重开时若只重挂 `_overlays`，
   * 这块面板就落在根句柄子树之外，点它内部照样把整张菜单关掉。
   *
   * 与上面两条的分工：它们走 `closeAll()`，子菜单留在 `_overlays` 里，判别的是第一重循环；
   * 本条先用 ArrowLeft 把子菜单推进收尾栈，再在根的退场窗口内重开，判别的是
   * `_claimRoot` 的第二重循环。两次重开都必须发生，缺一条循环即转红。
   *
   * 两个面板的过渡都被拉长：根的 5s 钉住「退场窗口内重开」这个窗口，子菜单的 5s 阻止它在
   * 被重挂之前就走完退场、从收尾栈里被销毁（那样走的是全新构建，不再是本条要覆盖的路径）。
   */
  it('退场窗口内重开后，收尾中的子菜单面板内点击不关闭整张菜单', async () => {
    const menu = document.createElement('web-ui-dropdown')
    menu.innerHTML = SUBMENU
    document.body.append(menu)
    await menu.updateComplete

    menu.openMenu()
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    const [rootPanel] = getMenuPanels()
    expect(rootPanel).toBeDefined()
    rootPanel!.style.transition = 'opacity 5s'

    rootPanel?.querySelector<HTMLElement>('web-ui-dropdown-item')?.click()
    await nextFrame()
    await nextFrame()
    const submenuPanel = getMenuPanels()[1]
    expect(submenuPanel).toBeDefined()
    submenuPanel!.style.transition = 'opacity 5s'

    // ArrowLeft 走非即时关闭路径：子菜单面板进收尾栈，而不是留在 `_overlays`。
    const submenuItem = submenuPanel!.querySelector<HTMLElement>('web-ui-dropdown-item')
    const submenuControl = submenuItem ? (focusedControl(submenuItem) as HTMLElement | null) : null
    expect(submenuControl).toBeTruthy()
    submenuControl!.focus()
    submenuControl!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }))
    await nextFrame()
    await nextFrame()
    expect(getMenuPanels()).toHaveLength(2)

    menu.closeAll()
    await menu.updateComplete
    await nextFrame()

    menu.openMenu()
    await menu.updateComplete
    await nextFrame()
    await menu.updateComplete
    await nextFrame()

    expect(getMenuPanels()[0]).toBe(rootPanel)
    expect(getMenuPanels()[1]).toBe(submenuPanel)
    expect(menu.open).toBe(true)

    submenuPanel?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await menu.updateComplete
    expect(menu.open).toBe(true)
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

    expect(drawerDialog.querySelector('[role="menu"]')).toBeTruthy()
    expect(getMenuPanels()).toHaveLength(0)
  })
})
