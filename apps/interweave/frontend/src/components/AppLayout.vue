<script setup lang="ts">
import type { WebUiEvent, WebUiLayout } from '@greypan/web-ui'
import { computed, ref } from 'vue'
import { RouterView } from 'vue-router'

import AppNav from '@/components/AppNav.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'
import { useMediaQuery } from '@/composables/useMediaQuery'

const sidebarCollapsed = ref(false)
const sidebarOpen = ref(false)
const settingsOpen = ref(false)
const desktopSidebarWidth = ref('240px')

// 断点与 web-ui-layout 内部判定一致：drawer 宽度要跟着 viewport 一起换。
const mobile = useMediaQuery('(max-width: 640px)')
const sidebarWidth = computed(() => (mobile.value ? 'min(320px, 80vw)' : desktopSidebarWidth.value))

/*
 * 折叠是**桌面端**的密度偏好，移动端 drawer 恒以展开态呈现同一份导航：drawer 宽
 * min(320px, 80vw)，套用折叠态会把标签挤掉（collapsed 为真时 AppNav 不渲染文字）。
 * web-ui-layout 的 `sidebar-collapsed` 契约同样写明它「不会影响移动端 Drawer」，
 * 它只是无从替 Consumer 决定 slot 内容怎么渲染，所以闸门留在这里。
 */
const navCollapsed = computed(() => sidebarCollapsed.value && !mobile.value)

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
    改 collapsedWidth 时要一并改这里——当前 90px 配 66px（66 + 16 = 90 − 8）。只调其中
    一个会让 Toggle 与 panel 不再对齐。

    这个值只能经 web-ui 暴露的 `--wui-layout-sidebar-toggle-width` 传进去：Toggle 在
    layout 的 shadow DOM 内自声明 `--wui-button-width`，从外面写同名变量会被自身声明盖掉。
  -->
  <web-ui-layout
    header-glow
    sidebarResizable
    sidebarMinWidth="160px"
    sidebarMaxWidth="320px"
    collapsedWidth="90px"
    class="min-h-dvh overflow-x-clip text-[#22212a] bg-white dark:text-(--wui-color-text) dark:bg-(--wui-color-page) [--wui-layout-sidebar-toggle-width:66px]"
    :sidebarCollapsed="sidebarCollapsed"
    :sidebarOpen="sidebarOpen"
    :sidebarWidth="sidebarWidth"
    @sidebar-collapsed-change="updateSidebarCollapsed"
    @sidebar-open-change="updateSidebarOpen"
    @sidebar-width-change="updateSidebarWidth"
  >
    <AppNav slot="sidebar" :collapsed="navCollapsed" @navigate="closeSidebar" @open-settings="settingsOpen = true" />

    <RouterView />
  </web-ui-layout>

  <!--
    dialog 是应用壳级浮层，不是侧边栏的子节点：挂在 AppNav 内部会在 ≤640px 时随 aside 一起
    被 display:none 带走。放在 web-ui-layout 的同级位置，既躲开了那条规则，也让原生 dialog
    提升进 top layer 后不被侧边栏的 overflow 与任何祖先 transform 困住。
  -->
  <SettingsDialog :open="settingsOpen" @update:open="settingsOpen = $event" />
</template>
