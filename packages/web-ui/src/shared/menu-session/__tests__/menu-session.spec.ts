import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { createMenuSession, type MenuCloseReason, type MenuSurface } from '..'

function createFakeSurface(label: string): MenuSurface {
  const panel = document.createElement('div')
  panel.dataset.testPanel = label
  const content = document.createElement('div')
  panel.append(content)
  document.body.append(panel)
  return { panel, content }
}

function createMenuItem(
  text: string,
  options?: { submenu?: boolean; disabled?: boolean; focusable?: boolean }
): HTMLElement {
  const item = document.createElement('web-ui-dropdown-item')
  item.textContent = text
  if (options?.submenu) item.setAttribute('submenu', '')
  if (options?.disabled) item.setAttribute('disabled', '')
  if (options?.focusable) {
    const shadow = item.attachShadow({ mode: 'open' })
    const btn = document.createElement('button')
    btn.setAttribute('role', 'menuitem')
    btn.textContent = text
    shadow.append(btn)
    ;(item as HTMLElement & { focusItem?: () => void }).focusItem = () => btn.focus()
  }
  return item
}

async function flushFrames(count = 2) {
  for (let i = 0; i < count; i++) {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  }
}

const activeSessions = new Set<{ disconnect(): void }>()

function trackSession<S extends MenuSurface>(
  options: Parameters<typeof createMenuSession<S>>[0]
): ReturnType<typeof createMenuSession<S>> {
  const session = createMenuSession<S>(options)
  activeSessions.add(session)
  return session
}

afterEach(() => {
  for (const session of activeSessions) {
    try {
      session.disconnect()
    } catch {
      // 忽略测试中已手动断开或 DOM 已被移除导致的二次清理异常
    }
  }
  activeSessions.clear()
  vi.useRealTimers()
  document.body.replaceChildren()
})

describe('MenuSession', () => {
  it('打开时迁移菜单项，点击叶子项触发 leaf-click，关闭后归还宿主并调用 beforeRootCleanup', async () => {
    const host = document.createElement('div')
    const itemA = createMenuItem('Copy')
    const itemB = createMenuItem('Paste')
    host.append(itemA, itemB)
    document.body.append(host)

    const onRequestClose = vi.fn<(reason: MenuCloseReason) => void>()
    const callOrder: string[] = []
    const session = trackSession<MenuSurface>({
      host,
      markerText: 'test-marker',
      hiddenSlot: 'test-hidden',
      isScrollLockDisabled: () => true,
      onRequestClose,
      closeOnLeafClick: true,
      hideHostChildren: true,
      beforeRootCleanup: () => {
        callOrder.push('beforeRootCleanup')
      },
      surface: {
        createRoot: () => createFakeSurface('root'),
        createSubmenu: ({ level }) => createFakeSurface(`sub-${level}`),
        positionRoot: () => {},
        positionSubmenu: () => {},
        disposeSurface: surface => {
          callOrder.push(`dispose:${surface.panel.dataset.testPanel}`)
          surface.panel.remove()
        }
      }
    })

    session.connect()
    expect(itemA.getAttribute('slot')).toBe('test-hidden')

    session.open({ isInstant: true, takeFocus: false, suppressFocusVisible: true })
    await flushFrames()

    const root = session.getRootSurface()
    expect(root).toBeDefined()
    expect(root?.content.contains(itemA)).toBe(true)
    expect(root?.content.contains(itemB)).toBe(true)

    itemA.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(onRequestClose).toHaveBeenCalledWith('leaf-click')

    session.close({ isInstant: true })
    await flushFrames()

    expect(callOrder).toEqual(['beforeRootCleanup', 'dispose:root'])
    expect(host.contains(itemA)).toBe(true)
    expect(host.contains(itemB)).toBe(true)
    expect(session.getRootSurface()).toBeUndefined()

    session.disconnect()
  })

  it('Escape 按最深 submenu 优先收起，无 submenu 时回调 escape', async () => {
    const host = document.createElement('div')
    const subParent = createMenuItem('Export', { submenu: true })
    const subChild = createMenuItem('PDF')
    subParent.append(subChild)
    host.append(subParent)
    document.body.append(host)

    const onRequestClose = vi.fn<(reason: MenuCloseReason) => void>()
    const session = trackSession<MenuSurface>({
      host,
      markerText: 'test-marker',
      hiddenSlot: 'test-hidden',
      isScrollLockDisabled: () => true,
      onRequestClose,
      closeOnLeafClick: false,
      surface: {
        createRoot: () => createFakeSurface('root'),
        createSubmenu: ({ level }) => createFakeSurface(`sub-${level}`),
        positionRoot: () => {},
        positionSubmenu: () => {},
        disposeSurface: surface => surface.panel.remove()
      }
    })

    session.connect()
    session.open({ isInstant: true, takeFocus: false, suppressFocusVisible: true })
    await flushFrames()

    subParent.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(subParent.hasAttribute('active')).toBe(true)
    expect(document.querySelector('[data-test-panel="sub-1"]')).not.toBeNull()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(onRequestClose).not.toHaveBeenCalled()
    expect(subParent.hasAttribute('active')).toBe(false)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(onRequestClose).toHaveBeenCalledWith('escape')

    session.disconnect()
  })

  it('closeWhenEmptied 在内容从有到无时请求 emptied 关闭，程序式空开不自动关闭', async () => {
    const host = document.createElement('div')
    document.body.append(host)

    const onRequestClose = vi.fn<(reason: MenuCloseReason) => void>()
    const session = trackSession<MenuSurface>({
      host,
      markerText: 'test-marker',
      hiddenSlot: 'test-hidden',
      isScrollLockDisabled: () => true,
      onRequestClose,
      closeOnLeafClick: false,
      closeWhenEmptied: true,
      observeHost: true,
      surface: {
        createRoot: () => createFakeSurface('root'),
        createSubmenu: ({ level }) => createFakeSurface(`sub-${level}`),
        positionRoot: () => {},
        positionSubmenu: () => {},
        disposeSurface: surface => surface.panel.remove()
      }
    })

    session.connect()
    session.open({ isInstant: true, takeFocus: false, suppressFocusVisible: true })
    await flushFrames()
    expect(onRequestClose).not.toHaveBeenCalled()

    const item = createMenuItem('Dynamic')
    host.append(item)
    await flushFrames()
    expect(session.hasContent()).toBe(true)
    expect(onRequestClose).not.toHaveBeenCalled()

    item.remove()
    await flushFrames()
    expect(onRequestClose).toHaveBeenCalledWith('emptied')

    session.disconnect()
  })

  it('悬停 200ms 延迟展开子菜单，移入叶子项收起深层，touch 指针事件被忽略', async () => {
    vi.useFakeTimers()
    const host = document.createElement('div')
    const subParent = createMenuItem('More', { submenu: true })
    const subChild = createMenuItem('Sub Item')
    const leaf = createMenuItem('Leaf')
    subParent.append(subChild)
    host.append(subParent, leaf)
    document.body.append(host)

    const session = trackSession<MenuSurface>({
      host,
      markerText: 'test-marker',
      hiddenSlot: 'test-hidden',
      isScrollLockDisabled: () => true,
      onRequestClose: () => {},
      closeOnLeafClick: false,
      surface: {
        createRoot: () => createFakeSurface('root'),
        createSubmenu: ({ level }) => createFakeSurface(`sub-${level}`),
        positionRoot: () => {},
        positionSubmenu: () => {},
        disposeSurface: surface => surface.panel.remove()
      }
    })

    session.connect()
    session.open({ isInstant: true, takeFocus: false, suppressFocusVisible: true })
    await vi.advanceTimersByTimeAsync(50)

    // touch 指针悬停不得展开子菜单。
    const touchEnter = new Event('pointerenter')
    Object.defineProperty(touchEnter, 'pointerType', { value: 'touch' })
    subParent.dispatchEvent(touchEnter)
    await vi.advanceTimersByTimeAsync(250)
    expect(subParent.hasAttribute('active')).toBe(false)
    expect(document.querySelector('[data-test-panel="sub-1"]')).toBeNull()

    // mouse 悬停需满 200ms 延迟后展开。
    const mouseEnter = new Event('pointerenter')
    Object.defineProperty(mouseEnter, 'pointerType', { value: 'mouse' })
    subParent.dispatchEvent(mouseEnter)
    await vi.advanceTimersByTimeAsync(150)
    expect(subParent.hasAttribute('active')).toBe(false)
    await vi.advanceTimersByTimeAsync(60)
    expect(subParent.hasAttribute('active')).toBe(true)
    expect(document.querySelector('[data-test-panel="sub-1"]')).not.toBeNull()

    // 移入同级叶子项并在延迟后收起子菜单。
    const leafEnter = new Event('pointerenter')
    Object.defineProperty(leafEnter, 'pointerType', { value: 'mouse' })
    leaf.dispatchEvent(leafEnter)
    await vi.advanceTimersByTimeAsync(250)
    expect(subParent.hasAttribute('active')).toBe(false)

    session.disconnect()
  })

  it('子菜单退场窗口内重开可复用句柄且 overlay 层级计数零泄漏 (#603)', async () => {
    const host = document.createElement('div')
    const subParent = createMenuItem('Export', { submenu: true })
    const subChild = createMenuItem('PNG')
    subParent.append(subChild)
    host.append(subParent)
    document.body.append(host)

    let createdSubmenus = 0
    const session = trackSession<MenuSurface>({
      host,
      markerText: 'test-marker',
      hiddenSlot: 'test-hidden',
      isScrollLockDisabled: () => true,
      onRequestClose: () => {},
      closeOnLeafClick: false,
      surface: {
        createRoot: () => createFakeSurface('root'),
        createSubmenu: ({ level }) => {
          createdSubmenus += 1
          const surface = createFakeSurface(`sub-${level}-${createdSubmenus}`)
          // 给退场动画加一个未结束的 animation，使 closeAsync 留在退场窗口中。
          surface.panel.getAnimations = () => [{ finished: new Promise<void>(() => {}) } as unknown as Animation]
          return surface
        },
        positionRoot: () => {},
        positionSubmenu: () => {},
        disposeSurface: surface => surface.panel.remove()
      }
    })

    const initialLayers = globalThis.__openOverlayLayerCount()
    session.connect()
    session.open({ isInstant: true, takeFocus: false, suppressFocusVisible: true })
    await flushFrames()
    expect(globalThis.__openOverlayLayerCount()).toBe(initialLayers + 1)

    // 打开子菜单 -> Escape 进入异步退场窗口 -> 再次点击重开，应复用原面板不新建且层数不变。
    subParent.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(createdSubmenus).toBe(1)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(subParent.hasAttribute('active')).toBe(false)

    subParent.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(createdSubmenus).toBe(1)
    expect(subParent.hasAttribute('active')).toBe(true)
    // root + 1 个 adopted submenu 共占 2 层，重接管不得产生第 3 层泄漏。
    expect(globalThis.__openOverlayLayerCount()).toBe(initialLayers + 2)

    session.close({ isInstant: true })
    await flushFrames()
    expect(globalThis.__openOverlayLayerCount()).toBe(initialLayers)

    session.disconnect()
    expect(globalThis.__openOverlayLayerCount()).toBe(initialLayers)
  })

  it('Vue v-if 注释锚点在打开期重排与关闭归还往返中不漂移', async () => {
    const host = document.createElement('div')
    const itemA = createMenuItem('A')
    const vueAnchor = document.createComment('v-if')
    const itemB = createMenuItem('B')
    host.append(itemA, vueAnchor, itemB)
    document.body.append(host)

    const session = trackSession<MenuSurface>({
      host,
      markerText: 'test-marker',
      hiddenSlot: 'test-hidden',
      isScrollLockDisabled: () => true,
      onRequestClose: () => {},
      closeOnLeafClick: false,
      observeHost: true,
      surface: {
        createRoot: () => createFakeSurface('root'),
        createSubmenu: ({ level }) => createFakeSurface(`sub-${level}`),
        positionRoot: () => {},
        positionSubmenu: () => {},
        disposeSurface: surface => surface.panel.remove()
      }
    })

    session.connect()
    session.open({ isInstant: true, takeFocus: false, suppressFocusVisible: true })
    await flushFrames()

    const root = session.getRootSurface()!
    // 模拟 Vue 把注释锚点插在面板内 itemA 与 itemB 之间，并在打开期触发一次重排刷新。
    root.content.insertBefore(vueAnchor, itemB)
    const itemC = createMenuItem('C')
    host.append(itemC)
    await flushFrames()

    expect(Array.from(root.content.childNodes)).toEqual([itemA, vueAnchor, itemB, itemC])

    session.close({ isInstant: true })
    await flushFrames()
    expect(Array.from(host.children)).toEqual([itemA, itemB, itemC])

    session.disconnect()
  })

  it('disconnect 彻底释放活跃/退场子菜单、占位句柄与滚动锁', async () => {
    const host = document.createElement('div')
    const subParent = createMenuItem('Export', { submenu: true })
    const subChild = createMenuItem('SVG')
    subParent.append(subChild)
    host.append(subParent)
    document.body.append(host)

    const disposedPanels: string[] = []
    const session = trackSession<MenuSurface>({
      host,
      markerText: 'test-marker',
      hiddenSlot: 'test-hidden',
      isScrollLockDisabled: () => false,
      onRequestClose: () => {},
      closeOnLeafClick: false,
      surface: {
        createRoot: () => createFakeSurface('root'),
        createSubmenu: ({ level }) => createFakeSurface(`sub-${level}`),
        positionRoot: () => {},
        positionSubmenu: () => {},
        disposeSurface: surface => {
          disposedPanels.push(surface.panel.dataset.testPanel ?? '')
          surface.panel.remove()
        }
      }
    })

    const initialLayers = globalThis.__openOverlayLayerCount()
    session.connect()
    session.claimPlaceholder()
    expect(globalThis.__openOverlayLayerCount()).toBe(initialLayers + 1)

    session.open({ isInstant: true, takeFocus: false, suppressFocusVisible: true })
    await flushFrames()
    subParent.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    expect(document.documentElement.style.overflow).toBe('hidden')

    session.disconnect()
    expect(globalThis.__openOverlayLayerCount()).toBe(initialLayers)
    expect(document.documentElement.style.overflow).toBe('')
    expect(disposedPanels).toContain('sub-1')
    expect(disposedPanels).toContain('root')
    expect(host.contains(subParent)).toBe(true)
    expect(subParent.contains(subChild)).toBe(true)
  })

  it('syncHostState 动态同步滚动锁，deferFocusFrame 多帧重试聚焦且关闭重开取消旧帧回调', async () => {
    const host = document.createElement('div')
    const item = createMenuItem('First', { focusable: true })
    host.append(item)
    document.body.append(host)

    let scrollLockDisabled = true
    const session = trackSession<MenuSurface>({
      host,
      markerText: 'test-marker',
      hiddenSlot: 'test-hidden',
      isScrollLockDisabled: () => scrollLockDisabled,
      onRequestClose: () => {},
      closeOnLeafClick: false,
      surface: {
        createRoot: () => createFakeSurface('root'),
        createSubmenu: ({ level }) => createFakeSurface(`sub-${level}`),
        positionRoot: () => {},
        positionSubmenu: () => {},
        disposeSurface: surface => surface.panel.remove()
      }
    })

    session.connect()
    session.open({
      isInstant: true,
      takeFocus: true,
      suppressFocusVisible: true,
      deferFocusFrame: true,
      focusRetryAttempts: 2
    })
    await flushFrames(1)

    // 动态关闭 noScrollLock 后调用 syncHostState 生效滚动锁。
    expect(document.documentElement.style.overflow).toBe('')
    scrollLockDisabled = false
    session.syncHostState()
    expect(document.documentElement.style.overflow).toBe('hidden')

    // 紧接着在 deferFocusFrame 尚未执行前关闭并以 suppressFocusVisible: false 重开，旧帧回调不得覆写焦点样式。
    const btn = item.shadowRoot!.querySelector('button')!
    const focusSpy = vi.spyOn(btn, 'focus')
    session.close({ isInstant: true })
    session.open({
      isInstant: true,
      takeFocus: true,
      suppressFocusVisible: false,
      deferFocusFrame: true,
      focusRetryAttempts: 2
    })
    await flushFrames(3)

    expect(focusSpy).toHaveBeenCalled()
    expect(item.hasAttribute('data-wui-menu-focus-suppressed')).toBe(false)

    session.disconnect()
  })

  it('根菜单退场未完成前再次 open()，恢复可见态、Escape 仲裁与动态内容同步且不被旧退场回调清理', async () => {
    const host = document.createElement('div')
    const itemA = createMenuItem('Alpha')
    host.append(itemA)
    document.body.append(host)

    let rootSurface: MenuSurface | undefined
    const onRequestClose = vi.fn<(reason: MenuCloseReason) => void>()
    const session = trackSession<MenuSurface>({
      host,
      markerText: 'test-marker',
      hiddenSlot: 'test-hidden',
      isScrollLockDisabled: () => true,
      onRequestClose,
      closeOnLeafClick: true,
      hideHostChildren: true,
      observeHost: true,
      surface: {
        createRoot: () => {
          rootSurface = createFakeSurface('reopen-root')
          return rootSurface
        },
        createSubmenu: () => createFakeSurface('reopen-sub'),
        positionRoot: () => {},
        positionSubmenu: () => {},
        disposeSurface: surface => {
          surface.panel.remove()
        }
      }
    })

    session.open({ isInstant: true, takeFocus: false, suppressFocusVisible: true })
    await flushFrames(2)
    expect(rootSurface).toBeDefined()
    expect(rootSurface!.panel.isConnected).toBe(true)

    // 触发非瞬时关闭，随即在退场动画完成前再次 open()。
    session.close({ isInstant: false })
    session.open({ isInstant: true, takeFocus: false, suppressFocusVisible: true })
    await flushFrames(3)

    // 面板必须仍在 DOM 中且保留菜单项，未被旧 closeRootAfterPresence 清理。
    expect(rootSurface!.panel.isConnected).toBe(true)
    expect(rootSurface!.content.contains(itemA)).toBe(true)

    // 动态追加的菜单项仍能通过恢复的内容观察器同步进根面板。
    const itemB = createMenuItem('Beta')
    host.append(itemB)
    await flushFrames(2)
    expect(rootSurface!.content.contains(itemB)).toBe(true)

    // Escape 仲裁仍有效。
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(onRequestClose).toHaveBeenCalledWith('escape')
  })
})
