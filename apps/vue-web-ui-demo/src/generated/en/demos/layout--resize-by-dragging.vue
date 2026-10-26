<template>
  <div class="flex flex-col gap-3">
    <div class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border)">
      <web-ui-layout
        sidebar-resizable
        :sidebarWidth="width"
        sidebar-min-width="160px"
        sidebar-max-width="360px"
        @sidebar-width-change="width = $event.detail.width"
      >
        <nav slot="sidebar" class="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
          <span class="rounded-md p-2 text-sm">Overview</span>
          <span class="rounded-md p-2 text-sm">Components</span>
          <span class="rounded-md p-2 text-sm">Theme</span>
        </nav>
        <div class="p-4">
          <p class="m-0 text-sm">
            Drag the handle on the right edge of the desktop sidebar to resize; after focusing, use ←/→ to step, Enter
            to commit, and Escape to revert the uncommitted adjustment.
          </p>
        </div>
      </web-ui-layout>
    </div>
    <p class="text-sm text-(--wui-color-text-secondary)">sidebar-width: {{ width }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const width = ref('240px')
</script>
