import '..'
import '@/components/drawer'
import '@/components/dropdown-item'
import '@/components/popover'

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import type { WebUiPopover } from '@/components/popover'
import { getMenuPanels, getPortalPanels, queryA11y } from '@/shared/test-utils'

import type { WebUiDropdown } from '..'

const SUBMENU =
  '<button slot="trigger">Menu</button><web-ui-dropdown-item submenu>Export<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'

const SIMPLE = '<button slot="trigger">Menu</button><web-ui-dropdown-item>Open</web-ui-dropdown-item>'
const TWO_ITEMS =
  '<button slot="trigger">Menu</button><web-ui-dropdown-item>One</web-ui-dropdown-item><web-ui-dropdown-item>Two</web-ui-dropdown-item>'

/** 打开后的根 panel menu item（panel 在 overlay 容器上，不在宿主 shadow 内）。 */
function openRootItems(): HTMLElement[] {
  return [...(getMenuPanels()[0]?.querySelectorAll<HTMLElement>('web-ui-dropdown-item') ?? [])]
}

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

// drawer/dialog 的入场由多帧 rAF + presence 驱动，时钟时长不可依赖；
// 轮询到确定性信号（panel 挂载 / 拆卸到位）为止，避免固定 sleep 的竞态。
// `message` 收函数是有意的：诊断里带上期待值的**当前读数**，比只说「超时了」有用。
async function waitFor(predicate: () => boolean, message: string | (() => string)): Promise<void> {
  const deadline = performance.now() + 1000
  while (performance.now() < deadline) {
    if (predicate()) return
    await nextFrame()
  }
  throw new Error(typeof message === 'function' ? message() : message)
}

/**
 * 等 menu panel 数量到达期待值，返回那批 panel；**断言留给用例体**。
 *
 * 为什么不能只 `await nextFrame()` 若干次再断言：panel 的挂载与拆卸都经由 presence 链
 * （进场 rAF + 退出过渡 + `transitionend`）落定，**帧数是赌的**。赌输了的形态是
 * 「断言读到的是上一状态」——CI 上「上一个 panel 还没卸」正是这一条：
 * `expected [ <div …> ] to have a length of 1 but got 2`。
 * 「两帧读数相同」证明不了「已经就位」，同一个道理。
 *
 * 条件到不了就带读数抛错，不会静默通过。
 *
 * **它只在「数量会变」的场合比原来的固定帧数等待更强。** `waitFor` 在第一次
 * `await nextFrame()` **之前**就检查条件，所以条件在 t0 已成立时本函数只让出一帧——
 * 比原先那两帧（或四帧）**少**。因此适用面是「等数量到达 N」，不是「给后续断言多留
 * 沉降时间」：数量在 t0 就已经等于 N 的地方，轮询是空转，应当保留原来的固定帧数等待。
 * 三处这样的点已按此还原，见本文件里带「同帧卸载」「收尾栈」注释的那几条。
 *
 * **断言不放在这里**是刻意的：本仓门禁 `vitest/expect-expect` 只看**语法上有无
 * `expect(...)`**（见 `shared/test-utils/index.ts` 里 `contractEvent` 那段说明），
 * 断言若只存在于 helper 内部，那条用例会变成门禁眼里的「零断言空过」。所以每个调用点
 * 仍然逐字保留 `expect(panels).toHaveLength(n)`。
 *
 * 只用于「等它变成 N」的正向与过渡性断言。**否定断言不适用**——见本文件末尾 dialog 用例
 * 里那条：panel「本就不该」出现在普通 overlay 容器里，等它只会把快速失败变成 1s 超时。
 */
async function waitForMenuPanels(count: number): Promise<HTMLElement[]> {
  await waitFor(
    () => getMenuPanels().length === count,
    () => `menu panel 数量未到达 ${count}（最新读到 ${getMenuPanels().length} 个）`
  )
  await nextFrame()
  return getMenuPanels()
}

/** 焦点落点：panel 挂在 overlay root 的 shadow 里，文档级 activeElement 会重定位到那个 root。 */
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

/** 打开后的根 panel 条目；panel 尚未挂载时抛错，而不是静默返回空数组让断言失去意义。 */
function requireRootItem(): HTMLElement {
  const item = getMenuPanels()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
  if (!item) throw new Error('根 menu panel 未挂载或没有 menu item')
  return item
}

/** 指定 panel 内的条目；panel 或条目缺失时抛错，标出是哪一层没到位。 */
function requireItemIn(panel: HTMLElement | undefined, label: string): HTMLElement {
  const item = panel?.querySelector<HTMLElement>('web-ui-dropdown-item')
  if (!item) throw new Error(`${label}panel 未挂载或没有 menu item`)
  return item
}

afterEach(() => document.body.replaceChildren())

describe('WebUiDropdown 组件（浏览器）', () => {
  it('直接设置 open 时根 menu 就位且带 menu 语义', async () => {
    const menu = createDropdown(SIMPLE)
    await menu.updateComplete

    menu.open = true
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    expect(menu.open).toBe(true)
    const panels = await waitForMenuPanels(1)
    expect(panels).toHaveLength(1)
    expect(panels[0]?.getAttribute('role')).toBe('menu')
    expect(panels[0]?.textContent).toContain('Open')
  })

  /*
   * menu 打开后焦点落在首项上，但指针点击不该让 focus ring 亮起来——那会让「点开 menu」
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

  it('指针点击可以打开submenu', async () => {
    const warn = vi.spyOn(console, 'warn')
    try {
      const menu = createDropdown(SUBMENU)
      await menu.updateComplete

      menu.querySelector<HTMLButtonElement>('button')?.dispatchEvent(clickEvent(1))
      await menu.updateComplete
      expect(await waitForMenuPanels(1)).toHaveLength(1)

      await nextFrame()
      getMenuPanels()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')?.click()

      const opened = await waitForMenuPanels(2)
      expect(opened).toHaveLength(2)
      expect(opened[1]?.textContent).toContain('PDF')
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('Element web-ui-dropdown scheduled an update'))
    } finally {
      warn.mockRestore()
    }
  })

  // 组件被卸载时 panel 必须跟着消失，焦点交还页面；否则用户会困在一个空 overlay 里。
  it('根 menu 打开后同帧卸载不重建 panel 或焦点', async () => {
    const menu = createDropdown(SIMPLE)
    await menu.updateComplete

    // 同帧卸载：`suspend()` 取消了待执行的建 panel 帧，panel 从未被建出来，
    // `toHaveLength(0)` 从一开始就成立。这是**否定断言**（它「本就不该」出现），
    // 轮询只会把快速失败变成 1s 超时，所以保留原来的固定帧数等待。
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
   * 用户可观测后果：panel 重新存在、焦点落回首项、方向键重新可用。
   */
  it('打开状态下重挂载会重建 panel 并把焦点交还 menu', async () => {
    const menu = createDropdown(TWO_ITEMS)
    await menu.updateComplete

    menu.open = true
    await menu.updateComplete
    await waitFor(() => getMenuPanels().length === 1, '根 menu panel 应挂载')

    // `disconnectedCallback` → `_disposeAll` → `overlay.remove()` 是同步的，数量在 t0
    // 就已是 0，轮询它是空转。与下面两处「同帧卸载」同理，保留原来的固定帧数等待。
    menu.remove()
    await nextFrame()

    expect(getMenuPanels()).toHaveLength(0)

    document.body.append(menu)
    await waitFor(() => getMenuPanels().length === 1, '重挂载后应重建根 menu panel')
    await nextFrame()

    const items = openRootItems()
    expect(items).toHaveLength(2)
    const firstControl = focusedControl(items[0]!)
    expect(firstControl, '首项应有可聚焦的内部控件').toBeTruthy()
    expect(items[0]?.shadowRoot?.activeElement, '重挂载后焦点应回到首个可用 menu item').toBe(firstControl)

    firstControl?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }))
    await nextFrame()
    expect(items[1]?.shadowRoot?.activeElement, 'ArrowDown 应把焦点移到下一项').toBe(focusedControl(items[1]!))
  })

  it('submenu 打开后同帧卸载不重建子 panel', async () => {
    const menu = createDropdown(SUBMENU)
    await menu.updateComplete

    menu.open = true
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    getMenuPanels()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')?.click()
    await menu.updateComplete
    // 同帧卸载：submenu 那一帧同样被 `suspend()` 取消，拆卸是同步的，数量在 t0 就已是 0。
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

  // 键盘用户要能用方向键开合submenu：ArrowRight 进入、ArrowLeft 退回父级。
  it('键盘语义激活可以关闭并重新打开submenu', async () => {
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

    const opened = await waitForMenuPanels(2)
    expect(opened).toHaveLength(2)
    expect(opened[1]?.textContent).toContain('PDF')

    const submenuControl = focusedControl(requireItemIn(opened[1], 'submenu'))!
    submenuControl.focus()
    submenuControl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }))
    getMenuPanels()[1]?.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity', bubbles: true }))

    expect(await waitForMenuPanels(1)).toHaveLength(1)

    parentControl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))

    const reopened = await waitForMenuPanels(2)
    expect(reopened).toHaveLength(2)
    expect(reopened[1]?.hasAttribute('hidden')).toBe(false)
    expect(reopened[1]?.textContent).toContain('PDF')
  })

  it('submenu 退出过渡中可以被键盘重新打开', async () => {
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
    const submenuControl = focusedControl(requireItemIn(submenu, 'submenu'))!

    submenuControl.focus()
    submenuControl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, composed: true }))

    parentControl.focus()
    parentControl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, composed: true }))
    submenu?.dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity', bubbles: true }))

    // 退场中的submenu panel 在整个退出过渡里**都在 DOM 上**，所以「数量变成 2」在 t0 就成立，
    // 等它是空转。真正要等的是下面那条断言的主角：panel 不再被 `hidden`。
    await waitFor(
      () => getMenuPanels()[1]?.hasAttribute('hidden') === false,
      () => `submenu panel 未就位（当前读到 ${getMenuPanels().length} 个 panel，仍 hidden 或已被移除）`
    )
    await nextFrame()
    const panels = getMenuPanels()
    expect(panels).toHaveLength(2)
    expect(panels[1]?.hasAttribute('hidden')).toBe(false)
    expect(panels[1]?.textContent).toContain('PDF')
  })

  /*
   * 退场被打断时 panel 留在 DOM 里，而关闭分支已经撤销了登记。重开必须补登记：把仍在场
   * 的子层重新挂回新会话子树。否则submenu item 可见却落在根句柄子树之外，点它会被 document
   * 上的守卫当成外部点击，把整张 menu 关掉——submenu item 因此点不动。
   *
   * 退场过渡被刻意拉长，把「退场进行中重开」这个窗口钉成确定性的。
   */
  it('退场窗口内重开后，仍在场的submenu panel 内点击不关闭整张 menu', async () => {
    const menu = createDropdown(SUBMENU)
    await menu.updateComplete

    menu.openMenu()
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    const [rootPanel] = getMenuPanels()
    expect(rootPanel, '根 menu panel 应已挂载').toBeDefined()
    rootPanel!.style.transition = 'opacity 5s'

    // 用 requireRootItem 而非可选链：panel 没到位时要响亮失败，而不是静默跳过点击。
    requireRootItem().click()
    const submenuPanel = (await waitForMenuPanels(2))[1]
    expect(submenuPanel, 'submenu panel 应已挂载').toBeDefined()

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
   * 否则会出现「open === true + panel 可见 + 句柄为 null」，且点 panel 内部立刻关闭整张 menu：
   * 同一组件两个公开入口一个正常、一个彻底无登记。
   */
  it('退场窗口内经 open 属性重开时仍保持登记：panel 内点击不关闭 menu', async () => {
    const menu = createDropdown(SIMPLE)
    await menu.updateComplete

    menu.openMenu()
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    const [rootPanel] = getMenuPanels()
    expect(rootPanel, '根 menu panel 应已挂载').toBeDefined()
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
   * 重挂的第三个来源：收尾栈。ArrowLeft 的非即时关闭路径把submenu panel 移出内部集合，
   * 只剩收尾栈还记得它——panel 仍在 DOM 里、仍在退场中。根重开时若只重挂当前集合，
   * 这块 panel 就落在根句柄子树之外，点它内部照样把整张 menu 关掉。
   *
   * 与上面两条的分工：那两条走 `closeAll()`，submenu 留在集合里；本条先用 ArrowLeft
   * 把submenu 推进收尾栈。两次重开都必须发生，缺一条循环即转红。
   */
  it('退场窗口内重开后，收尾中的submenu panel 内点击不关闭整张 menu', async () => {
    const menu = createDropdown(SUBMENU)
    await menu.updateComplete

    menu.openMenu()
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    const [rootPanel] = getMenuPanels()
    expect(rootPanel, '根 menu panel 应已挂载').toBeDefined()
    rootPanel!.style.transition = 'opacity 5s'

    // 用 requireRootItem 而非可选链：panel 没到位时要响亮失败，而不是静默跳过点击。
    requireRootItem().click()
    await nextFrame()
    await nextFrame()
    const submenuPanel = getMenuPanels()[1]
    expect(submenuPanel, 'submenu panel 应已挂载').toBeDefined()
    submenuPanel!.style.transition = 'opacity 5s'

    // ArrowLeft 走非即时关闭路径：submenu panel 进收尾栈。
    const submenuControl = focusedControl(requireItemIn(submenuPanel, 'submenu'))!
    submenuControl.focus()
    // 收尾栈里的 ArrowLeft：断的是「panel**仍在场**」，数量从头到尾就是 2，
    // 等它变成 2 是空转。保留原来的固定帧数等待。
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
  // 已经模态化的 drawer 里的 menu 必须挂进那个 dialog（top layer），否则它会被 dialog
  // 自己的裁剪挡住，点击直接穿透到 backdrop。
  it('panel 挂载到 dialog 内而非普通 overlay 容器', async () => {
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
