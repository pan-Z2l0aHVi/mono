<script setup lang="ts">
// cspell:ignore maximised
import type { WebUiDropdown } from '@greypan/web-ui'
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { createMenuTreeRuntime, type MenuTreeRuntime } from '@/services/menu/tree'

import WindowsMenuItems from './WindowsMenuItems.vue'
import { createWindowsTitleBarController } from './windowsTitleBarController'

const props = defineProps<{
  mobile?: boolean
  runtime?: MenuTreeRuntime
}>()

const headerRef = ref<HTMLElement | null>(null)
const controller = createWindowsTitleBarController({
  runtime: props.runtime ?? createMenuTreeRuntime(),
  getHeader: () => headerRef.value
})
const { menuItems, isMaximised } = controller

onMounted(() => controller.start())
onBeforeUnmount(() => controller.dispose())

function handleTopMenuOpenChange(event: Event) {
  const dropdown = event.currentTarget as WebUiDropdown | null
  const detail = (event as CustomEvent<{ open?: boolean }>).detail
  if (!dropdown || typeof detail?.open !== 'boolean') return
  controller.handleTopMenuOpenChange(dropdown, detail.open)
}

function handleTopMenuPointerEnter(event: PointerEvent) {
  const dropdown = event.currentTarget as WebUiDropdown | null
  if (!dropdown) return
  controller.handleTopMenuPointerEnter(dropdown, event)
}

const triggerButtonClass =
  'inline-flex h-7 items-center rounded-md border-0 bg-transparent px-2 text-xs leading-none text-(--wui-color-text) cursor-pointer hover:bg-[#1b1b30]/6 active:bg-[#1b1b30]/10 [&[aria-expanded=true]]:bg-[#1b1b30]/10 dark:hover:bg-white/10 dark:active:bg-white/15 dark:[&[aria-expanded=true]]:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--wui-color-focus-ring,rgb(0_136_255/0.4))'

const captionButtonClass =
  'inline-flex h-9 w-[46px] shrink-0 items-center justify-center border-0 bg-transparent p-0 text-(--wui-color-text) cursor-pointer transition-colors duration-100 hover:bg-[#1b1b30]/7 active:bg-[#1b1b30]/12 dark:hover:bg-white/10 dark:active:bg-white/15 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--wui-color-focus-ring,rgb(0_136_255/0.4))'
</script>

<template>
  <header
    ref="headerRef"
    data-windows-titlebar
    class="sticky top-0 z-[700] flex h-9 w-full shrink-0 items-center justify-between border-b border-[#1b1b20]/6 bg-white select-none dark:border-white/8 dark:bg-(--wui-color-page)"
  >
    <!--
      与控件同级的透明拖动底：遵循 AGENTS.md 规则，避免 --wails-draggable 继承到菜单与窗口按钮。
      这里刻意不标 --wails-non-client-region: caption——窗口拖动仍由 Wails 的 JS 拖动路径发起，
      再叠一层原生 caption 命中会让同一次按下同时进入原生移动循环与 JS 拖动。
    -->
    <div data-window-drag aria-hidden="true" class="absolute inset-0 -z-10" @dblclick="controller.toggleMaximise" />

    <nav aria-label="顶部菜单" class="relative z-10 flex min-w-0 items-center gap-0.5 pl-2">
      <web-ui-dropdown v-if="mobile" placement="bottom-start">
        <button
          slot="trigger"
          type="button"
          :class="triggerButtonClass"
          aria-label="应用菜单"
          data-windows-menu-hamburger
          @pointerdown="controller.captureFocusAndSelection"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 3.5h10M2 7h10M2 10.5h10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          </svg>
        </button>
        <WindowsMenuItems :items="menuItems" @select="controller.selectItem" />
      </web-ui-dropdown>

      <template v-else>
        <web-ui-dropdown
          v-for="topItem in menuItems"
          :key="topItem.label"
          placement="bottom-start"
          data-windows-top-menu
          @open-change="handleTopMenuOpenChange"
          @pointerenter="handleTopMenuPointerEnter"
        >
          <button
            slot="trigger"
            type="button"
            :class="triggerButtonClass"
            @pointerdown="controller.captureFocusAndSelection"
          >
            {{ topItem.label }}
          </button>
          <WindowsMenuItems v-if="topItem.children?.length" :items="topItem.children" @select="controller.selectItem" />
        </web-ui-dropdown>
      </template>
    </nav>

    <div aria-label="窗口控制" class="relative z-10 flex shrink-0 items-center">
      <button type="button" :class="captionButtonClass" aria-label="最小化" @click="controller.minimise">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M1 5h8" stroke="currentColor" stroke-width="1" stroke-linecap="square" />
        </svg>
      </button>
      <!--
        Snap Layouts：只有最大化键需要标非客户区。Wails 在 composition hosting 就绪时把这块
        矩形的非客户区命中测试映射成「最大化」按钮命中，DWM 才会在悬停时弹出分屏面板；同时它把点击
        转发回 WebView，所以 @click 仍是唯一的 toggle 入口（不会双触发）。最小化/关闭没有
        hover 面板，继续走普通 client 命中。
      -->
      <button
        type="button"
        :class="captionButtonClass"
        style="--wails-non-client-region: maximize"
        :aria-label="isMaximised ? '还原' : '最大化'"
        @click="controller.toggleMaximise"
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
        @click="controller.close"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1" stroke-linecap="square" />
        </svg>
      </button>
    </div>
  </header>
</template>
