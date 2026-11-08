<template>
  <web-ui-layout :mobile="true" :sidebarOpen="open" @sidebar-open-change="open = $event.detail.open">
    <div slot="sidebar">导航</div>
    <div>内容</div>
  </web-ui-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const open = ref(false)
</script>
