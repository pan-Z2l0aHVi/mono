<template>
  <div class="flex flex-col gap-3">
    <div class="h-[420px] overflow-auto rounded-lg border border-(--wui-color-border)">
      <web-ui-layout
        :sidebarOpen="open"
        @sidebar-open-change="open = $event.detail.open"
        @mobile-change="mobile = $event.detail.mobile"
      >
        <div slot="header" class="flex items-center px-4 py-2 text-sm font-medium">Header</div>
        <nav slot="sidebar" class="flex h-full min-h-0 flex-col gap-1 overflow-y-auto p-2">
          <span class="rounded-md p-2 text-sm">导航</span>
          <span class="rounded-md p-2 text-sm">组件</span>
        </nav>
        <div class="p-4">
          <p class="m-0 text-sm">
            把视口收窄到 640px 及以下，header 出现 Toggle；点它经 sidebar-open-change 请求打开 Drawer。
          </p>
        </div>
      </web-ui-layout>
    </div>
    <p class="text-sm text-(--wui-color-text-secondary)">
      mobile：{{ mobile ? 'true' : 'false' }} · sidebar-open：{{ open ? 'true' : 'false' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const mobile = ref(false)
</script>
