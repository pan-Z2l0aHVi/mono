import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import '..'
import '@/components/checkbox'
import '@/components/popover'
import type { WebUiPopover } from '@/components/popover'
import { getMenuChildren } from '@/shared/menu-portal/menu-tree'
import { getMenuPanels, getPortalPanels } from '@/shared/test-utils'

import type { WebUiContextMenu } from '..'

const SUBMENU =
  '<web-ui-dropdown-item submenu>Export<web-ui-dropdown-item>PDF</web-ui-dropdown-item></web-ui-dropdown-item>'

// 根面板与子菜单面板都在 overlay 容器上（按文档序），统一用共享定位器枚举。
function getMenus(): HTMLElement[] {
  return getMenuPanels()
}

async function nextFrame() {
  await new Promise(resolve => requestAnimationFrame(resolve))
}

/** 合成 Escape：仲裁者挂在 document 捕获阶段，合成事件足以命中它。 */
function dispatchEscape() {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true })
  )
}

// R4：.wui-menu-content 是内部 class 定位器，按 R4 换为面板自身（web-ui-dropdown-item 的
// 直接父级就是 role="menu" 面板），统一用公共浮层定位器 getMenuPanels 取面板。
function getMenuContent() {
  const panel = getMenuPanels('上下文菜单')[0]
  if (!panel) throw new Error('Expected the context menu to be open')
  return panel
}

async function waitForObserverRefresh() {
  await nextFrame()
  await nextFrame()
}

async function waitForItemsReturned(menu: WebUiContextMenu, count: number) {
  // 关闭动画（transitionend ~160ms + 80ms 兜底）后才归还，预算按 500ms 计；
  // 不能用帧数表达——帧时长随刷新率变化，120Hz 下 20 帧不足 180ms 会假失败。
  const deadline = performance.now() + 500
  while (performance.now() < deadline) {
    await nextFrame()
    if (menu.querySelectorAll('web-ui-dropdown-item').length === count) return
  }
  throw new Error(`Expected ${count} menu items to be returned within 500ms`)
}

afterEach(() => document.body.replaceChildren())

describe('WebUiContextMenu 组件（浏览器）', () => {
  it('openAt() 以即时状态显示根菜单', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = '<web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()

    const panel = getMenuPanels('上下文菜单')[0]
    expect(menu.isOpen).toBe(true)
    expect(panel).toBeTruthy()
    expect(panel?.getAttribute('role')).toBe('menu')
    expect(panel?.getAttribute('aria-label')).toBe('上下文菜单')
    expect(panel?.hasAttribute('hidden')).toBe(false)
  })

  it('指针右键打开根菜单', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = '<web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 100, clientY: 100 }))
    await menu.updateComplete
    await nextFrame()

    const panel = getMenuPanels('上下文菜单')[0]
    expect(menu.isOpen).toBe(true)
    expect(panel).toBeTruthy()
    expect(panel?.getAttribute('role')).toBe('menu')
    expect(panel?.getAttribute('aria-label')).toBe('上下文菜单')
  })

  it('初始聚焦不绘制 accent，方向键导航后恢复键盘焦点视觉', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML =
      '<web-ui-dropdown-item>Open</web-ui-dropdown-item><web-ui-dropdown-item>Copy</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 100, clientY: 100 }))
    await menu.updateComplete
    await nextFrame()

    const panel = getMenuPanels('上下文菜单')[0]
    const items = [...(panel?.querySelectorAll<HTMLElement>('web-ui-dropdown-item') ?? [])]
    const firstControl = items[0]?.shadowRoot?.querySelector<HTMLElement>('.item-inner')
    const secondControl = items[1]?.shadowRoot?.querySelector<HTMLElement>('.item-inner')
    expect(items[0]?.shadowRoot?.activeElement).toBe(firstControl)
    expect(firstControl?.matches(':focus-visible')).toBe(true)
    expect(getComputedStyle(firstControl!).backgroundColor).not.toBe('rgb(0, 136, 255)')

    await userEvent.hover(firstControl!)
    expect(getComputedStyle(firstControl!).backgroundColor).not.toBe('rgb(0, 136, 255)')

    await userEvent.keyboard('{ArrowDown}')
    await nextFrame()

    expect(items[1]?.shadowRoot?.activeElement).toBe(secondControl)
    expect(items[1]?.hasAttribute('data-wui-menu-focus-suppressed')).toBe(false)
    expect(secondControl?.matches(':focus-visible')).toBe(true)
    expect(getComputedStyle(secondControl!).backgroundColor).toBe('rgb(0, 136, 255)')

    await userEvent.keyboard('{ArrowUp}')
    await nextFrame()

    expect(items[0]?.shadowRoot?.activeElement).toBe(firstControl)
    expect(items[0]?.hasAttribute('data-wui-menu-focus-suppressed')).toBe(false)
    expect(getComputedStyle(firstControl!).backgroundColor).toBe('rgb(0, 136, 255)')
  })

  it('键盘打开菜单时首项保留焦点视觉', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = '<web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true, composed: true }))
    await menu.updateComplete
    await nextFrame()

    const firstItem = getMenuPanels('上下文菜单')[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
    const firstControl = firstItem?.shadowRoot?.querySelector<HTMLElement>('.item-inner')
    expect(firstItem?.shadowRoot?.activeElement).toBe(firstControl)
    expect(firstItem?.hasAttribute('data-wui-menu-focus-suppressed')).toBe(false)
    expect(firstControl?.matches(':focus-visible')).toBe(true)
    expect(getComputedStyle(firstControl!).backgroundColor).toBe('rgb(0, 136, 255)')
  })

  it('点击菜单面板外的 checkbox 时完成勾选并关闭菜单', async () => {
    const menu = document.createElement('web-ui-context-menu')
    const row = document.createElement('div')
    const checkbox = document.createElement('web-ui-checkbox')
    checkbox.textContent = '选择资源'
    checkbox.addEventListener('click', event => event.stopPropagation())
    row.append(checkbox)
    menu.append(row, document.createElement('web-ui-dropdown-item'))
    menu.querySelector('web-ui-dropdown-item')!.textContent = 'Select'
    document.body.append(menu)
    await menu.updateComplete

    row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 100, clientY: 100 }))
    await menu.updateComplete
    await nextFrame()
    expect(menu.isOpen).toBe(true)

    await userEvent.click(checkbox)
    await menu.updateComplete
    await nextFrame()

    expect(checkbox.checked).toBe(true)
    expect(menu.isOpen).toBe(false)
  })

  it('点击菜单面板外的列表行时保留行点击并关闭菜单', async () => {
    const menu = document.createElement('web-ui-context-menu')
    const row = document.createElement('button')
    row.textContent = '打开资源'
    const item = document.createElement('web-ui-dropdown-item')
    item.textContent = 'Open'
    menu.append(row, item)
    document.body.append(menu)
    await menu.updateComplete
    let clicks = 0
    row.addEventListener('click', () => clicks++)

    row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 100, clientY: 100 }))
    await menu.updateComplete
    await nextFrame()
    expect(menu.isOpen).toBe(true)

    await userEvent.click(row)
    await menu.updateComplete
    await nextFrame()

    expect(clicks).toBe(1)
    expect(menu.isOpen).toBe(false)
  })

  it('menu panel 内嵌套子 overlay 的 wheel 不被父菜单抑制', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = `
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

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()

    const nested = getMenuContent().querySelector<WebUiPopover>('web-ui-popover')
    expect(nested).toBeTruthy()
    nested!.show()
    await nested!.updateComplete
    await nextFrame()

    const nestedPanel = getPortalPanels('dialog').find(panel => panel.textContent?.includes('Nested panel'))
    expect(nestedPanel).toBeTruthy()
    const wheel = new WheelEvent('wheel', { bubbles: true, composed: true, cancelable: true })
    nestedPanel?.dispatchEvent(wheel)

    expect(wheel.defaultPrevented).toBe(false)
    expect(menu.isOpen).toBe(true)
  })

  it('重定位打开后，宿主重建的嵌套子项重新隐藏（不叠加一级菜单）', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = SUBMENU
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()

    const parentItem = getMenus()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
    if (!parentItem) throw new Error('Expected a submenu parent item')
    parentItem.replaceChildren()
    const fresh = document.createElement('web-ui-dropdown-item')
    fresh.textContent = 'DOCX'
    parentItem.appendChild(fresh)

    menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 200, clientY: 200 }))
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const nested = parentItem.querySelector('web-ui-dropdown-item')!
    expect(nested.getAttribute('slot')).toBe('context-menu-hidden')
  })

  it('无重定位的宿主重建嵌套子项，观察者刷新后不再可见叠加', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = SUBMENU
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()

    const parentItem = getMenus()[0]?.querySelector<HTMLElement>('web-ui-dropdown-item')
    if (!parentItem) throw new Error('Expected a submenu parent item')

    parentItem.replaceChildren()
    const fresh = document.createElement('web-ui-dropdown-item')
    fresh.textContent = 'DOCX'
    parentItem.appendChild(fresh)

    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    expect(menu.isOpen).toBe(true)
    expect(fresh.getAttribute('slot')).toBe('context-menu-hidden')
  })

  it('菜单保持打开时重定位，移除 stale 子树并保持框架新子树顺序', async () => {
    const menu = document.createElement('web-ui-context-menu')
    const validItems =
      '<web-ui-dropdown-item>预览</web-ui-dropdown-item><web-ui-dropdown-item submenu>打开方式<web-ui-dropdown-item>Safari</web-ui-dropdown-item></web-ui-dropdown-item><web-ui-dropdown-item>删除</web-ui-dropdown-item>'
    const brokenItems =
      '<web-ui-dropdown-item>找回资源</web-ui-dropdown-item><web-ui-dropdown-item>删除</web-ui-dropdown-item>'
    menu.innerHTML = validItems
    document.body.append(menu)
    await menu.updateComplete

    const getContent = () => getMenuPanels('上下文菜单')[0]!
    // 模拟框架 keyed 更新的移除侧：portal 内旧项被 removeChild、宿主子树整体替换。
    // 插入侧由框架锚点所在容器决定：旧元素在 portal 才插 portal，mount 期锚点仍在
    // 宿主的分支则插宿主；本测试放回宿主由 reconcile 搬运，直插 portal 的路径由
    // 「v-if 翻转式替换」用例覆盖。
    const setItems = (html: string) => {
      const content = getContent()
      for (const item of getMenuChildren(content)) item.remove()
      menu.replaceChildren()
      menu.append(...new DOMParser().parseFromString(html, 'text/html').body.children)
    }
    // 面板扁平顺序断言需排除嵌套 submenu 子项（否则 PDF 会被重复计入），
    // 公开 querySelectorAll('web-ui-dropdown-item') 不等价，故保留 getMenuChildren。
    const getPortalItemText = () =>
      getMenuChildren(getMenuPanels('上下文菜单')[0]!).map(item => item.textContent?.trim())

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    expect(getPortalItemText()).toEqual(['预览', '打开方式Safari', '删除'])

    setItems(brokenItems)
    await menu.updateComplete
    menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 200, clientY: 200 }))
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    expect(getPortalItemText()).toEqual(['找回资源', '删除'])

    setItems(validItems)
    await menu.updateComplete
    menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 300, clientY: 300 }))
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    expect(getPortalItemText()).toEqual(['预览', '打开方式Safari', '删除'])
  })

  it('portal 顺序稳定时不再触发 childList mutation', async () => {
    // 无抖动契约：稳态下 portal 不产生任何 DOM 变更，防止 marker 繁殖活锁；
    // MutationRecord 是该契约（"无 childList 变更"）的唯一可观察面，故作为有据例外保留。
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML =
      '<web-ui-dropdown-item>预览</web-ui-dropdown-item><web-ui-dropdown-item>打开方式</web-ui-dropdown-item><web-ui-dropdown-item>删除</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const observer = new MutationObserver(() => {})
    observer.observe(getMenus()[0]!, { childList: true, subtree: true })
    await waitForObserverRefresh()
    expect(observer.takeRecords()).toHaveLength(0)

    await nextFrame()
    await nextFrame()
    await nextFrame()
    expect(observer.takeRecords()).toHaveLength(0)
    observer.disconnect()
  })

  it('框架移除部分菜单项后，prune 失效锚点并保持剩余顺序', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML =
      '<web-ui-dropdown-item>预览</web-ui-dropdown-item><web-ui-dropdown-item>打开方式</web-ui-dropdown-item><web-ui-dropdown-item>删除</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const content = getMenuContent()
    const [, openWith] = Array.from(content.querySelectorAll('web-ui-dropdown-item'))
    openWith.remove()
    await waitForObserverRefresh()

    expect(Array.from(content.querySelectorAll('web-ui-dropdown-item')).map(item => item.textContent?.trim())).toEqual([
      '预览',
      '删除'
    ])

    // prune 的可观察后果：关闭后宿主项集合与顺序 == 期望（而非断言内部 marker 计数）
    menu.close()
    await menu.updateComplete
    await waitForItemsReturned(menu, 2)
    expect(Array.from(menu.querySelectorAll('web-ui-dropdown-item')).map(item => item.textContent?.trim())).toEqual([
      '预览',
      '删除'
    ])
  })

  it('框架直接移除单项后关闭，重开菜单项完整无重复', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML =
      '<web-ui-dropdown-item>预览</web-ui-dropdown-item><web-ui-dropdown-item>打开方式</web-ui-dropdown-item><web-ui-dropdown-item>删除</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const [, openWith] = Array.from(getMenuContent().querySelectorAll('web-ui-dropdown-item'))
    openWith.remove()
    menu.close()
    await menu.updateComplete
    await waitForObserverRefresh()
    await waitForItemsReturned(menu, 2)

    expect(menu.isOpen).toBe(false)
    expect(Array.from(menu.querySelectorAll('web-ui-dropdown-item')).map(item => item.textContent?.trim())).toEqual([
      '预览',
      '删除'
    ])

    // 孤儿 marker 的真实症状是下次打开时条目重复/丢失：重开后断言无重复且顺序正确
    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    const reopened = Array.from(getMenuContent().querySelectorAll('web-ui-dropdown-item')).map(item =>
      item.textContent?.trim()
    )
    expect(reopened).toEqual(['预览', '删除'])
    expect(new Set(reopened).size).toBe(reopened.length)
  })

  it('v-if 翻转式替换 portal 内项后重定位，菜单完整且重开后顺序正确', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML =
      '<web-ui-dropdown-item>预览</web-ui-dropdown-item><web-ui-dropdown-item>打开方式</web-ui-dropdown-item><web-ui-dropdown-item>删除</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    // 模拟 Vue v-if 翻转：在 portal 内把「预览」卸载为注释锚点并就地插入新项
    const content = getMenuContent()
    const [preview] = Array.from(content.querySelectorAll('web-ui-dropdown-item'))
    const fresh = document.createElement('web-ui-dropdown-item')
    fresh.textContent = '找回资源'
    preview.replaceWith(document.createComment('v-if'), fresh)
    await waitForObserverRefresh()

    expect(Array.from(content.querySelectorAll('web-ui-dropdown-item')).map(item => item.textContent?.trim())).toEqual([
      '找回资源',
      '打开方式',
      '删除'
    ])

    menu.close()
    await menu.updateComplete
    await waitForItemsReturned(menu, 3)

    // 关闭后宿主项集合 == 期望（替代原 marker 计数 / 锚点残留断言）
    expect(Array.from(menu.querySelectorAll('web-ui-dropdown-item')).map(item => item.textContent?.trim())).toEqual([
      '找回资源',
      '打开方式',
      '删除'
    ])

    menu.openAt(200, 200)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()
    const reopened = Array.from(getMenuContent().querySelectorAll('web-ui-dropdown-item')).map(item =>
      item.textContent?.trim()
    )
    expect(reopened).toEqual(['找回资源', '打开方式', '删除'])
  })

  it('框架直接向 portal 插入带子菜单的项，刷新后纳入托管且嵌套隐藏', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = '<web-ui-dropdown-item>编辑</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    // 绕过宿主直接向 portal 插入带嵌套子项的 submenu 父项（新节点无隐藏 slot）。
    // 组件监听的是 items 所在的内容区（既有 item 的父容器），需插入该容器而非面板自身，
    // 否则嵌套子项不会被 reconcile 纳入托管、也不会被 hideNestedMenuChildren 隐藏。
    const content = getMenuContent()
    const itemsContainer = content.querySelector('web-ui-dropdown-item')?.parentElement ?? content
    const fresh = document.createElement('web-ui-dropdown-item')
    fresh.setAttribute('submenu', '')
    fresh.textContent = '导出'
    const nested = document.createElement('web-ui-dropdown-item')
    nested.textContent = 'PDF'
    fresh.appendChild(nested)
    itemsContainer.appendChild(fresh)
    await waitForObserverRefresh()
    await waitForObserverRefresh()

    expect(menu.isOpen).toBe(true)
    // 面板内条目顺序（含嵌套 submenu 父项的拼接文本）；getMenuChildren 不递归进 submenu 子项，
    // 与公开 querySelectorAll('web-ui-dropdown-item') 不等价，故保留内部定位器表达扁平顺序。
    expect(getMenuChildren(content).map(item => item.textContent?.trim())).toEqual(['编辑', '导出PDF'])
    // slot 投影契约（§5 允许），保留
    expect(nested.getAttribute('slot')).toBe('context-menu-hidden')
  })

  it('键盘打开后，子菜单在退出中重新打开仍可用', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = SUBMENU
    document.body.append(menu)
    await menu.updateComplete

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true, composed: true }))
    await menu.updateComplete
    await nextFrame()

    const rootPanel = getMenuPanels('上下文菜单')[0]
    expect(menu.isOpen).toBe(true)
    expect(rootPanel).toBeTruthy()
    expect(rootPanel?.getAttribute('role')).toBe('menu')
    expect(rootPanel?.getAttribute('aria-label')).toBe('上下文菜单')
    expect(rootPanel?.hasAttribute('hidden')).toBe(false)

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

  /*
   * 退场被打断时 `_closeMenuAfterPresence` 会在 `hideOverlayPresence` 返回 false 后提前
   * 退出，`_menu` 因此仍在，而关闭分支已经撤了句柄。重开必须补 claim：否则菜单可见却无登记，
   * Escape 关不掉它，且每次 document click（含面板内部）都会被判成外部点击而关闭菜单。
   */
  it('退场中重开后仍保持登记：面板内点击不关闭，Escape 仍可关闭', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = '<web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(20, 20)
    await menu.updateComplete
    await nextFrame()
    const panel = getMenuContent()

    dispatchEscape()
    await menu.updateComplete
    await nextFrame()
    expect(menu.isOpen).toBe(false)

    menu.openAt(40, 40)
    await menu.updateComplete
    await nextFrame()
    await menu.updateComplete
    expect(getMenuContent()).toBe(panel)
    expect(menu.isOpen).toBe(true)

    panel.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await menu.updateComplete
    expect(menu.isOpen).toBe(true)

    dispatchEscape()
    await menu.updateComplete
    expect(menu.isOpen).toBe(false)
  })

  /*
   * 根层在退场窗口内重新 claim 时，收尾栈里的子菜单面板仍在 DOM 里、仍然可见，但已经
   * 离开 `_activeSubmenus`。它必须在**取回之前与之后**都被挂回新会话的子树，否则会被
   * 判成面板外 —— 点它内部就关掉整张菜单（base 的登记树直到 dispose 才注销，故属回归）。
   *
   * 两个面板的 transition 都钉长：根面板撑开「重开窗口」，子菜单面板让 closing 栈条目
   * 不被提前 dispose —— 否则 take 走的是新建分支（自带 adopt），覆盖不到这个窗口。
   */
  it('退场窗口内重开后，收尾中的子菜单面板在取回前后都不可被当成面板外', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = SUBMENU
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(20, 20)
    await menu.updateComplete
    await nextFrame()
    const rootPanel = getMenus()[0]!
    rootPanel.style.transition = 'opacity 5s'

    const parentItem = rootPanel.querySelector<HTMLElement>('web-ui-dropdown-item')!
    parentItem.click()
    await nextFrame()
    await nextFrame()
    expect(getMenus()).toHaveLength(2)
    const submenuPanel = getMenus()[1]!
    submenuPanel.style.transition = 'opacity 5s'

    // 第一次 Escape 让子菜单进 closing 栈，第二次关闭根菜单（句柄随之撤销）。
    dispatchEscape()
    await nextFrame()
    dispatchEscape()
    await menu.updateComplete
    await nextFrame()

    // 退场窗口内重开：根句柄换代。
    menu.openAt(40, 40)
    await menu.updateComplete
    await nextFrame()
    await menu.updateComplete
    expect(getMenus()[0]).toBe(rootPanel)
    expect(menu.isOpen).toBe(true)
    expect(submenuPanel.hidden).toBe(false)

    submenuPanel.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await menu.updateComplete
    expect(menu.isOpen).toBe(true)

    // 取回之后：同一断言再次成立（`_openSubmenu` 的 take 分支必须补 adopt）。
    parentItem.click()
    await nextFrame()
    await nextFrame()
    expect(menu.isOpen).toBe(true)
    getMenus()[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await menu.updateComplete
    expect(menu.isOpen).toBe(true)
  })
})
