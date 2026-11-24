<script setup lang="ts">
// cspell:ignore maximised
import type { WebUiDropdown } from '@greypan/web-ui'
import { onBeforeUnmount, onMounted, ref } from 'vue'

import {
  createMenuTreeRuntime,
  executeWebViewEditRole,
  findMenuItemByShortcut,
  isWebViewEditRole,
  type MenuTreeRuntime
} from '@/services/menu/tree'

import { Command, type MenuItem } from '../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu'

import WindowsMenuItems from './WindowsMenuItems.vue'

const props = defineProps<{
  mobile?: boolean
  runtime?: MenuTreeRuntime
}>()

const menuRuntime = props.runtime ?? createMenuTreeRuntime()
const headerRef = ref<HTMLElement | null>(null)
const menuItems = ref<MenuItem[]>([])
const isMaximised = ref(false)
let stopMenuUpdates: (() => void) | null = null
// 单调版本号：若 menu:tree-changed 事件先于初始 getMenu() 响应到达，
// 丢弃较旧的 getMenu() 结果，防止陈旧禁用态覆盖最新事件快照。
let menuSnapshotVersion = 0

interface SavedFocusSnapshot {
  element: HTMLElement | null
  selectionStart: number | null
  selectionEnd: number | null
  range: Range | null
}

let savedFocus: SavedFocusSnapshot | null = null

/** 穿透开放 ShadowRoot 取最深层当前聚焦元素。 */
function deepestActiveElement(): HTMLElement | null {
  let active: Element | null = document.activeElement
  while (active instanceof HTMLElement && active.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement
  }
  return active instanceof HTMLElement ? active : null
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

/**
 * 在菜单打开抢走焦点前捕获原聚焦元素与选区：
 * 若当前焦点已落在标题栏或任意已打开的 portal 菜单项/面板内（含其 ShadowRoot 内部节点）则跳过，
 * 避免连续切换顶级菜单时用菜单项覆盖页面内的真实输入框焦点快照。
 */
function captureFocusAndSelection() {
  const active = deepestActiveElement()
  if (isInsideTitleBarOrMenu(active)) return

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

/** 在执行编辑角色或剪贴板命令前把焦点与选区归还给原页面元素。 */
function restoreFocusAndSelection() {
  const snapshot = savedFocus
  savedFocus = null
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
  try {
    isMaximised.value = await menuRuntime.isWindowMaximised()
  } catch {
    // 浏览器预览或窗口尚未就绪时忽略查询失败。
  }
}

/** 关闭标题栏内所有已展开的下拉菜单，避免叶子项点击后浮层继续遮挡页面。 */
function closeAllMenus() {
  const header = headerRef.value
  if (!header) return
  for (const dropdown of header.querySelectorAll<WebUiDropdown>('web-ui-dropdown')) {
    if (dropdown.open || dropdown.hasAttribute('open')) {
      dropdown.hide?.({ instant: true })
    }
  }
}

function handleSelect(item: MenuItem) {
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
    void menuRuntime.invokeItem(Command.CommandPasteAsPlainText, '')
    return
  }

  if (item.role && isWebViewEditRole(item.role)) {
    executeWebViewEditRole(item.role)
    return
  }

  const command = item.command ?? Command.$zero
  const role = item.role ?? ''
  if (!command && !role) return
  void menuRuntime.invokeItem(command, role)
}

function handleKeydown(event: KeyboardEvent) {
  const matched = findMenuItemByShortcut(menuItems.value, event)
  if (!matched) return
  event.preventDefault()
  handleSelect(matched)
}

async function handleMinimise() {
  await menuRuntime.minimiseWindow()
}

async function handleToggleMaximise() {
  await menuRuntime.toggleMaximiseWindow()
  await syncMaximisedState()
}

async function handleClose() {
  await menuRuntime.closeWindow()
}

onMounted(() => {
  stopMenuUpdates = menuRuntime.onMenuChanged(items => {
    menuSnapshotVersion += 1
    menuItems.value = items
  })
  const requestVersion = menuSnapshotVersion
  void menuRuntime
    .getMenu()
    .then(items => {
      if (menuSnapshotVersion !== requestVersion) return
      menuItems.value = items
    })
    .catch(() => {})
  void syncMaximisedState()
  window.addEventListener('resize', syncMaximisedState)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  stopMenuUpdates?.()
  stopMenuUpdates = null
  window.removeEventListener('resize', syncMaximisedState)
  window.removeEventListener('keydown', handleKeydown)
})

const triggerButtonClass =
  'inline-flex h-7 items-center rounded-md border-0 bg-transparent px-2 text-xs leading-none text-(--wui-color-text) cursor-pointer hover:bg-[#1b1b30]/6 active:bg-[#1b1b30]/10 dark:hover:bg-white/10 dark:active:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--wui-color-focus-ring,rgb(0_136_255/0.4))'

const captionButtonClass =
  'inline-flex h-9 w-[46px] shrink-0 items-center justify-center border-0 bg-transparent p-0 text-(--wui-color-text) cursor-pointer transition-colors duration-100 hover:bg-[#1b1b30]/7 active:bg-[#1b1b30]/12 dark:hover:bg-white/10 dark:active:bg-white/15 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--wui-color-focus-ring,rgb(0_136_255/0.4))'
</script>

<template>
  <header
    ref="headerRef"
    data-windows-titlebar
    class="sticky top-0 z-[700] flex h-9 w-full shrink-0 items-center justify-between border-b border-[#1b1b20]/6 bg-white select-none dark:border-white/8 dark:bg-(--wui-color-page)"
  >
    <!-- 与控件同级的透明拖动底：遵循 AGENTS.md 规则，避免 --wails-draggable 继承到菜单与窗口按钮。 -->
    <div data-window-drag aria-hidden="true" class="absolute inset-0 -z-10" @dblclick="handleToggleMaximise" />

    <nav aria-label="顶部菜单" class="relative z-10 flex min-w-0 items-center gap-0.5 pl-2">
      <web-ui-dropdown v-if="mobile" placement="bottom-start">
        <button
          slot="trigger"
          type="button"
          :class="triggerButtonClass"
          aria-label="应用菜单"
          data-windows-menu-hamburger
          @pointerdown="captureFocusAndSelection"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 3.5h10M2 7h10M2 10.5h10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          </svg>
        </button>
        <WindowsMenuItems :items="menuItems" @select="handleSelect" />
      </web-ui-dropdown>

      <template v-else>
        <web-ui-dropdown
          v-for="topItem in menuItems"
          :key="topItem.label"
          placement="bottom-start"
          data-windows-top-menu
        >
          <button slot="trigger" type="button" :class="triggerButtonClass" @pointerdown="captureFocusAndSelection">
            {{ topItem.label }}
          </button>
          <WindowsMenuItems v-if="topItem.children?.length" :items="topItem.children" @select="handleSelect" />
        </web-ui-dropdown>
      </template>
    </nav>

    <div aria-label="窗口控制" class="relative z-10 flex shrink-0 items-center">
      <button type="button" :class="captionButtonClass" aria-label="最小化" @click="handleMinimise">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M1 5h8" stroke="currentColor" stroke-width="1" stroke-linecap="square" />
        </svg>
      </button>
      <button
        type="button"
        :class="captionButtonClass"
        :aria-label="isMaximised ? '还原' : '最大化'"
        @click="handleToggleMaximise"
      >
        <svg v-if="isMaximised" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M3 3V1.5h5.5V7H7M1.5 3H7v5.5H1.5V3Z"
            stroke="currentColor"
            stroke-width="1"
            stroke-linejoin="miter"
          />
        </svg>
        <svg v-else width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <rect x="1.5" y="1.5" width="7" height="7" stroke="currentColor" stroke-width="1" />
        </svg>
      </button>
      <button
        type="button"
        class="inline-flex h-9 w-[46px] shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-(--wui-color-text) transition-colors duration-100 hover:bg-[#e81123] hover:text-white active:bg-[#c50f1f] active:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--wui-color-focus-ring,rgb(0_136_255/0.4))"
        aria-label="关闭"
        @click="handleClose"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1" stroke-linecap="square" />
        </svg>
      </button>
    </div>
  </header>
</template>
