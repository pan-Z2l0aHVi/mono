// @vitest-environment jsdom
// cspell:ignore maximised

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, h, nextTick } from 'vue'

import { formatWindowsAccelerator, type MenuTreeRuntime } from '@/services/menu/tree'

import { Command, type MenuItem } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu'
import WindowsTitleBar from '../WindowsTitleBar.vue'

const sampleMenu: MenuItem[] = [
  {
    label: 'Interweave',
    children: [
      { label: '关于 Interweave', role: 'about' },
      { label: '', separator: true },
      { label: '设置…', accelerator: 'CmdOrCtrl+,', command: Command.CommandOpenSettings },
      { label: '退出 Interweave', accelerator: 'CmdOrCtrl+Q', role: 'quit' }
    ]
  },
  {
    label: '文件',
    children: [
      { label: '导入资源', command: Command.CommandAddResource },
      { label: '导出…', disabled: true }
    ]
  }
]

function createStubRuntime(initial: MenuItem[] = sampleMenu) {
  let listener: ((items: MenuItem[]) => void) | null = null
  let maximised = false
  const invokeItem = vi.fn<(command: Command, role: string) => Promise<void>>(async () => {})
  const minimiseWindow = vi.fn<() => Promise<void>>(async () => {})
  const toggleMaximiseWindow = vi.fn<() => Promise<void>>(async () => {
    maximised = !maximised
  })
  const closeWindow = vi.fn<() => Promise<void>>(async () => {})

  const runtime: MenuTreeRuntime = {
    isAvailable: true,
    getMenu: async () => initial,
    onMenuChanged: cb => {
      listener = cb
      return () => {
        listener = null
      }
    },
    invokeItem,
    minimiseWindow,
    toggleMaximiseWindow,
    isWindowMaximised: async () => maximised,
    closeWindow
  }

  return {
    runtime,
    invokeItem,
    minimiseWindow,
    toggleMaximiseWindow,
    closeWindow,
    pushMenu: (items: MenuItem[]) => listener?.(items)
  }
}

describe('WindowsTitleBar', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('桌面端平铺顶级菜单、触发命令与窗口三键，并支持快捷键', async () => {
    const stub = createStubRuntime()
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({
      render: () => h(WindowsTitleBar, { mobile: false, runtime: stub.runtime })
    })
    app.mount(host)

    try {
      await nextTick()
      await Promise.resolve()
      await nextTick()

      expect(host.querySelectorAll('[data-windows-top-menu]').length).toBe(2)
      expect(host.querySelector('[data-windows-menu-hamburger]')).toBeNull()
      expect(host.querySelector('[data-window-drag]')).toBeTruthy()

      const settingsItem = [...host.querySelectorAll<HTMLElement>('web-ui-dropdown-item')].find(item =>
        item.textContent?.includes('设置…')
      )
      settingsItem!.click()
      expect(stub.invokeItem).toHaveBeenCalledWith(Command.CommandOpenSettings, '')

      const disabledItem = [...host.querySelectorAll<HTMLElement>('web-ui-dropdown-item')].find(item =>
        item.textContent?.includes('导出…')
      )
      disabledItem!.click()
      expect(stub.invokeItem).toHaveBeenCalledTimes(1)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', ctrlKey: true, cancelable: true }))
      expect(stub.invokeItem).toHaveBeenCalledWith(Command.$zero, 'quit')

      host.querySelector<HTMLButtonElement>('button[aria-label="最小化"]')!.click()
      expect(stub.minimiseWindow).toHaveBeenCalledOnce()

      host.querySelector<HTMLButtonElement>('button[aria-label="最大化"]')!.click()
      await nextTick()
      await Promise.resolve()
      await nextTick()
      expect(stub.toggleMaximiseWindow).toHaveBeenCalledOnce()
      expect(host.querySelector('button[aria-label="还原"]')).toBeTruthy()

      host.querySelector<HTMLButtonElement>('button[aria-label="关闭"]')!.click()
      expect(stub.closeWindow).toHaveBeenCalledOnce()
    } finally {
      app.unmount()
      host.remove()
    }
  })

  it('移动端断点将顶级菜单折叠进单个汉堡按钮', async () => {
    const stub = createStubRuntime()
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({
      render: () => h(WindowsTitleBar, { mobile: true, runtime: stub.runtime })
    })
    app.mount(host)

    try {
      await nextTick()
      await Promise.resolve()
      await nextTick()

      expect(host.querySelector('[data-windows-menu-hamburger]')).toBeTruthy()
      expect(host.querySelectorAll('[data-windows-top-menu]').length).toBe(0)
    } finally {
      app.unmount()
      host.remove()
    }
  })

  it('将 Wails 快捷键文案格式化为 Windows 习惯显示', () => {
    expect(formatWindowsAccelerator('CmdOrCtrl+Shift+V')).toBe('Ctrl+Shift+V')
    expect(formatWindowsAccelerator('CmdOrCtrl+plus')).toBe('Ctrl++')
    expect(formatWindowsAccelerator('backspace')).toBe('Backspace')
  })
})
