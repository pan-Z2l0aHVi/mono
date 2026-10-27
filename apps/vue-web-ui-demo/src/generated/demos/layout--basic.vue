<template>
  <div class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border)">
    <web-ui-layout header-glow :sidebarOpen="open" @sidebar-open-change="open = $event.detail.open">
      <div
        slot="banner"
        class="flex items-center justify-center bg-(--wui-color-accent) px-4 py-2 text-sm text-(--wui-color-on-accent)"
      >
        全宽 Banner
      </div>
      <div slot="header" class="flex items-center px-4 py-2 text-sm font-medium">Header</div>
      <nav slot="sidebar" class="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
        <span class="rounded-md p-2 text-sm">Overview</span>
        <span class="rounded-md p-2 text-sm">Components</span>
        <span class="rounded-md p-2 text-sm">Theme</span>
      </nav>
      <div class="p-4">
        <p class="m-0 text-sm">正文区随内层滚动条滚动，header 与 tabbar 各贴在容器上下缘。</p>
        <div class="mt-3 h-[420px] rounded-md bg-(--wui-color-surface-control)" />
      </div>
      <div slot="tabbar" class="flex items-center justify-center px-4 py-2 text-xs">Tabbar</div>
    </web-ui-layout>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
