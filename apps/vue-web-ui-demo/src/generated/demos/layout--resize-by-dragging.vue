<template>
  <div class="flex flex-col gap-3">
    <div class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border)">
      <web-ui-layout
        sidebar-resizable
        :sidebarWidth="width"
        sidebar-min-width="160px"
        sidebar-max-width="360px"
        @sidebar-width-change="width = $event.detail.width"
        :sidebarOpen="open"
        @sidebar-open-change="open = $event.detail.open"
      >
        <nav slot="sidebar" class="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
          <span class="rounded-md p-2 text-sm">Overview</span>
          <span class="rounded-md p-2 text-sm">Components</span>
          <span class="rounded-md p-2 text-sm">Theme</span>
        </nav>
        <div class="p-4">
          <p class="m-0 text-sm">
            拖桌面端侧边栏右缘的 handle 改宽；聚焦后用 ←/→ 步进、Enter 提交、Escape 撤回未提交的调整。
          </p>
        </div>
      </web-ui-layout>
    </div>
    <p class="text-sm text-(--wui-color-text-secondary)">sidebar-width：{{ width }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const width = ref('240px')
const open = ref(false)
</script>
