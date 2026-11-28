// cspell:ignore maximised
import type { WebUiDropdown } from '@greypan/web-ui'
import { ref, type Ref } from 'vue'

import { deepestActiveElement } from '@/composables/plainTextClipboard'
import {
  executeWebViewEditRole,
  findMenuItemByShortcut,
  isWebViewEditRole,
  type MenuTreeRuntime
} from '@/services/menu/tree'

import { Command, type MenuItem } from '../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu'

interface SavedFocusSnapshot {
  element: HTMLElement | null
  selectionStart: number | null
  selectionEnd: number | null
  range: Range | null
}

export interface WindowsTitleBarController {
  readonly menuItems: Ref<MenuItem[]>
  readonly isMaximised: Ref<boolean>
  start(): void
  captureFocusAndSelection(): void
  handleTopMenuOpenChange(dropdown: WebUiDropdown, open: boolean): void
  handleTopMenuPointerEnter(dropdown: WebUiDropdown, event: PointerEvent): void
  selectItem(item: MenuItem): void
  minimise(): Promise<void>
  toggleMaximise(): Promise<void>
  close(): Promise<void>
  dispose(): void
}

/** 跨 ShadowRoot 边界判断元素是否位于标题栏或已打开的下拉菜单浮层内。 */
function isInsideTitleBarOrMenu(element: Element | null): boolean {
  let current: Element | null = element
  while (current) {
    if (
      current.matches(
        '[data-windows-titlebar], web-ui-dropdown-item, .wui-menu-portal-overlay, [data-wui-menu-panel], [role="menu"]'
      )
    ) {
      return true
    }
    const root = current.getRootNode()
    current = current.parentElement ?? (root instanceof ShadowRoot ? root.host : null)
  }
  return false
}

export function createWindowsTitleBarController(options: {
  runtime: MenuTreeRuntime
  getHeader: () => HTMLElement | null
}): WindowsTitleBarController {
  const { runtime, getHeader } = options
  const menuItems = ref<MenuItem[]>([])
  const isMaximised = ref(false)

  let started = false
  let disposed = false
  let stopMenuUpdates: (() => void) | null = null
  let resizeTimer: ReturnType<typeof setTimeout> | null = null
  // 单调版本号：菜单快照与最大化状态各用独立通道，避免跨通道互相丢弃更新，
  // 并在并发查询或 dispose() 后丢弃陈旧响应。
  let menuSnapshotVersion = 0
  let maximisedVersion = 0
  let savedFocus: SavedFocusSnapshot | null = null
  let activeTopMenu: WebUiDropdown | null = null

  function captureFocusAndSelection() {
    const deepest = deepestActiveElement()
    if (isInsideTitleBarOrMenu(deepest)) return
    const active = deepest instanceof HTMLElement ? deepest : null

    let selectionStart: number | null = null
    let selectionEnd: number | null = null
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      selectionStart = active.selectionStart
      selectionEnd = active.selectionEnd
    }

    let range: Range | null = null
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0).cloneRange()
    }

    savedFocus = { element: active, selectionStart, selectionEnd, range }
  }

  function restoreFocusAndSelection() {
    const snapshot = savedFocus
    savedFocus = null
    activeTopMenu = null
    if (!snapshot) return

    const target = snapshot.element
    if (target && target.isConnected) {
      target.focus({ preventScroll: true })
      if (
        (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) &&
        snapshot.selectionStart !== null &&
        snapshot.selectionEnd !== null
      ) {
        try {
          target.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd)
        } catch {
          // 部分 input type（如 checkbox）不支持 setSelectionRange，忽略。
        }
        return
      }
    }

    if (snapshot.range && snapshot.range.startContainer.isConnected && snapshot.range.endContainer.isConnected) {
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(snapshot.range)
      }
    }
  }

  async function syncMaximisedState() {
    if (disposed) return
    const requestVersion = ++maximisedVersion
    try {
      const next = await runtime.isWindowMaximised()
      if (disposed || maximisedVersion !== requestVersion) return
      isMaximised.value = next
    } catch {
      // 浏览器预览或窗口尚未就绪时忽略查询失败。
    }
  }

  function queryTopMenuDropdowns(): WebUiDropdown[] {
    const header = getHeader()
    if (!header) return []
    return [...header.querySelectorAll<WebUiDropdown>('web-ui-dropdown[data-windows-top-menu]')]
  }

  function closeAllMenus() {
    activeTopMenu = null
    const header = getHeader()
    if (!header) return
    for (const dropdown of header.querySelectorAll<WebUiDropdown>('web-ui-dropdown')) {
      if (dropdown.open || dropdown.hasAttribute('open')) {
        dropdown.hide?.({ instant: true })
      }
    }
  }

  function handleTopMenuOpenChange(dropdown: WebUiDropdown, open: boolean) {
    if (open) {
      activeTopMenu = dropdown
      for (const sibling of queryTopMenuDropdowns()) {
        if (sibling !== dropdown && (sibling.open || sibling.hasAttribute('open'))) {
          sibling.hide?.({ instant: true })
        }
      }
      return
    }
    if (activeTopMenu === dropdown) {
      activeTopMenu = null
    }
  }

  function handleTopMenuPointerEnter(dropdown: WebUiDropdown, event: PointerEvent) {
    // 触摸指针不触发悬停切换，避免触屏误触相邻菜单。
    if (event.pointerType === 'touch') return
    // 与 macOS 原生顶部菜单栏一致：首次需点击展开，展开会话内悬停相邻顶级菜单即时切换，
    // 全部菜单关闭后自动恢复「必须先点击」的初始态。
    const currentOpen =
      activeTopMenu && (activeTopMenu.open || activeTopMenu.hasAttribute('open'))
        ? activeTopMenu
        : (queryTopMenuDropdowns().find(item => item.open || item.hasAttribute('open')) ?? null)
    if (!currentOpen || currentOpen === dropdown) return
    activeTopMenu = dropdown
    currentOpen.hide?.({ instant: true })
    dropdown.show?.({ instant: true })
  }

  function selectItem(item: MenuItem) {
    if (item.disabled || item.separator) return

    // 先关闭菜单（dropdown.hide 会尝试把焦点退回 trigger），再恢复页面原焦点与选区，
    // 确保后续编辑角色与剪贴板命令作用在用户原先聚焦的输入框/选区上。
    closeAllMenus()

    const needsFocusRestore =
      item.role === 'paste' ||
      isWebViewEditRole(item.role) ||
      item.command === Command.CommandCopyAsPlainText ||
      item.command === Command.CommandPasteAsPlainText

    if (needsFocusRestore) restoreFocusAndSelection()

    // Chromium 会拒绝 document.execCommand('paste')，统一转走 Go 剪贴板读取通道。
    if (item.role === 'paste') {
      void runtime.invokeItem(Command.CommandPasteAsPlainText, '')
      return
    }

    if (item.role && isWebViewEditRole(item.role)) {
      executeWebViewEditRole(item.role)
      return
    }

    const command = item.command ?? Command.$zero
    const role = item.role ?? ''
    if (!command && !role) return
    void runtime.invokeItem(command, role)
  }

  function handleResize() {
    if (resizeTimer !== null) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      resizeTimer = null
      void syncMaximisedState()
    }, 120)
  }

  function handleKeydown(event: KeyboardEvent) {
    const matched = findMenuItemByShortcut(menuItems.value, event)
    if (!matched) return
    event.preventDefault()
    selectItem(matched)
  }

  function start() {
    if (started) return
    started = true
    disposed = false
    stopMenuUpdates = runtime.onMenuChanged(items => {
      if (disposed) return
      menuSnapshotVersion += 1
      menuItems.value = items
    })
    const requestVersion = menuSnapshotVersion
    void runtime
      .getMenu()
      .then(items => {
        if (disposed || menuSnapshotVersion !== requestVersion) return
        menuItems.value = items
      })
      .catch(() => {})
    void syncMaximisedState()
    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeydown)
  }

  async function minimise() {
    await runtime.minimiseWindow()
  }

  async function toggleMaximise() {
    await runtime.toggleMaximiseWindow()
    await syncMaximisedState()
  }

  async function close() {
    await runtime.closeWindow()
  }

  function dispose() {
    disposed = true
    started = false
    menuSnapshotVersion += 1
    maximisedVersion += 1
    savedFocus = null
    if (resizeTimer !== null) {
      clearTimeout(resizeTimer)
      resizeTimer = null
    }
    stopMenuUpdates?.()
    stopMenuUpdates = null
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('keydown', handleKeydown)
  }

  return {
    menuItems,
    isMaximised,
    start,
    captureFocusAndSelection,
    handleTopMenuOpenChange,
    handleTopMenuPointerEnter,
    selectItem,
    minimise,
    toggleMaximise,
    close,
    dispose
  }
}
