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

    折叠 Toggle 的宽度与 collapsedWidth 成对使用：Toggle 自带 8px 左右 margin，所以
    Toggle 宽度 + 16 应等于 collapsedWidth 减去 aside 自身的 8px 左边距，即 panel 的宽度。
    改 collapsedWidth 时要一并改这里——收窄到 90px 时 Toggle 取 66px（66 + 16 = 90 − 8）。
    本分支的 collapsedWidth 仍是 120px，90px 由 interweave-library-ux-batch2 一并落地；
    在那之前 66px 也比原来的 44px 更贴近 panel，不会让错位变得更严重。

    这个值只能经 web-ui 暴露的 `--wui-layout-sidebar-toggle-width` 传进去：Toggle 在
    layout 的 shadow DOM 内自声明 `--wui-button-width`，从外面写同名变量会被自身声明盖掉。
  -->
  <web-ui-layout
    header-glow
    sidebarResizable
    sidebarMinWidth="160px"
    sidebarMaxWidth="320px"
    collapsedWidth="120px"
    class="min-h-dvh overflow-x-clip text-[#22212a] bg-white dark:text-(--wui-color-text) dark:bg-(--wui-color-page) [--wui-layout-sidebar-toggle-width:66px]"
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
