import { afterEach, describe, expect, it } from 'vite-plus/test'

import '..'
import { getMenuChildren } from '@/shared/menu-portal/menu-tree'

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

function getMenuContent() {
  const panel = getMenus().find(element => element.getAttribute('aria-label') === '上下文菜单')
  if (!panel) throw new Error('Expected the context menu to be open')
  return panel.querySelector<HTMLElement>('.wui-menu-content')!
}

function getManagedMarkers(host: HTMLElement) {
  return Array.from(host.childNodes).filter(
    node => node.nodeType === Node.COMMENT_NODE && node.textContent === 'wui-context-menu-item'
  )
}

async function waitForObserverRefresh() {
  await nextFrame()
  await nextFrame()
}

async function waitForItemsReturned(menu: WebUiContextMenu, count: number) {
  // 关闭动画（transitionend ~100ms + 80ms 兜底）后才归还，预算按 500ms 计；
  // 不能用帧数表达——帧时长随刷新率变化，120Hz 下 20 帧不足 180ms 会假失败。
  const deadline = performance.now() + 500
  while (performance.now() < deadline) {
    await nextFrame()
    if (getMenuChildren(menu).length === count) return
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

    expect(getMenus()[0]?.dataset.wuiPresence).toBe('open')
  })

  it('指针右键以入场状态打开根菜单', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML = '<web-ui-dropdown-item>Open</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, clientX: 100, clientY: 100 }))
    await menu.updateComplete
    await nextFrame()

    expect(getMenus()[0]?.dataset.wuiPresence).toBe('entering')
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

    const getContent = () => getMenus()[0]!.querySelector<HTMLElement>('.wui-menu-content')!
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
    const getPortalItemText = () => getMenuChildren(getMenus()[0]!).map(item => item.textContent?.trim())

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
    const [, openWith] = getMenuChildren(content)
    openWith.remove()
    await waitForObserverRefresh()

    expect(getMenuChildren(content).map(item => item.textContent?.trim())).toEqual(['预览', '删除'])
    expect(getManagedMarkers(menu)).toHaveLength(2)
  })

  it('框架直接移除单项后关闭，不残留孤儿 marker', async () => {
    const menu = document.createElement('web-ui-context-menu')
    menu.innerHTML =
      '<web-ui-dropdown-item>预览</web-ui-dropdown-item><web-ui-dropdown-item>打开方式</web-ui-dropdown-item><web-ui-dropdown-item>删除</web-ui-dropdown-item>'
    document.body.append(menu)
    await menu.updateComplete

    menu.openAt(100, 100)
    await menu.updateComplete
    await nextFrame()
    await nextFrame()

    const [, openWith] = getMenuChildren(getMenuContent())
    openWith.remove()
    menu.close()
    await menu.updateComplete
    await waitForObserverRefresh()
    await waitForItemsReturned(menu, 2)

    expect(menu.isOpen).toBe(false)
    expect(getMenuChildren(menu).map(item => item.textContent?.trim())).toEqual(['预览', '删除'])
    expect(getManagedMarkers(menu)).toHaveLength(0)
  })

  it('v-if 翻转式替换 portal 内项后重定位，菜单完整且无锚点残留', async () => {
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
    const [preview] = getMenuChildren(content)
    const fresh = document.createElement('web-ui-dropdown-item')
    fresh.textContent = '找回资源'
    preview.replaceWith(document.createComment('v-if'), fresh)
    await waitForObserverRefresh()

    expect(getMenuChildren(content).map(item => item.textContent?.trim())).toEqual(['找回资源', '打开方式', '删除'])
    // 收敛后 content 中不再残留框架写入的注释锚点之外的托管噪声；关闭后锚点一并清理
    menu.close()
    await menu.updateComplete
    await waitForItemsReturned(menu, 3)

    expect(getMenuChildren(menu).map(item => item.textContent?.trim())).toEqual(['找回资源', '打开方式', '删除'])
    expect(getManagedMarkers(menu)).toHaveLength(0)
    expect(Array.from(content.childNodes).some(node => node.nodeType === Node.COMMENT_NODE)).toBe(false)
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

    // 绕过宿主直接向 portal 插入带嵌套子项的 submenu 父项（新节点无隐藏 slot）
    const content = getMenuContent()
    const fresh = document.createElement('web-ui-dropdown-item')
    fresh.setAttribute('submenu', '')
    fresh.textContent = '导出'
    const nested = document.createElement('web-ui-dropdown-item')
    nested.textContent = 'PDF'
    fresh.appendChild(nested)
    content.appendChild(fresh)
    await waitForObserverRefresh()
    await waitForObserverRefresh()

    expect(menu.isOpen).toBe(true)
    expect(getMenuChildren(content).map(item => item.textContent?.trim())).toEqual(['编辑', '导出PDF'])
    expect(getManagedMarkers(menu)).toHaveLength(2)
    expect(nested.getAttribute('slot')).toBe('context-menu-hidden')
    expect(nested.getBoundingClientRect().width).toBe(0)
  })

  it('键盘打开后，子菜单在退出中重新打开仍可用', async () => {
    const menu = document.createElement('web-ui-context-menu')
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
