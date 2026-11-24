<script setup lang="ts">
// cspell:ignore maximised
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
const menuItems = ref<MenuItem[]>([])
const isMaximised = ref(false)
let stopMenuUpdates: (() => void) | null = null
// 单调版本号：若 menu:tree-changed 事件先于初始 getMenu() 响应到达，
// 丢弃较旧的 getMenu() 结果，防止陈旧禁用态覆盖最新事件快照。
let menuSnapshotVersion = 0

async function syncMaximisedState() {
  try {
    isMaximised.value = await menuRuntime.isWindowMaximised()
  } catch {
    // 浏览器预览或窗口尚未就绪时忽略查询失败。
  }
}

function handleSelect(item: MenuItem) {
  if (item.disabled || item.separator) return
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
          <button slot="trigger" type="button" :class="triggerButtonClass">
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
