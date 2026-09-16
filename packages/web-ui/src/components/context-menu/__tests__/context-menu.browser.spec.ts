import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
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

    // 在另一个位置重新定位打开（等价于在另一列表项右键）
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

    // 不经重定位，宿主直接重建嵌套子项（等价于网络推送/定时器触发的重渲染）
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

    // 面板内剩余项顺序保持
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
    // 关闭后宿主项集合 == 期望
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

    // 面板内条目顺序（补强）
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

    // 重开后顺序 == 期望
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
})
