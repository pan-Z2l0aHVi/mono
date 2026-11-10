<template>
  <web-ui-layout
    :mobile="true"
    style="--wui-layout-mobile-toggle-inset: 24px; --wui-layout-mobile-toggle-top: 16px"
    :sidebarOpen="open"
    @sidebar-open-change="open = $event.detail.open"
  >
    <div slot="sidebar">Navigation</div>
    <div>Content</div>
  </web-ui-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const open = ref(false)
</script>
