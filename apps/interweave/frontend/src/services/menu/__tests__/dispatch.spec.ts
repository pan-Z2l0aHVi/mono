import { describe, expect, it, vi } from 'vite-plus/test'

import { dispatchMenuCommand, isMenuCommand, type MenuCommandHandlers } from '../index'

type SpiedHandlers = MenuCommandHandlers & Record<keyof MenuCommandHandlers, ReturnType<typeof vi.fn>>

function handlers(): SpiedHandlers {
  const noop = () => {}
  return {
    addResource: vi.fn<() => void>(noop),
    importFromClipboard: vi.fn<() => void>(noop),
    importFromLink: vi.fn<() => void>(noop),
    refreshLibrary: vi.fn<() => void>(noop),
    toggleSidebar: vi.fn<() => void>(noop),
    toggleFilterBar: vi.fn<() => void>(noop),
    focusSearch: vi.fn<() => void>(noop),
    navigateBack: vi.fn<() => void>(noop),
    navigateForward: vi.fn<() => void>(noop),
    openSettings: vi.fn<() => void>(noop),
    openDocumentation: vi.fn<() => void>(noop),
    copyAsPlainText: vi.fn<() => void>(noop),
    pasteAsPlainText: vi.fn<() => void>(noop)
  } as SpiedHandlers
}

describe('menu command dispatch', () => {
  it('把每条命令打给对应的处理函数', () => {
    const cases: [string, keyof MenuCommandHandlers][] = [
      ['add-resource', 'addResource'],
      ['import-from-clipboard', 'importFromClipboard'],
      ['import-from-link', 'importFromLink'],
      ['refresh-library', 'refreshLibrary'],
      ['toggle-sidebar', 'toggleSidebar'],
      ['toggle-filter-bar', 'toggleFilterBar'],
      ['focus-search', 'focusSearch'],
      ['navigate-back', 'navigateBack'],
      ['navigate-forward', 'navigateForward'],
      ['open-settings', 'openSettings'],
      ['open-documentation', 'openDocumentation'],
      ['copy-as-plain-text', 'copyAsPlainText'],
      ['paste-as-plain-text', 'pasteAsPlainText']
    ]
    for (const [command, handlerName] of cases) {
      const target = handlers()
      expect(dispatchMenuCommand({ command, payload: {} }, target)).toBe(true)
      expect(target[handlerName]).toHaveBeenCalledTimes(1)
      // 一条命令只该打到一个处理函数上：分发不做广播。先把「其他处理函数」筛出来，
      // 再在循环外断言，避免把 expect 写进条件分支。
      const others = Object.entries(target).filter(([otherName]) => otherName !== handlerName)
      expect(others.filter(([, spy]) => spy.mock.calls.length > 0)).toEqual([])
    }
  })

  // reload-window、open-devtools、maximise-window 与 check-for-updates 由 Go 侧直接执行。
  // 前端认了它们反而会多出一条无人接管的命令。
  it('不认由 Go 侧直接执行的命令', () => {
    const target = handlers()
    for (const command of [
      'reload-window',
      'open-devtools',
      'maximise-window',
      'check-for-updates',
      'zoom-in',
      'zoom-out',
      'zoom-reset'
    ]) {
      expect(dispatchMenuCommand({ command }, target)).toBe(false)
    }
    for (const spy of Object.values(target)) expect(spy).not.toHaveBeenCalled()
  })

  // 旧命令名不再合法：留着它们会让两侧契约静默漂移。
  it('不认已删除的旧命令名', () => {
    const target = handlers()
    for (const command of ['paste-files', 'refresh-availability']) {
      expect(dispatchMenuCommand({ command }, target)).toBe(false)
    }
    for (const spy of Object.values(target)) expect(spy).not.toHaveBeenCalled()
  })

  it('忽略畸形载荷', () => {
    const target = handlers()
    for (const value of [null, undefined, 'add-resource', 42, [], {}, { command: 1 }, { command: '' }]) {
      expect(dispatchMenuCommand(value, target)).toBe(false)
    }
    for (const spy of Object.values(target)) expect(spy).not.toHaveBeenCalled()
  })

  it('缺少对应处理函数时返回 false 而不是抛错', () => {
    const partial = { ...handlers(), toggleSidebar: undefined } as unknown as MenuCommandHandlers
    expect(dispatchMenuCommand({ command: 'toggle-sidebar' }, partial)).toBe(false)
  })

  it('isMenuCommand 只认载荷对象', () => {
    expect(isMenuCommand({ command: 'add-resource' })).toBe(true)
    expect(isMenuCommand({ command: 'nope' })).toBe(false)
    expect(isMenuCommand('add-resource')).toBe(false)
  })
})
