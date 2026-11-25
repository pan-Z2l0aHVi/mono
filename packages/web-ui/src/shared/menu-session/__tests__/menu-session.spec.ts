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

function createMenuItem(text: string, options?: { submenu?: boolean; disabled?: boolean }): HTMLElement {
  const item = document.createElement('web-ui-dropdown-item')
  item.textContent = text
  if (options?.submenu) item.setAttribute('submenu', '')
  if (options?.disabled) item.setAttribute('disabled', '')
  return item
}

async function flushFrames(count = 2) {
  for (let i = 0; i < count; i++) {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  }
}

afterEach(() => {
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
    const session = createMenuSession<MenuSurface>({
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
    const session = createMenuSession<MenuSurface>({
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
    const session = createMenuSession<MenuSurface>({
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
})
