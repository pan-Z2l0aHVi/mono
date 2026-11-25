// @vitest-environment jsdom
// cspell:ignore maximised

import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import type { MenuTreeRuntime } from '@/services/menu/tree'

import { Command, type MenuItem } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu'
import { createWindowsTitleBarController } from '../windowsTitleBarController'

const sampleMenu: MenuItem[] = [
  {
    label: 'Interweave',
    children: [
      { label: '设置…', accelerator: 'CmdOrCtrl+,', command: Command.CommandOpenSettings },
      { label: '退出 Interweave', accelerator: 'CmdOrCtrl+Q', role: 'quit' }
    ]
  },
  {
    label: '编辑',
    children: [
      { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'select-all' },
      { label: '复制为纯文本', command: Command.CommandCopyAsPlainText },
      { label: '禁用项', disabled: true, command: Command.CommandAddResource }
    ]
  }
]

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => {
    resolve = res
  })
  return { promise, resolve }
}

function createFakeRuntime(overrides: Partial<MenuTreeRuntime> = {}) {
  let listener: ((items: MenuItem[]) => void) | null = null
  let maximised = false
  const invokeItem = vi.fn<(command: Command, role: string) => Promise<void>>(async () => {})
  const minimiseWindow = vi.fn<() => Promise<void>>(async () => {})
  const toggleMaximiseWindow = vi.fn<() => Promise<void>>(async () => {
    maximised = !maximised
  })
  const closeWindow = vi.fn<() => Promise<void>>(async () => {})
  const onMenuChanged = vi.fn<(cb: (items: MenuItem[]) => void) => () => void>(cb => {
    listener = cb
    return () => {
      listener = null
    }
  })

  const runtime: MenuTreeRuntime = {
    isAvailable: true,
    getMenu: async () => sampleMenu,
    onMenuChanged,
    invokeItem,
    minimiseWindow,
    toggleMaximiseWindow,
    isWindowMaximised: async () => maximised,
    closeWindow,
    ...overrides
  }

  return {
    runtime,
    invokeItem,
    minimiseWindow,
    toggleMaximiseWindow,
    closeWindow,
    onMenuChanged,
    pushMenu: (items: MenuItem[]) => listener?.(items)
  }
}

describe('WindowsTitleBarController', () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('menu:tree-changed 先于初始 getMenu 响应到达时，不被旧快照覆盖', async () => {
    const initialMenu = createDeferred<MenuItem[]>()
    const stub = createFakeRuntime({ getMenu: () => initialMenu.promise })
    const controller = createWindowsTitleBarController({ runtime: stub.runtime, getHeader: () => null })

    controller.start()
    try {
      const newerMenu: MenuItem[] = [...sampleMenu, { label: '开发', children: [] }]
      stub.pushMenu(newerMenu)
      expect(controller.menuItems.value).toEqual(newerMenu)

      initialMenu.resolve(sampleMenu)
      await Promise.resolve()
      await Promise.resolve()
      expect(controller.menuItems.value).toEqual(newerMenu)
    } finally {
      controller.dispose()
    }
  })

  it('dispose 后丢弃在途 getMenu 与 isWindowMaximised 异步回写', async () => {
    const initialMenu = createDeferred<MenuItem[]>()
    const initialMaximised = createDeferred<boolean>()
    const stub = createFakeRuntime({
      getMenu: () => initialMenu.promise,
      isWindowMaximised: () => initialMaximised.promise
    })
    const controller = createWindowsTitleBarController({ runtime: stub.runtime, getHeader: () => null })

    controller.start()
    controller.dispose()

    initialMenu.resolve(sampleMenu)
    initialMaximised.resolve(true)
    await Promise.resolve()
    await Promise.resolve()

    expect(controller.menuItems.value).toEqual([])
    expect(controller.isMaximised.value).toBe(false)
  })

  it('start 幂等，重复调用不会重复注册菜单订阅或键盘监听', async () => {
    const stub = createFakeRuntime()
    const controller = createWindowsTitleBarController({ runtime: stub.runtime, getHeader: () => null })

    controller.start()
    controller.start()
    await Promise.resolve()
    try {
      expect(stub.onMenuChanged).toHaveBeenCalledTimes(1)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', ctrlKey: true, cancelable: true }))
      expect(stub.invokeItem).toHaveBeenCalledTimes(1)
      expect(stub.invokeItem).toHaveBeenCalledWith(Command.$zero, 'quit')
    } finally {
      controller.dispose()
    }
  })

  it('穿透 ShadowRoot 捕获页面输入框焦点，且连续切菜单不覆盖原焦点快照', async () => {
    const stub = createFakeRuntime()
    const header = document.createElement('header')
    header.setAttribute('data-windows-titlebar', '')
    const dropdown = document.createElement('web-ui-dropdown') as HTMLElement & {
      open?: boolean
      hide?: (opts?: { instant?: boolean }) => void
    }
    dropdown.setAttribute('open', '')
    dropdown.open = true

    const callOrder: string[] = []
    dropdown.hide = vi.fn<(opts?: { instant?: boolean }) => void>(() => {
      callOrder.push('hide')
      dropdown.open = false
      dropdown.removeAttribute('open')
      // 模拟 dropdown.hide 把焦点退回 trigger，验证 restoreFocusAndSelection 紧随其后覆盖。
      trigger.focus()
    })
    const trigger = document.createElement('button')
    dropdown.append(trigger)
    header.append(dropdown)
    document.body.append(header)

    // 在开放 ShadowRoot 内放置可编辑 input，验证 deepestActiveElement 穿透捕获与恢复。
    const shadowHost = document.createElement('div')
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' })
    const input = document.createElement('input')
    input.value = 'hello interweave'
    shadowRoot.append(input)
    document.body.append(shadowHost)

    const originalFocus = input.focus.bind(input)
    vi.spyOn(input, 'focus').mockImplementation(opts => {
      callOrder.push('restore-focus')
      originalFocus(opts)
    })

    input.focus()
    input.setSelectionRange(6, 16)
    callOrder.length = 0

    const controller = createWindowsTitleBarController({ runtime: stub.runtime, getHeader: () => header })
    controller.start()
    try {
      controller.captureFocusAndSelection()

      // 焦点移至标题栏内 trigger 后再次 capture，不得覆盖原 Shadow DOM 输入框快照。
      trigger.focus()
      controller.captureFocusAndSelection()

      controller.selectItem({ label: '粘贴', role: 'paste' })

      expect(callOrder).toEqual(['hide', 'restore-focus'])
      expect(shadowRoot.activeElement).toBe(input)
      expect(input.selectionStart).toBe(6)
      expect(input.selectionEnd).toBe(16)
      expect(stub.invokeItem).toHaveBeenCalledWith(Command.CommandPasteAsPlainText, '')
    } finally {
      controller.dispose()
    }
  })

  it('编辑角色执行 WebView 动作，禁用项与分隔线不触发任何调用', () => {
    const stub = createFakeRuntime()
    const execSpy = vi.fn<(commandId: string) => boolean>(() => true)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execSpy })

    const controller = createWindowsTitleBarController({ runtime: stub.runtime, getHeader: () => null })
    controller.selectItem({ label: '禁用项', disabled: true, command: Command.CommandAddResource })
    controller.selectItem({ label: '', separator: true })
    expect(stub.invokeItem).not.toHaveBeenCalled()
    expect(execSpy).not.toHaveBeenCalled()

    controller.selectItem({ label: '全选', role: 'select-all' })
    expect(execSpy).toHaveBeenCalledWith('selectAll')
    expect(stub.invokeItem).not.toHaveBeenCalled()

    controller.dispose()
  })
})
