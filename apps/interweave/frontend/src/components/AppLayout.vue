<script setup lang="ts">
import type { WebUiEvent, WebUiLayout } from '@greypan/web-ui'
import { computed, ref } from 'vue'
import { RouterView } from 'vue-router'

import AppNav from '@/components/AppNav.vue'
import { useMediaQuery } from '@/composables/useMediaQuery'

const sidebarCollapsed = ref(false)
const sidebarOpen = ref(false)
const desktopSidebarWidth = ref('240px')

// 断点与 web-ui-layout 内部判定一致：drawer 宽度要跟着 viewport 一起换。
const mobile = useMediaQuery('(max-width: 640px)')
const sidebarWidth = computed(() => (mobile.value ? 'min(320px, 80vw)' : desktopSidebarWidth.value))

function updateSidebarCollapsed(event: WebUiEvent<WebUiLayout, 'sidebar-collapsed-change'>) {
  sidebarCollapsed.value = event.detail.collapsed
}

function updateSidebarOpen(event: WebUiEvent<WebUiLayout, 'sidebar-open-change'>) {
  sidebarOpen.value = event.detail.open
}

function updateSidebarWidth(event: WebUiEvent<WebUiLayout, 'sidebar-width-change'>) {
  desktopSidebarWidth.value = event.detail.width
}

function closeSidebar() {
  sidebarOpen.value = false
}
</script>

<template>
  <!--
    shell 在这里，页面在 RouterView 里：web-ui-layout 与 AppNav 挂在 RouterView 之外，
    切路由只换默认 slot 的内容，不重建 sidebar。页面若要占 header slot，让自己的根节点带
    `slot="header"`（LibraryPage 就是这么做的），不需要自己再渲染一套 layout。
  -->
  <web-ui-layout
    header-glow
    sidebarResizable
    sidebarMinWidth="160px"
    sidebarMaxWidth="320px"
    collapsedWidth="120px"
    class="min-h-dvh overflow-x-clip text-[#22212a] bg-white dark:text-(--wui-color-text) dark:bg-(--wui-color-page)"
    :sidebarCollapsed="sidebarCollapsed"
    :sidebarOpen="sidebarOpen"
    :sidebarWidth="sidebarWidth"
    @sidebar-collapsed-change="updateSidebarCollapsed"
    @sidebar-open-change="updateSidebarOpen"
    @sidebar-width-change="updateSidebarWidth"
  >
    <AppNav slot="sidebar" :collapsed="sidebarCollapsed" @navigate="closeSidebar" />

    <RouterView />
  </web-ui-layout>
</template>
