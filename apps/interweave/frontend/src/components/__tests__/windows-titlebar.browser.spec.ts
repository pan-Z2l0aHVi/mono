// cspell:ignore maximised
import '@/assets/global.css'
import '@greypan/web-ui'

import type { WebUiDropdown } from '@greypan/web-ui'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import type { MenuTreeRuntime } from '@/services/menu/tree'

import { Command, type MenuItem } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu'
import WindowsTitleBar from '../WindowsTitleBar.vue'

const menuFixture: MenuItem[] = [
  {
    label: '文件',
    children: [{ label: '导入资源', command: Command.CommandAddResource }]
  },
  {
    label: '编辑',
    children: [
      { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      { label: '复制为纯文本', command: Command.CommandCopyAsPlainText }
    ]
  }
]

const cleanups: Array<() => void> = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

async function waitFor(predicate: () => boolean, label: string, maxFrames = 120): Promise<void> {
  for (let i = 0; i < maxFrames; i += 1) {
    if (predicate()) return
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  throw new Error(`条件在 ${maxFrames} 帧内未成立：${label}`)
}

function queryPortalPanels(): HTMLElement[] {
  const overlayRoot = document.querySelector<HTMLElement>('[data-wui-overlay-root]')?.shadowRoot
  if (!overlayRoot) return []
  return [...overlayRoot.querySelectorAll<HTMLElement>('.wui-menu-portal-overlay')]
}

describe('WindowsTitleBar：真实 portal 菜单、焦点恢复与关闭（浏览器）', () => {
  it('切换顶级菜单不覆盖原 textarea 焦点快照，点选编辑菜单叶子项后关闭菜单并恢复焦点选区', async () => {
    const invokeItem = vi.fn<(command: Command, role: string) => Promise<void>>(async () => {})
    const runtime: MenuTreeRuntime = {
      isAvailable: true,
      getMenu: async () => menuFixture,
      onMenuChanged: () => () => {},
      invokeItem,
      minimiseWindow: async () => {},
      toggleMaximiseWindow: async () => {},
      isWindowMaximised: async () => false,
      closeWindow: async () => {}
    }

    const host = document.createElement('div')
    document.body.append(host)
    const textarea = document.createElement('textarea')
    textarea.value = 'hello interweave'
    document.body.append(textarea)

    const app = createApp({
      render: () => h(WindowsTitleBar, { mobile: false, runtime })
    })
    app.mount(host)
    cleanups.push(() => {
      app.unmount()
      host.remove()
      textarea.remove()
    })

    await waitFor(() => host.querySelectorAll('[data-windows-top-menu]').length === 2, '顶级菜单渲染')

    // 聚焦 textarea 并选中 "interweave"
    textarea.focus()
    textarea.setSelectionRange(6, 16)
    expect(document.activeElement).toBe(textarea)

    const dropdowns = [...host.querySelectorAll<WebUiDropdown>('web-ui-dropdown[data-windows-top-menu]')]
    const fileDropdown = dropdowns[0]!
    const editDropdown = dropdowns[1]!
    const fileTrigger = fileDropdown.querySelector<HTMLButtonElement>('button[slot="trigger"]')!
    const editTrigger = editDropdown.querySelector<HTMLButtonElement>('button[slot="trigger"]')!

    // 1. 先打开「文件」菜单，等到真实 portal panel 挂载，并把焦点移入菜单项内部 Shadow DOM
    fileTrigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    fileTrigger.click()
    await waitFor(
      () => fileDropdown.open && queryPortalPanels().some(panel => panel.textContent?.includes('导入资源')),
      '文件菜单 portal panel 打开'
    )
    const filePanel = queryPortalPanels().find(panel => panel.textContent?.includes('导入资源'))!
    const fileFirstItem = filePanel.querySelector<HTMLElement>('web-ui-dropdown-item')!
    fileFirstItem.focus()
    await waitFor(() => Boolean(fileFirstItem.shadowRoot?.activeElement), '文件菜单首项 Shadow DOM 获得焦点')

    // 2. 不点页面，直接切到「编辑」菜单（此时焦点正位于 portal 菜单项的 Shadow DOM 内，验证不覆盖 textarea 快照）
    editTrigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    editTrigger.click()
    await waitFor(
      () => editDropdown.open && queryPortalPanels().some(panel => panel.textContent?.includes('粘贴')),
      '编辑菜单 portal panel 打开'
    )

    // 3. 仅在已打开的 portal panel 中定位并点击「粘贴」叶子项
    const editPanel = queryPortalPanels().find(panel => panel.textContent?.includes('粘贴'))!
    const pasteItem = [...editPanel.querySelectorAll<HTMLElement>('web-ui-dropdown-item')].find(item =>
      item.textContent?.includes('粘贴')
    )!
    pasteItem.click()
    await nextTick()

    // 4. 断言：菜单关闭 + 焦点与选区恢复回 textarea + 粘贴走 Go 剪贴板命令
    expect(editDropdown.open).toBe(false)
    expect(document.activeElement).toBe(textarea)
    expect(textarea.selectionStart).toBe(6)
    expect(textarea.selectionEnd).toBe(16)
    expect(invokeItem).toHaveBeenCalledWith(Command.CommandPasteAsPlainText, '')
  })

  it('顶部菜单首次需点击展开，展开后悬停即时切换，关闭后恢复点击触发', async () => {
    const runtime: MenuTreeRuntime = {
      isAvailable: true,
      getMenu: async () => menuFixture,
      onMenuChanged: () => () => {},
      invokeItem: async () => {},
      minimiseWindow: async () => {},
      toggleMaximiseWindow: async () => {},
      isWindowMaximised: async () => false,
      closeWindow: async () => {}
    }

    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({
      render: () => h(WindowsTitleBar, { mobile: false, runtime })
    })
    app.mount(host)
    cleanups.push(() => {
      app.unmount()
      host.remove()
    })

    await waitFor(() => host.querySelectorAll('[data-windows-top-menu]').length === 2, '顶级菜单渲染')

    const dropdowns = [...host.querySelectorAll<WebUiDropdown>('web-ui-dropdown[data-windows-top-menu]')]
    const fileDropdown = dropdowns[0]!
    const editDropdown = dropdowns[1]!
    const fileTrigger = fileDropdown.querySelector<HTMLButtonElement>('button[slot="trigger"]')!

    // 1. 初始态：仅悬停不展开
    fileDropdown.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    editDropdown.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    await nextTick()
    expect(fileDropdown.open).toBe(false)
    expect(editDropdown.open).toBe(false)

    // 2. 首次点击「文件」展开
    fileTrigger.click()
    await waitFor(
      () => fileDropdown.open && queryPortalPanels().some(panel => panel.textContent?.includes('导入资源')),
      '文件菜单展开'
    )

    // 3. 展开态下鼠标悬停「编辑」即时切换
    editDropdown.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    await waitFor(
      () =>
        !fileDropdown.open &&
        editDropdown.open &&
        queryPortalPanels().some(panel => panel.textContent?.includes('粘贴')),
      '悬停切换到编辑菜单'
    )

    // 4. 触摸指针悬停不触发切换
    fileDropdown.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }))
    await nextTick()
    expect(editDropdown.open).toBe(true)
    expect(fileDropdown.open).toBe(false)

    // 5. 鼠标悬停回「文件」再次切换
    fileDropdown.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    await waitFor(
      () =>
        fileDropdown.open &&
        !editDropdown.open &&
        queryPortalPanels().some(panel => panel.textContent?.includes('导入资源')),
      '悬停切回文件菜单'
    )

    // 6. 点击页面外部关闭菜单后，恢复「必须先点击」逻辑，悬停不再展开
    // 等待 outsideClickGuard 的 macrotask disarm，模拟真实用户的后续点击。
    await new Promise(resolve => setTimeout(resolve, 0))
    document.body.click()
    await waitFor(() => !fileDropdown.open && !editDropdown.open, '点击外部关闭菜单')

    editDropdown.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    await nextTick()
    expect(fileDropdown.open).toBe(false)
    expect(editDropdown.open).toBe(false)
  })
})
