import { describe, expect, it, vi } from 'vite-plus/test'

import { Command } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu'
import * as MenuService from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu/service'
import { computeDisabledCommands, createMenuStateReporter, createMenuStateRuntime } from '../state'

const libraryCommands: Command[] = [
  Command.CommandRefreshLibrary,
  Command.CommandToggleFilterBar,
  Command.CommandFocusSearch
]

describe('菜单可用性', () => {
  it('在资源库页且两端历史都可走时不置灰任何项', () => {
    expect(computeDisabledCommands({ path: '/library', canGoBack: true, canGoForward: true })).toEqual([])
  })

  it('离开资源库页后把三条页面命令全部置灰', () => {
    const disabled = computeDisabledCommands({ path: '/tags', canGoBack: true, canGoForward: true })
    expect(disabled).toEqual(libraryCommands)
  })

  it('历史栈决定后退与前进的置灰，与路由无关', () => {
    expect(computeDisabledCommands({ path: '/library', canGoBack: false, canGoForward: false })).toEqual([
      Command.CommandNavigateBack,
      Command.CommandNavigateForward
    ])
    expect(computeDisabledCommands({ path: '/tags', canGoBack: false, canGoForward: false })).toEqual([
      ...libraryCommands,
      Command.CommandNavigateBack,
      Command.CommandNavigateForward
    ])
  })
})

describe('上报去重', () => {
  it('集合没变就不调用，变了才调用', async () => {
    const report = vi.fn<(disabled: Command[]) => Promise<void>>(async () => {})
    const sync = createMenuStateReporter(report)

    await sync({ path: '/library', canGoBack: true, canGoForward: true })
    expect(report).toHaveBeenCalledTimes(1)

    // 同一集合：不重复上报，避免无意义地重建整棵菜单。
    await sync({ path: '/library', canGoBack: true, canGoForward: true })
    expect(report).toHaveBeenCalledTimes(1)

    await sync({ path: '/library', canGoBack: false, canGoForward: true })
    expect(report).toHaveBeenCalledTimes(2)
    expect(report).toHaveBeenLastCalledWith([Command.CommandNavigateBack])

    await sync({ path: '/tags', canGoBack: false, canGoForward: true })
    expect(report).toHaveBeenCalledTimes(3)
    expect(report).toHaveBeenLastCalledWith([...libraryCommands, Command.CommandNavigateBack])
  })

  it('上报失败不记住这个集合，下一次相同输入会重试', async () => {
    const report = vi
      .fn<(disabled: Command[]) => Promise<void>>()
      .mockRejectedValueOnce(new Error('bridge unavailable'))
      .mockResolvedValue(undefined)
    const sync = createMenuStateReporter(report)
    const input = { path: '/library', canGoBack: true, canGoForward: true }

    await expect(sync(input)).rejects.toThrow('bridge unavailable')
    await sync(input)
    expect(report).toHaveBeenCalledTimes(2)
  })
})

describe('WailsMenuStateRuntime 动态可用性', () => {
  it('晚注入 window._wails 后 isAvailable 动态转为 true 并触发上报', async () => {
    const reportSpy = vi.spyOn(MenuService, 'ReportDisabledCommands').mockResolvedValue(undefined)
    const runtime = createMenuStateRuntime()

    try {
      expect(runtime.isAvailable).toBe(false)
      await runtime.reportDisabled([Command.CommandNavigateBack])
      expect(reportSpy).not.toHaveBeenCalled()

      vi.stubGlobal('window', { _wails: { environment: { OS: 'windows', Arch: 'amd64' } } })
      expect(runtime.isAvailable).toBe(true)

      await runtime.reportDisabled([Command.CommandNavigateBack])
      expect(reportSpy).toHaveBeenCalledWith([Command.CommandNavigateBack])
    } finally {
      vi.unstubAllGlobals()
      reportSpy.mockRestore()
    }
  })
})
