<script setup lang="ts">
import type { WebUiEvent, WebUiLayout } from '@greypan/web-ui'
import { ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import AppNav from '@/components/AppNav.vue'

const route = useRoute()

const sidebarCollapsed = ref(false)
const sidebarOpen = ref(false)

function updateSidebarCollapsed(event: WebUiEvent<WebUiLayout, 'sidebar-collapsed-change'>) {
  sidebarCollapsed.value = event.detail.collapsed
}

function updateSidebarOpen(event: WebUiEvent<WebUiLayout, 'sidebar-open-change'>) {
  sidebarOpen.value = event.detail.open
}
</script>

<template>
  <RouterView v-slot="{ Component }">
    <component :is="Component" v-if="route.meta.prototype || route.meta.immersive" />
    <web-ui-layout
      v-else
      class="min-h-dvh overflow-x-clip text-[#22212a] bg-white dark:text-(--wui-color-text) dark:bg-(--wui-color-page)"
      :sidebarCollapsed="sidebarCollapsed"
      :sidebarOpen="sidebarOpen"
      @sidebar-collapsed-change="updateSidebarCollapsed"
      @sidebar-open-change="updateSidebarOpen"
    >
      <AppNav slot="sidebar" :collapsed="sidebarCollapsed" @navigate="sidebarOpen = false" />
      <component :is="Component" />
    </web-ui-layout>
  </RouterView>
</template>
