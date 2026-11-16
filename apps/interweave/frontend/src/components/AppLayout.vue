<script setup lang="ts">
import type { WebUiEvent, WebUiLayout } from '@greypan/web-ui'
import { toast } from '@greypan/web-ui'
import { System } from '@wailsio/runtime'
import { computed, onScopeDispose, ref, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'

import AppNav from '@/components/AppNav.vue'
import SettingsDialog from '@/components/SettingsDialog.vue'
import {
  MENU_ADD_RESOURCE_EVENT,
  MENU_FOCUS_SEARCH_EVENT,
  MENU_IMPORT_FROM_CLIPBOARD_EVENT,
  MENU_IMPORT_FROM_LINK_EVENT,
  MENU_REFRESH_EVENT,
  MENU_TOGGLE_FILTER_BAR_EVENT
} from '@/composables/menuActions'
import { hasEditableFocus, insertTextAtFocus, readSelectionText } from '@/composables/plainTextClipboard'
import { canGoBack, canGoForward } from '@/composables/useHistoryNav'
import { useLayoutMobileProvider } from '@/composables/useLayoutMobile'
import { queueWindowFileDrop, queueWindowURLDrop } from '@/composables/windowFileDrop'
import { createLibraryRuntime } from '@/services/library'
import { onMenuCommand } from '@/services/menu'
import { createMenuStateReporter, createMenuStateRuntime } from '@/services/menu/state'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const settings = useSettingsStore()
const libraryRuntime = createLibraryRuntime()
const stopWindowFileDrop = libraryRuntime.events.onFilesDropped(paths => {
  if (!paths.length) return
  queueWindowFileDrop(paths)
  if (router.currentRoute.value.path !== '/library') void router.push('/library')
})
const stopWindowURLDrop = libraryRuntime.events.onURLsDropped(urls => {
  if (!urls.length) return
  queueWindowURLDrop(urls)
  if (router.currentRoute.value.path !== '/library') void router.push('/library')
})
onScopeDispose(() => {
  stopWindowFileDrop()
  stopWindowURLDrop()
})

const sidebarCollapsed = ref(false)
const sidebarOpen = ref(false)
const settingsOpen = ref(false)
const desktopSidebarWidth = ref('240px')

/* 首次渲染已等过 runtime core 注入（见 main.ts 的启动序），这里读到的平台就是终值。 */
const isMac = System.IsMac()

/** 与 web-ui-layout 的 collapsedWidth 一致：收窄后 aside 的宽度，拖动条与它同宽。 */
const COLLAPSED_SIDEBAR_WIDTH = '60px'

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
 * 落在资源库页上的动作跨页面时先切过去，由页面自己订阅事件执行——壳层不复制页面的
 * 领域逻辑。后退/前进与剪贴板动作在壳层就地完成。
 */
const stopMenuCommands = onMenuCommand({
  addResource() {
    void openLibraryThen(() => dispatchMenuAction(MENU_ADD_RESOURCE_EVENT))
  },
  importFromClipboard() {
    void openLibraryThen(() => dispatchMenuAction(MENU_IMPORT_FROM_CLIPBOARD_EVENT))
  },
  importFromLink() {
    void openLibraryThen(() => dispatchMenuAction(MENU_IMPORT_FROM_LINK_EVENT))
  },
  refreshLibrary() {
    void openLibraryThen(() => dispatchMenuAction(MENU_REFRESH_EVENT))
  },
  toggleSidebar,
  toggleFilterBar() {
    void openLibraryThen(() => dispatchMenuAction(MENU_TOGGLE_FILTER_BAR_EVENT))
  },
  focusSearch() {
    void openLibraryThen(() => dispatchMenuAction(MENU_FOCUS_SEARCH_EVENT))
  },
  navigateBack() {
    if (canGoBack.value) router.back()
  },
  navigateForward() {
    if (canGoForward.value) router.forward()
  },
  openSettings() {
    settingsOpen.value = true
  },
  openDocumentation() {
    void libraryRuntime.system
      .openExternal(DOCUMENTATION_URL)
      .catch(() => toast.warning('无法打开文档链接，请检查系统默认浏览器'))
  },
  copyAsPlainText() {
    void copySelectionAsPlainText()
  },
  pasteAsPlainText() {
    void pasteClipboardAsPlainText()
  }
})
onScopeDispose(stopMenuCommands)

/*
 * 纯文本剪贴板。
 *
 * 选区为空时「复制为纯文本」什么都不写：往剪贴板写空串会把用户已有的内容清掉，
 * 那是比「没复制成功」更坏的失败。前端取选区（WebView 内的选区 Go 看不到），
 * 写入走 Go，避开 navigator.clipboard 在 Wails WebView 里的权限限制。
 */
async function copySelectionAsPlainText() {
  const selection = readSelectionText()
  // 只拿 trim 后的结果判空：写入的必须是用户选中的原文，缩进与首尾空白都属于选区内容。
  if (!selection.trim()) {
    toast.warning('没有可复制的选中文本')
    return
  }
  try {
    await libraryRuntime.system.writeClipboardText(selection)
  } catch {
    toast.warning('无法写入剪贴板，请重试')
  }
}

async function pasteClipboardAsPlainText() {
  if (!hasEditableFocus()) {
    toast.warning('请先把光标放到可输入的位置')
    return
  }
  try {
    const text = await libraryRuntime.system.readClipboardText()
    if (!text) {
      toast.warning('剪贴板中没有文本')
      return
    }
    if (!insertTextAtFocus(text)) toast.warning('当前输入位置无法插入文本')
  } catch {
    toast.warning('无法读取剪贴板，请重试')
  }
}

function dispatchMenuAction(eventName: string) {
  document.dispatchEvent(new CustomEvent(eventName))
}

/*
 * 菜单可用性上报：资源库页命令只在资源库页可用，后退/前进取决于历史栈。
 *
 * 菜单形状在 Go，判据在 Vue，所以由壳层把差集推上去；reporter 自己去重，
 * 避免同一集合在路由与历史的连续变化中反复重建菜单。首次上报放在挂载后：
 * 页面懒加载之前的历史栈此时已经由 installHistoryNav 记录过。
 */
const syncMenuState = createMenuStateReporter(disabled => createMenuStateRuntime().reportDisabled(disabled))

onScopeDispose(
  watch(
    () => [router.currentRoute.value.path, canGoBack.value, canGoForward.value] as const,
    ([path, back, forward]) => {
      // 上报失败只让菜单短暂停在旧状态：不打断界面，下一次路由或历史变化会再报一次。
      // 错误不能再往里吞——reporter 靠 reject 判断这次没生效，才不会把失败记成已同步。
      syncMenuState({ path, canGoBack: back, canGoForward: forward }).catch(() => {})
    },
    { immediate: true }
  )
)

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

/*
 * 启动期一次性警告（设置文件损坏、字段被修正等）随首次快照到达。必须等 settings.load
 * 落定后再取：load 是异步的，挂载时就 takeWarnings 读到的是占位快照里的空数组，真正的
 * 警告会在 applySnapshot 时被一起换掉、永远没人提示。
 */
let warningsTaken = false
watch(
  () => settings.loaded,
  loaded => {
    if (!loaded || warningsTaken) return
    warningsTaken = true
    const warnings = settings.takeWarnings()
    if (warnings.length > 0) toast.warning(warnings.join('\n'))
  },
  { immediate: true }
)

/*
 * 设置读写失败要让用户看见：各 setter 都是 void 调用，失败只落在 store.error 上，
 * 不集中提示就只剩「控件静默回滚」。提示一次后清空，下一次失败会再次触发。
 */
watch(
  () => settings.error,
  () => {
    const error = settings.takeError()
    if (error) toast.error(error)
  },
  { immediate: true }
)
</script>

<template>
  <!--
    shell 在这里，页面在 RouterView 里：web-ui-layout 与 AppNav 挂在 RouterView 之外，
    切路由只换默认 slot 的内容，不重建 sidebar。页面若要占 header slot，让自己的根节点带
    `slot="header"`（LibraryPage 就是这么做的），不需要自己再渲染一套 layout。

    工具条行的首行内边距是 12px，移动端那个浮动开关的 top token 跟着对齐，否则它与行内
    控件差 4px。左偏移别按平台各写一条：macOS 的窗口左上角是红绿灯，开关要右移到 96px 才
    不压在灯上，其余平台与行首内边距对齐用 12px——两条同时存在就只能靠样式表顺序决胜。
  -->
  <web-ui-layout
    header-glow
    sidebar-collapsible
    sidebarResizable
    sidebarMinWidth="160px"
    sidebarMaxWidth="320px"
    mobile-header-full-width
    collapsedWidth="60px"
    class="min-h-dvh overflow-x-clip text-[#22212a] bg-white dark:text-(--wui-color-text) dark:bg-(--wui-color-page) mobile:[--wui-layout-mobile-toggle-top:12px] mobile:[--wui-layout-sidebar-content-padding:8px_20px_8px_8px] mobile:[--wui-layout-sidebar-radius:calc(18px_+_8px)]"
    :class="{
      '[--wui-layout-sidebar-padding-top:48px] mobile:[--wui-layout-mobile-toggle-left:96px]': isMac,
      'mobile:[--wui-layout-mobile-toggle-left:12px]': !isMac
    }"
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
    macOS 上窗口左上角那条 48px 高的空白是 aside 的 padding 区（给红绿灯留的位置），
    web-ui-layout 的 shadow 里没有可挂载的元素，这里用一层透明覆盖把它声明成窗口拖动区：
    红绿灯所在的一整条带子在任何页面都能拖窗口，与被拖动的 header 相邻。宽度跟随 aside，
    高度与 `--wui-layout-sidebar-padding-top` 的 48px 一致；不覆盖内容区，也放行红绿灯
    （那是原生 button，不在 web 层）。
  -->
  <div
    v-if="isMac && !mobile"
    data-window-drag
    aria-hidden="true"
    class="fixed top-0 left-0 z-[600] h-12"
    :style="{ width: sidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : desktopSidebarWidth }"
  />

  <!--
    dialog 是应用壳级 overlay，不是侧边栏的子节点：挂在 AppNav 内部会在 ≤640px 时随 aside 一起
    被 display:none 带走。放在 web-ui-layout 的同级位置，既躲开了那条规则，也让原生 dialog
    提升进 top layer 后不被侧边栏的 overflow 与任何祖先 transform 困住。
  -->
  <SettingsDialog :open="settingsOpen" @update:open="settingsOpen = $event" />
</template>
