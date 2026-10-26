<template>
  <div class="flex flex-col gap-3">
    <div class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border)">
      <web-ui-layout :sidebarCollapsed="collapsed" @sidebar-collapsed-change="collapsed = $event.detail.collapsed">
        <nav slot="sidebar" class="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
          <span class="rounded-md p-2 text-sm">Overview</span>
          <span class="rounded-md p-2 text-sm">Components</span>
          <span class="rounded-md p-2 text-sm">Theme</span>
          <span class="rounded-md p-2 text-sm">Settings</span>
        </nav>
        <div class="p-4">
          <p class="m-0 text-sm">
            Click the Toggle at the bottom of the sidebar to collapse / expand; layout only narrows the desktop aside to
            68px.
          </p>
        </div>
      </web-ui-layout>
    </div>
    <p class="text-sm text-(--wui-color-text-secondary)">sidebar-collapsed: {{ collapsed ? 'true' : 'false' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const collapsed = ref(false)
</script>
