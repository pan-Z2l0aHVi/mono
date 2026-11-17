import { Events } from '@wailsio/runtime'

import { MenuCommand as MenuCommandEvent } from '../../../bindings/events'
import { Command } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu'
import { hasWailsRuntime } from '../runtime'

/**
 * 菜单命令的分发面。
 *
 * 菜单点击在 Go 侧只有一个事件出口，载荷是 {command, payload}；这里把它拆成
 * 按命令名注册的回调。浏览器预览没有 Wails runtime，订阅直接返回空 disposer，
 * 调用方不必自己判空。
 */
export interface MenuCommandHandlers {
  addResource(): void
  importFromClipboard(): void
  importFromLink(): void
  refreshLibrary(): void
  toggleSidebar(): void
  toggleFilterBar(): void
  focusSearch(): void
  navigateBack(): void
  navigateForward(): void
  openSettings(): void
  openDocumentation(): void
  copyAsPlainText(): void
  pasteAsPlainText(): void
}

/** 命令名 → 处理函数名的映射。纯函数，可在 Node 环境单测。 */
const HANDLER_BY_COMMAND: Record<string, keyof MenuCommandHandlers> = {
  [Command.CommandAddResource]: 'addResource',
  [Command.CommandImportFromClipboard]: 'importFromClipboard',
  [Command.CommandImportFromLink]: 'importFromLink',
  [Command.CommandRefreshLibrary]: 'refreshLibrary',
  [Command.CommandToggleSidebar]: 'toggleSidebar',
  [Command.CommandToggleFilterBar]: 'toggleFilterBar',
  [Command.CommandFocusSearch]: 'focusSearch',
  [Command.CommandNavigateBack]: 'navigateBack',
  [Command.CommandNavigateForward]: 'navigateForward',
  [Command.CommandOpenSettings]: 'openSettings',
  [Command.CommandOpenDocumentation]: 'openDocumentation',
  [Command.CommandCopyAsPlainText]: 'copyAsPlainText',
  [Command.CommandPasteAsPlainText]: 'pasteAsPlainText'
}

/**
 * 判断事件载荷是否是已知菜单命令。
 *
 * 推送不可信：一行坏数据不该打断界面，所以畸形载荷一律忽略而不是抛出。
 * reload-window、open-devtools、maximise-window、toggle-window-mode 与 check-for-updates 由 Go 侧直接执行，
 * 不经前端，因此这里也不认它们。
 */
export function isMenuCommand(value: unknown): value is { command: Command } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const event = value as Record<string, unknown>
  if (typeof event.command !== 'string') return false
  return event.command in HANDLER_BY_COMMAND
}

/**
 * 把一条命令分派给对应的处理函数。返回是否真正处理了它。
 * 抽成纯函数是为了让「哪个命令打到哪里」能被单测直接覆盖。
 */
export function dispatchMenuCommand(value: unknown, handlers: MenuCommandHandlers): boolean {
  if (!isMenuCommand(value)) return false
  const handlerName = HANDLER_BY_COMMAND[value.command]
  const handler = handlers[handlerName]
  if (typeof handler !== 'function') return false
  handler()
  return true
}

/** 订阅菜单命令；返回 unsubscribe。 */
export function onMenuCommand(handlers: MenuCommandHandlers): () => void {
  if (!hasWailsRuntime()) return () => {}
  return Events.On(MenuCommandEvent, event => {
    dispatchMenuCommand(event.data, handlers)
  })
}
