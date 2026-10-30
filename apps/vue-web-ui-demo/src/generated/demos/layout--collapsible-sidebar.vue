<template>
  <div class="flex flex-col gap-3">
    <div
      class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:420px]"
    >
      <web-ui-layout
        :sidebarCollapsed="collapsed"
        @sidebar-collapsed-change="collapsed = $event.detail.collapsed"
        :sidebarOpen="open"
        @sidebar-open-change="open = $event.detail.open"
      >
        <nav slot="sidebar" class="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
          <span class="rounded-md p-2 text-sm">Overview</span>
          <span class="rounded-md p-2 text-sm">Components</span>
          <span class="rounded-md p-2 text-sm">Theme</span>
          <span class="rounded-md p-2 text-sm">Settings</span>
        </nav>
        <div class="p-4">
          <p class="m-0 text-sm">点侧边栏底部的 Toggle 收起 / 展开，layout 只把桌面端 aside 收窄到 68px。</p>
        </div>
      </web-ui-layout>
    </div>
    <p class="text-sm text-(--wui-color-text-secondary)">sidebar-collapsed：{{ collapsed ? 'true' : 'false' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const collapsed = ref(false)
const open = ref(false)
</script>
