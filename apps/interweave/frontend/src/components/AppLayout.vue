<script setup lang="ts">
import type { WebUiEvent, WebUiLayout } from '@greypan/web-ui'
import { toast } from '@greypan/web-ui'
import { System } from '@wailsio/runtime'
import { computed, onMounted, onScopeDispose, ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'

import AppNav from '@/components/AppNav.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'
import { MENU_ADD_RESOURCE_EVENT, MENU_PASTE_FILES_EVENT, MENU_REFRESH_EVENT } from '@/composables/menuActions'
import { useLayoutMobileProvider } from '@/composables/useLayoutMobile'
import { queueWindowFileDrop } from '@/composables/windowFileDrop'
import { createLibraryRuntime } from '@/services/library'
import { onMenuCommand } from '@/services/menu'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const settings = useSettingsStore()
const stopWindowFileDrop = createLibraryRuntime().events.onFilesDropped(paths => {
  if (!paths.length) return
  queueWindowFileDrop(paths)
  if (router.currentRoute.value.path !== '/library') void router.push('/library')
})
onScopeDispose(stopWindowFileDrop)

const sidebarCollapsed = ref(false)
const sidebarOpen = ref(false)
const settingsOpen = ref(false)
const desktopSidebarWidth = ref('240px')
const isMac = System.IsMac()

const { mobile } = useLayoutMobileProvider()
const sidebarWidth = computed(() => (mobile.value ? 'min(320px, 80vw)' : desktopSidebarWidth.value))

/*
 * collapse 是**桌面端**的密度偏好，移动端 drawer 恒以展开态呈现同一份导航：drawer 宽
 * min(320px, 80vw)，套用 collapsed state 会把标签挤掉（collapsed 为真时 AppNav 不渲染文字）。
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

/*
 * 「切换侧边栏」是单向命令：菜单不发勾选状态回来，所以这里只翻一次。
 * 移动端翻的是 drawer，桌面端翻的是 collapse —— 两者是同一份导航的两种呈现，
 * 用户按快捷键时期望「打开/收起导航」，不区分是哪一种。
 */
function toggleSidebar() {
  if (mobile.value) sidebarOpen.value = !sidebarOpen.value
  else sidebarCollapsed.value = !sidebarCollapsed.value
}

/*
 * 菜单命令在这里分发而不是在页面里：菜单是应用级的，页面会被切走。
 * 「添加资源」「粘贴文件」「刷新可用性」落在资源库页，跨页面时先切过去，
 * 由页面自己订阅 pending 队列执行——壳层不复制页面的领域逻辑。
 */
const stopMenuCommands = onMenuCommand({
  addResource() {
    void openLibraryThen(() => document.dispatchEvent(new CustomEvent(MENU_ADD_RESOURCE_EVENT)))
  },
  pasteFiles() {
    void openLibraryThen(() => document.dispatchEvent(new CustomEvent(MENU_PASTE_FILES_EVENT)))
  },
  refreshAvailability() {
    void openLibraryThen(() => document.dispatchEvent(new CustomEvent(MENU_REFRESH_EVENT)))
  },
  toggleSidebar,
  openSettings() {
    settingsOpen.value = true
  },
  openDocumentation() {
    void createLibraryRuntime()
      .system.openExternal(DOCUMENTATION_URL)
      .catch(() => toast.warning('无法打开文档链接，请检查系统默认浏览器'))
  }
})
onScopeDispose(stopMenuCommands)

/**
 * 切到资源库页再执行页面域动作。
 *
 * 已经是资源库页时同一帧就执行；否则等路由落定。这里用事件而不是共享 store，
 * 是为了让页面只暴露「我准备好接收这类动作了」，壳层不必知道页面内部如何实现。
 */
async function openLibraryThen(run: () => void) {
  if (router.currentRoute.value.path !== '/library') await router.push('/library')
  run()
}

/** 与 Go 侧 native/menu 的 Help 菜单一致。 */
const DOCUMENTATION_URL = 'https://github.com/pan-Z2l0aHVi/mono/tree/main/apps/interweave'

onMounted(() => {
  // 启动期一次性警告（设置文件损坏等）在界面就绪后提示一次。
  const warnings = settings.takeWarnings()
  if (warnings.length > 0) toast.warning(warnings.join('\n'))
})
</script>

<template>
  <!--
    shell 在这里，页面在 RouterView 里：web-ui-layout 与 AppNav 挂在 RouterView 之外，
    切路由只换默认 slot 的内容，不重建 sidebar。页面若要占 header slot，让自己的根节点带
    `slot="header"`（LibraryPage 就是这么做的），不需要自己再渲染一套 layout。
  -->
  <web-ui-layout
    header-glow
    sidebar-collapsible
    sidebarResizable
    sidebarMinWidth="160px"
    sidebarMaxWidth="320px"
    mobile-header-full-width
    class="min-h-dvh overflow-x-clip text-[#22212a] bg-white dark:text-(--wui-color-text) dark:bg-(--wui-color-page) mobile:[--wui-layout-sidebar-content-padding:8px_20px_8px_8px] mobile:[--wui-layout-sidebar-radius:calc(18px_+_8px)]"
    :class="{ '[--wui-layout-sidebar-padding-top:48px] mobile:[--wui-layout-mobile-toggle-inset:96px]': isMac }"
    :mobile="mobile"
    :sidebarCollapsed="sidebarCollapsed"
    :sidebarOpen="sidebarOpen"
    :sidebarWidth="sidebarWidth"
    @sidebar-collapsed-change="updateSidebarCollapsed"
    @sidebar-open-change="updateSidebarOpen"
    @sidebar-width-change="updateSidebarWidth"
  >
    <AppNav
      slot="sidebar"
      :collapsed="navCollapsed"
      :mobile="mobile"
      @navigate="closeSidebar"
      @open-settings="settingsOpen = true"
    />

    <RouterView />
  </web-ui-layout>

  <!--
    dialog 是应用壳级 overlay，不是侧边栏的子节点：挂在 AppNav 内部会在 ≤640px 时随 aside 一起
    被 display:none 带走。放在 web-ui-layout 的同级位置，既躲开了那条规则，也让原生 dialog
    提升进 top layer 后不被侧边栏的 overflow 与任何祖先 transform 困住。
  -->
  <SettingsDialog :open="settingsOpen" @update:open="settingsOpen = $event" />
</template>
