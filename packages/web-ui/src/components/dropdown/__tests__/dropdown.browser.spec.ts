import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import '@/components/drawer'
import '@/components/dropdown-item'
import '@/components/popover'
import type { WebUiPopover } from '@/components/popover'

import '..'
import { getMenuPanels, getPortalPanels, queryA11y } from '@/shared/test-utils'

import type { WebUiDropdown } from '..'

const SUBMENU =
  '<button slot="trigger">Menu</button><web-ui-dropdown-item submenu>Export<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'

const SIMPLE = '<button slot="trigger">Menu</button><web-ui-dropdown-item>Open</web-ui-dropdown-item>'
const TWO_ITEMS =
  '<button slot="trigger">Menu</button><web-ui-dropdown-item>One</web-ui-dropdown-item><web-ui-dropdown-item>Two</web-ui-dropdown-item>'

/** 打开后的根面板菜单项（面板在 overlay 容器上，不在宿主 shadow 内）。 */
function openRootItems(): HTMLElement[] {
  return [...(getMenuPanels()[0]?.querySelectorAll<HTMLElement>('web-ui-dropdown-item') ?? [])]
}

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

/** 焦点落点：面板挂在 overlay root 的 shadow 里，文档级 activeElement 会重定位到那个 root。 */
const focusedControl = (host: HTMLElement): HTMLElement | null =>
  queryA11y(host, '[role="menuitem"]') as HTMLElement | null

function createDropdown(innerHTML: string): WebUiDropdown {
  const menu = document.createElement('web-ui-dropdown')
  menu.innerHTML = innerHTML
  document.body.append(menu)
  return menu
}

/** 指针点击合成的 click 带 detail>=1；键盘 Enter/Space 激活的 click 带 detail===0。 */
const clickEvent = (detail: number): MouseEvent => new MouseEvent('click', { bubbles: true, composed: true, detail })

/** 打开后的根面板条目；面板尚未挂载时抛错，而不是静默返回空数组让断言失去意义。 */
function requireRootItem(): HTMLElement {
  const item = getMenuPanels()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
  if (!item) throw new Error('根菜单面板未挂载或没有菜单项')
  return item
}

/** 指定面板内的条目；面板或条目缺失时抛错，标出是哪一层没到位。 */
function requireItemIn(panel: HTMLElement | undefined, label: string): HTMLElement {
  const item = panel?.querySelector<HTMLElement>('web-ui-dropdown-item')
  if (!item) throw new Error(`${label}面板未挂载或没有菜单项`)
  return item
}

afterEach(() => document.body.replaceChildren())

describe('WebUiDropdown 组件（浏览器）', () => {
  it('直接设置 open 时根菜单就位且带菜单语义', async () => {
    const menu = createDropdown(SIMPLE)
    await menu.updateComplete

    menu.open = true
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const panels = getMenuPanels()
    expect(menu.open).toBe(true)
    expect(panels).toHaveLength(1)
    expect(panels[0]?.getAttribute('role')).toBe('menu')
    expect(panels[0]?.textContent).toContain('Open')
  })

  /*
   * 菜单打开后焦点落在首项上，但指针点击不该让 focus ring 亮起来——那会让「点开菜单」
   * 看起来像键盘导航。判定用 `:focus-visible` 匹配与计算背景色，不读抑制标记本身。
   *
   * 合成的 click 不更新 Chromium 的模态启发式，程序化 focus 仍匹配 :focus-visible ——
   * 与 WKWebView 实际出问题的渲染条件同构，所以 accent 的有无只可能由抑制逻辑决定。
   */
  it('指针点击打开时首项抑制 focus-visible accent，方向键后恢复', async () => {
    const menu = createDropdown(TWO_ITEMS)
    await menu.updateComplete

    menu.querySelector<HTMLButtonElement>('button')?.dispatchEvent(clickEvent(1))
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const items = openRootItems()
    expect(items[0]?.shadowRoot?.activeElement).toBe(focusedControl(items[0]!))
    expect(focusedControl(items[0]!)?.matches(':focus-visible')).toBe(true)
    expect(getComputedStyle(focusedControl(items[0]!)!).backgroundColor).not.toBe('rgb(0, 136, 255)')

    await userEvent.keyboard('{ArrowDown}')
    await nextFrame()

    expect(items[1]?.shadowRoot?.activeElement).toBe(focusedControl(items[1]!))
    expect(getComputedStyle(focusedControl(items[1]!)!).backgroundColor).toBe('rgb(0, 136, 255)')

    await userEvent.keyboard('{ArrowUp}')
    await nextFrame()

    expect(items[0]?.shadowRoot?.activeElement).toBe(focusedControl(items[0]!))
    expect(getComputedStyle(focusedControl(items[0]!)!).backgroundColor).toBe('rgb(0, 136, 255)')
  })

  it('键盘激活打开时首项保留 focus-visible accent', async () => {
    const menu = createDropdown(TWO_ITEMS)
    await menu.updateComplete

    menu.querySelector<HTMLButtonElement>('button')?.dispatchEvent(clickEvent(0))
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const items = openRootItems()
    expect(items[0]?.shadowRoot?.activeElement).toBe(focusedControl(items[0]!))
    expect(focusedControl(items[0]!)?.matches(':focus-visible')).toBe(true)
    expect(getComputedStyle(focusedControl(items[0]!)!).backgroundColor).toBe('rgb(0, 136, 255)')
  })

  // 上一会话的手势模态不能漏到下一会话：属性驱动的打开没有手势信息，必须回到默认口径。
  it('声明式 open 打开不沿用上一次键盘会话的 focus 模态', async () => {
    const menu = createDropdown(TWO_ITEMS)
    await menu.updateComplete

    menu.querySelector<HTMLButtonElement>('button')?.dispatchEvent(clickEvent(0))
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    expect(getComputedStyle(focusedControl(openRootItems()[0]!)!).backgroundColor).toBe('rgb(0, 136, 255)')

    menu.closeAll()
    await menu.updateComplete
    await waitFor(() => getMenuPanels().length === 0, 'Expected the dropdown to finish closing')

    menu.open = true
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    expect(getComputedStyle(focusedControl(openRootItems()[0]!)!).backgroundColor).not.toBe('rgb(0, 136, 255)')
  })

  it('指针点击可以打开子菜单', async () => {
    const warn = vi.spyOn(console, 'warn')
    try {
      const menu = createDropdown(SUBMENU)
      await menu.updateComplete

      menu.querySelector<HTMLButtonElement>('button')?.dispatchEvent(clickEvent(1))
      await menu.updateComplete
      await nextFrame()
      expect(getMenuPanels()).toHaveLength(1)

      await nextFrame()
      getMenuPanels()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')?.click()
      await nextFrame()
      await nextFrame()

      expect(getMenuPanels()).toHaveLength(2)
      expect(getMenuPanels()[1]?.textContent).toContain('PDF')
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Element web-ui-dropdown scheduled an update'))
    } finally {
      warn.mockRestore()
    }
  })

  // 组件被卸载时面板必须跟着消失，焦点交还页面；否则用户会困在一个空浮层里。
  it('根菜单打开后同帧卸载不重建面板或焦点', async () => {
    const menu = createDropdown(SIMPLE)
    await menu.updateComplete

    menu.open = true
    await menu.updateComplete
    menu.remove()
    await nextFrame()
    await nextFrame()

    expect(getMenuPanels()).toHaveLength(0)
    expect(document.activeElement).toBe(document.body)
  })

  /*
   * issue #120：`open` 是公开 prop，卸载不会改写它，而 Lit 在 detach 期间不记
   * changedProperties，所以重连后 `updated()` 不再命中 open 分支。真实引擎里验证的是
   * 用户可观测后果：面板重新存在、焦点落回首项、方向键重新可用。
   */
  it('打开状态下重挂载会重建面板并把焦点交还菜单', async () => {
    const menu = createDropdown(TWO_ITEMS)
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

    const items = openRootItems()
    expect(items).toHaveLength(2)
    const firstControl = focusedControl(items[0]!)
    expect(firstControl, '首项应有可聚焦的内部控件').toBeTruthy()
    expect(items[0]?.shadowRoot?.activeElement, '重挂载后焦点应回到首个可用菜单项').toBe(firstControl)

    firstControl?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }))
    await nextFrame()
    expect(items[1]?.shadowRoot?.activeElement, 'ArrowDown 应把焦点移到下一项').toBe(focusedControl(items[1]!))
  })

  it('子菜单打开后同帧卸载不重建子面板', async () => {
    const menu = createDropdown(SUBMENU)
    await menu.updateComplete

    menu.open = true
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    getMenuPanels()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')?.click()
    await menu.updateComplete
    menu.remove()
    await nextFrame()
    await nextFrame()

    expect(getMenuPanels()).toHaveLength(0)
  })

  it('dropdown panel 内的嵌套 overlay 点击不被当成外部点击', async () => {
    const menu = createDropdown(`
      <button slot="trigger">Menu</button>
      <web-ui-dropdown-item>
        Actions
        <web-ui-popover portal>
          <button slot="trigger">Nested</button>
          <div>Nested panel</div>
        </web-ui-popover>
      </web-ui-dropdown-item>
    `)
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

  // 键盘用户要能用方向键开合子菜单：ArrowRight 进入、ArrowLeft 退回父级。
  it('键盘语义激活可以关闭并重新打开子菜单', async () => {
    const menu = createDropdown(SUBMENU)
    await menu.updateComplete

    menu.querySelector<HTMLButtonElement>('button')?.click()
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const parentItem = requireRootItem()
    const parentControl = focusedControl(parentItem)!
    parentControl.focus()
    expect(parentItem.shadowRoot?.activeElement, '父项内部的 menuitem 应取得焦点').toBe(parentControl)

    parentItem.click()
    for (let frame = 0; frame < 4; frame++) await nextFrame()

    expect(getMenuPanels()).toHaveLength(2)
    expect(getMenuPanels()[1]?.textContent).toContain('PDF')

    const submenuControl = focusedControl(requireItemIn(getMenuPanels()[1], '子菜单'))!
    submenuControl.focus()
    submenuControl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }))
    getMenuPanels()[1]?.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity', bubbles: true }))
    await nextFrame()
    await nextFrame()

    expect(getMenuPanels()).toHaveLength(1)

    parentControl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    await nextFrame()
    await nextFrame()

    const reopened = getMenuPanels()
    expect(reopened).toHaveLength(2)
    expect(reopened[1]?.hasAttribute('hidden')).toBe(false)
    expect(reopened[1]?.textContent).toContain('PDF')
  })

  it('子菜单退出过渡中可以被键盘重新打开', async () => {
    const menu = createDropdown(SUBMENU)
    await menu.updateComplete

    menu.querySelector<HTMLButtonElement>('button')?.click()
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const parentItem = requireRootItem()
    const parentControl = focusedControl(parentItem)!
    parentItem.click()
    await nextFrame()
    await nextFrame()

    const submenu = getMenuPanels()[1]
    const submenuControl = focusedControl(requireItemIn(submenu, '子菜单'))!

    submenuControl.focus()
    submenuControl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }))

    parentControl.focus()
    parentControl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    submenu?.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity', bubbles: true }))
    await nextFrame()
    await nextFrame()

    const panels = getMenuPanels()
    expect(panels).toHaveLength(2)
    expect(panels[1]?.hasAttribute('hidden')).toBe(false)
    expect(panels[1]?.textContent).toContain('PDF')
  })

  /*
   * 退场被打断时面板留在 DOM 里，而关闭分支已经撤销了登记。重开必须补登记：把仍在场
   * 的子层重新挂回新会话子树。否则子菜单项可见却落在根句柄子树之外，点它会被 document
   * 上的守卫当成外部点击，把整张菜单关掉——子菜单项因此点不动。
   *
   * 退场过渡被刻意拉长，把「退场进行中重开」这个窗口钉成确定性的。
   */
  it('退场窗口内重开后，仍在场的子菜单面板内点击不关闭整张菜单', async () => {
    const menu = createDropdown(SUBMENU)
    await menu.updateComplete

    menu.openMenu()
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    const [rootPanel] = getMenuPanels()
    expect(rootPanel, '根菜单面板应已挂载').toBeDefined()
    rootPanel!.style.transition = 'opacity 5s'

    // 用 requireRootItem 而非可选链：面板没到位时要响亮失败，而不是静默跳过点击。
    requireRootItem().click()
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
   * 否则会出现「open === true + 面板可见 + 句柄为 null」，且点面板内部立刻关闭整张菜单：
   * 同一组件两个公开入口一个正常、一个彻底无登记。
   */
  it('退场窗口内经 open 属性重开时仍保持登记：面板内点击不关闭菜单', async () => {
    const menu = createDropdown(SIMPLE)
    await menu.updateComplete

    menu.openMenu()
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    const [rootPanel] = getMenuPanels()
    expect(rootPanel, '根菜单面板应已挂载').toBeDefined()
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
   * 重挂的第三个来源：收尾栈。ArrowLeft 的非即时关闭路径把子菜单面板移出内部集合，
   * 只剩收尾栈还记得它——面板仍在 DOM 里、仍在退场中。根重开时若只重挂当前集合，
   * 这块面板就落在根句柄子树之外，点它内部照样把整张菜单关掉。
   *
   * 与上面两条的分工：那两条走 `closeAll()`，子菜单留在集合里；本条先用 ArrowLeft
   * 把子菜单推进收尾栈。两次重开都必须发生，缺一条循环即转红。
   */
  it('退场窗口内重开后，收尾中的子菜单面板内点击不关闭整张菜单', async () => {
    const menu = createDropdown(SUBMENU)
    await menu.updateComplete

    menu.openMenu()
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    const [rootPanel] = getMenuPanels()
    expect(rootPanel, '根菜单面板应已挂载').toBeDefined()
    rootPanel!.style.transition = 'opacity 5s'

    // 用 requireRootItem 而非可选链：面板没到位时要响亮失败，而不是静默跳过点击。
    requireRootItem().click()
    await nextFrame()
    await nextFrame()
    const submenuPanel = getMenuPanels()[1]
    expect(submenuPanel, '子菜单面板应已挂载').toBeDefined()
    submenuPanel!.style.transition = 'opacity 5s'

    // ArrowLeft 走非即时关闭路径：子菜单面板进收尾栈。
    const submenuControl = focusedControl(requireItemIn(submenuPanel, '子菜单'))!
    submenuControl.focus()
    submenuControl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }))
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
  // 已经模态化的 drawer 里的菜单必须挂进那个 dialog（top layer），否则它会被 dialog
  // 自己的裁剪挡住，点击直接穿透到遮罩。
  it('面板挂载到 dialog 内而非普通 overlay 容器', async () => {
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
