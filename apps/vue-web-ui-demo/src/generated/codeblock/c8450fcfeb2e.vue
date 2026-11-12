<template>
  <div
    class="h-[240px] w-full overflow-hidden rounded-lg border border-(--wui-color-border) [--wui-layout-viewport-height:240px]"
  >
    <web-ui-layout
      :mobile="true"
      style="--wui-layout-mobile-toggle-inset: 24px; --wui-layout-mobile-toggle-top: 16px"
      :sidebarOpen="open"
      @sidebar-open-change="open = $event.detail.open"
    >
      <div slot="sidebar">导航</div>
      <div class="p-4 text-sm">内容</div>
    </web-ui-layout>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const open = ref(false)
</script>
