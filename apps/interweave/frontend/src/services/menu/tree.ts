// cspell:ignore cmdorctrl optionoralt maximised

import { Events, Window as WailsWindow } from '@wailsio/runtime'

import { MenuTreeChanged } from '../../../bindings/events'
import type { Command, MenuItem } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu'
import * as MenuService from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu/service'
import { hasWailsRuntime } from '../runtime'

export interface MenuTreeRuntime {
  readonly isAvailable: boolean
  getMenu(): Promise<MenuItem[]>
  onMenuChanged(listener: (items: MenuItem[]) => void): () => void
  invokeItem(command: Command, role: string): Promise<void>
  minimiseWindow(): Promise<void>
  toggleMaximiseWindow(): Promise<void>
  isWindowMaximised(): Promise<boolean>
  closeWindow(): Promise<void>
}

class WailsMenuTreeRuntime implements MenuTreeRuntime {
  /** 动态读取 runtime 注入态，避免模块静态 import 早于 wails:runtime-config-ready 导致永久为 false。 */
  get isAvailable(): boolean {
    return hasWailsRuntime()
  }

  async getMenu(): Promise<MenuItem[]> {
    if (!this.isAvailable) return []
    return await MenuService.GetMenu()
  }

  onMenuChanged(listener: (items: MenuItem[]) => void): () => void {
    if (!this.isAvailable) return () => {}
    return Events.On(MenuTreeChanged, event => {
      if (Array.isArray(event.data)) listener(event.data as MenuItem[])
    })
  }

  async invokeItem(command: Command, role: string): Promise<void> {
    if (!this.isAvailable) return
    await MenuService.InvokeMenuItem(command, role)
  }

  async minimiseWindow(): Promise<void> {
    if (!this.isAvailable) return
    await WailsWindow.Minimise()
  }

  async toggleMaximiseWindow(): Promise<void> {
    if (!this.isAvailable) return
    await WailsWindow.ToggleMaximise()
  }

  async isWindowMaximised(): Promise<boolean> {
    if (!this.isAvailable) return false
    return await WailsWindow.IsMaximised()
  }

  async closeWindow(): Promise<void> {
    if (!this.isAvailable) return
    await WailsWindow.Close()
  }
}

const runtime = new WailsMenuTreeRuntime()

export function createMenuTreeRuntime(): MenuTreeRuntime {
  return runtime
}

/**
 * 浏览器原生编辑命令由当前 WebView 焦点直接承担，不经 Go 往返。
 * 注意：不包含 paste——Chromium 安全策略会拒绝 document.execCommand('paste')，
 * 粘贴动作由 WindowsTitleBar 走 Go 剪贴板读取（CommandPasteAsPlainText）完成。
 */
const WEBVIEW_EDIT_ROLE_COMMAND: Record<string, string> = {
  undo: 'undo',
  redo: 'redo',
  cut: 'cut',
  copy: 'copy',
  delete: 'delete',
  'select-all': 'selectAll'
}

export function isWebViewEditRole(role?: string): boolean {
  return !!role && role in WEBVIEW_EDIT_ROLE_COMMAND
}

export function executeWebViewEditRole(role: string): boolean {
  const execName = WEBVIEW_EDIT_ROLE_COMMAND[role]
  if (!execName || typeof document.execCommand !== 'function') return false
  return document.execCommand(execName)
}

/** 将 Go 侧 Wails 快捷键格式转为 Windows 顶栏展示文案。 */
export function formatWindowsAccelerator(accelerator?: string): string {
  if (!accelerator) return ''
  return accelerator
    .split('+')
    .map(part => {
      const normalized = part.trim().toLowerCase()
      if (normalized === 'cmdorctrl' || normalized === 'ctrl') return 'Ctrl'
      if (normalized === 'optionoralt' || normalized === 'alt') return 'Alt'
      if (normalized === 'shift') return 'Shift'
      if (normalized === 'plus') return '+'
      if (normalized === 'backspace') return 'Backspace'
      return part.length === 1 ? part.toUpperCase() : part
    })
    .join('+')
}

/**
 * 判定键盘事件是否命中某个 Windows 自定义菜单快捷键。
 * 仅处理非 WebView 原生编辑类的组合键，避免拦截输入框里的 Ctrl+C/V/X/Z/A/Backspace。
 */
export function matchWindowsAccelerator(event: KeyboardEvent, item: MenuItem): boolean {
  if (!item.accelerator || item.disabled || item.separator || item.role === 'paste' || isWebViewEditRole(item.role)) {
    return false
  }
  const parts = item.accelerator
    .split('+')
    .map(part => part.trim().toLowerCase())
    .filter(Boolean)
  if (!parts.length) return false

  const keyToken = parts[parts.length - 1]
  const modifiers = new Set(parts.slice(0, -1))
  const expectCtrl = modifiers.has('cmdorctrl') || modifiers.has('ctrl')
  const expectShift = modifiers.has('shift')
  const expectAlt = modifiers.has('optionoralt') || modifiers.has('alt')
  const isFunctionKey = /^f([1-9]|1[0-2])$/.test(keyToken)

  if (!expectCtrl && !isFunctionKey) return false
  if (event.ctrlKey !== expectCtrl || event.altKey !== expectAlt || event.metaKey) return false

  const pressed = event.key.toLowerCase()
  if (keyToken === 'plus') {
    // 美式键盘上 Ctrl+= 与 Ctrl++（带 Shift）均视为放大。
    return pressed === '+' || pressed === '='
  }
  if (event.shiftKey !== expectShift) return false
  return pressed === keyToken
}

/** 深度遍历菜单树，查找首个命中当前按键事件的启用条目。 */
export function findMenuItemByShortcut(items: readonly MenuItem[], event: KeyboardEvent): MenuItem | null {
  for (const item of items) {
    if (item.children?.length) {
      const nested = findMenuItemByShortcut(item.children, event)
      if (nested) return nested
      continue
    }
    if (matchWindowsAccelerator(event, item)) return item
  }
  return null
}
