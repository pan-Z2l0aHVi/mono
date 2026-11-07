<script setup lang="ts">
import appScrollbarsOptions from '@greypan/app-scrollbars'
import { local } from '@greypan/browser-kit'
import {
  DEFAULT_SIDEBAR_WIDTH_PX,
  isNavActive,
  isSidebarWidth,
  isThemeAppearance,
  isThemeMotion,
  NAV_ITEM_CLASS,
  NAV_SECTIONS,
  NAV_SECTION_TITLE_CLASS,
  SIDEBAR_WIDTH_STORAGE_KEY,
  THEME_APPEARANCE_STORAGE_KEY,
  THEME_MOTION_STORAGE_KEY,
  type ThemeAppearance,
  type ThemeMotion
} from '@greypan/doc-demo-kit'
import type { WebUiEvent, WebUiLayout, WebUiSelect } from '@greypan/web-ui'
import { toast } from '@greypan/web-ui'
import {
  antDesignSyncOutlined,
  icOutlineMotionPhotosOff,
  icOutlineMotionPhotosOn,
  lucideContrast,
  lucideLanguages,
  lucideMoon,
  lucideSun,
  lucideX
} from '@greypan/web-ui/icons'
import { useHead } from '@unhead/vue'
import {
  OverlayScrollbarsComponent,
  useOverlayScrollbars,
  type OverlayScrollbarsComponentRef
} from 'overlayscrollbars-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import Search from '@/components/search/index.vue'
import { bootDegraded, currentLocale, loadDemoLocale, localePending } from '@/i18n/locale'

import SidebarNavLink from './sidebar-nav-link.vue'

const ZH_LABEL = '简体中文'
const EN_LABEL = 'English'

async function updateLocale(event: WebUiEvent<WebUiSelect, 'change'>) {
  const value = event.currentTarget.value
  if (value !== 'zh-CN' && value !== 'en') return
  // 选择器是受控宿主，准备期间及失败后保持已提交值。
  event.currentTarget.value = currentLocale.value
  try {
    await loadDemoLocale(value)
  } catch (error) {
    console.error(error)
    toast.error('语言切换失败，请刷新页面后重试')
  }
}

function getInitialThemeAppearance(): ThemeAppearance {
  const appearance = local.get<unknown>(THEME_APPEARANCE_STORAGE_KEY)
  return isThemeAppearance(appearance) ? appearance : 'light'
}

function getInitialThemeMotion(): ThemeMotion {
  const motion = local.get<unknown>(THEME_MOTION_STORAGE_KEY)
  return isThemeMotion(motion) ? motion : 'system'
}

function getInitialSidebarWidth(): string {
  const width = local.get<unknown>(SIDEBAR_WIDTH_STORAGE_KEY)
  return isSidebarWidth(width) ? width : DEFAULT_SIDEBAR_WIDTH_PX
}

const themeAppearance = ref(getInitialThemeAppearance())
const themeMotion = ref(getInitialThemeMotion())
const bannerVisible = ref(true)
const searchOpen = ref(false)
const shellLayout = ref<WebUiLayout | null>(null)
const sidebarCollapsed = ref(false)
const sidebarOpen = ref(false)
const mobileSidebarWidth = 'min(320px, 80vw)'
// 移动端判定由 web-ui-layout 给出（它同时决定渲染桌面树还是 drawer）：demo 不自己写断点。
const isMobileSidebarViewport = ref(false)
const desktopSidebarWidth = ref(getInitialSidebarWidth())
const sidebarWidth = computed(() => (isMobileSidebarViewport.value ? mobileSidebarWidth : desktopSidebarWidth.value))

/*
 * collapse 是桌面端的密度偏好，移动端 drawer 恒以展开态呈现同一份导航：drawer 宽
 * min(320px, 80vw)，套用 collapsed state 会把 label 挤成居中截断。web-ui-layout 的
 * `sidebar-collapsed` 契约同样写明它「不会影响移动端 Drawer」，它只是无从替
 * Consumer 决定 slot 内容怎么渲染，所以闸门留在这里。
 */
const navCollapsed = computed(() => sidebarCollapsed.value && !isMobileSidebarViewport.value)
/*
 * layout 的四个 `*-change` 都是 `bubbles: true, composed: true`，而文档页里示例的 `web-ui-layout` 就挂在
 * 本站侧栏的子树内，它一翻转事件就顺着冒到这里。只采信自己这一层：窄视口下点示例的 Toggle，本站 drawer
 * 会跟着打开（实测 `shellDrawerOpen: true`，命中的那条事件 `target` 是示例元素）。
 */
function isOwnLayoutEvent(event: Event): boolean {
  return event.target === event.currentTarget
}

// 挂载即移动端时，layout 会在连接那一刻派发一次 mobile-change，模板监听挂在其之前，
// 因此首帧拿到的就是 layout 自己的判定。
function updateMobileSidebarViewport(event: WebUiEvent<WebUiLayout, 'mobile-change'>) {
  if (!isOwnLayoutEvent(event)) return
  isMobileSidebarViewport.value = event.detail.mobile
}

function commitThemeAppearance(appearance: ThemeAppearance) {
  themeAppearance.value = appearance
  local.set(THEME_APPEARANCE_STORAGE_KEY, appearance)
}

function updateThemeAppearance(event: WebUiEvent<WebUiSelect, 'change'>) {
  const appearance = event.currentTarget.value
  if (!isThemeAppearance(appearance)) return
  commitThemeAppearance(appearance)
}

function updateThemeMotion(event: WebUiEvent<WebUiSelect, 'change'>) {
  const motion = event.currentTarget.value
  if (!isThemeMotion(motion)) return

  themeMotion.value = motion
  local.set(THEME_MOTION_STORAGE_KEY, motion)
}

function updateSidebarCollapsed(event: WebUiEvent<WebUiLayout, 'sidebar-collapsed-change'>) {
  if (!isOwnLayoutEvent(event)) return
  sidebarCollapsed.value = event.detail.collapsed
}

function updateSidebarOpen(event: WebUiEvent<WebUiLayout, 'sidebar-open-change'>) {
  if (!isOwnLayoutEvent(event)) return
  sidebarOpen.value = event.detail.open
}

// 拖拽调宽的受控回写 + localStorage 持久化（仅桌面端生效）
function updateSidebarWidth(event: WebUiEvent<WebUiLayout, 'sidebar-width-change'>) {
  if (!isOwnLayoutEvent(event)) return
  desktopSidebarWidth.value = event.detail.width
  local.set(SIDEBAR_WIDTH_STORAGE_KEY, event.detail.width)
}

const route = useRoute()
const router = useRouter()

useHead({ title: () => route.meta.title })
const navSidebar = ref<OverlayScrollbarsComponentRef>()

// 整页 scrollbar 接管的是 document 的滚动元素，不是某个 DOM 容器，所以没有可渲染的宿主元素，
// 只能直接初始化 body。
const [initPageScrollbars] = useOverlayScrollbars({ options: appScrollbarsOptions })

// 目标语种与文档在挂载后补载，降级可能晚于 onMounted：用 watch 才不会漏掉提示。
watch(bootDegraded, degraded => {
  if (!degraded) return
  toast.warning('目标语种加载失败，暂时使用简体中文')
  bootDegraded.value = false
})

onMounted(async () => {
  initPageScrollbars(document.body)
  await router.isReady()
  requestAnimationFrame(() => {
    const link = navSidebar.value?.getElement()?.querySelector('[data-active="true"]')
    link?.scrollIntoView({ block: 'center' })
  })
})
</script>

<template>
  <web-ui-theme :appearance="themeAppearance" :motion="themeMotion">
    <div class="min-h-screen bg-(--wui-color-page) text-(--wui-color-text)">
      <!--
        Boolean 动态绑定走 camelCase Property（Vue 对已存在的属性名直接写 DOM property）。
        kebab-case（:sidebar-collapsed）会写字符串 attribute，布尔属性存在即 true，无法表达 false。
      -->
      <web-ui-layout
        ref="shellLayout"
        class="mobile:[--wui-layout-sidebar-radius:38px]"
        header-glow
        sidebar-collapsible
        :sidebarCollapsed="sidebarCollapsed"
        :sidebarOpen="sidebarOpen"
        :sidebarWidth="sidebarWidth"
        sidebar-resizable
        sidebar-min-width="120px"
        sidebar-max-width="400px"
        @sidebar-collapsed-change="updateSidebarCollapsed"
        @sidebar-open-change="updateSidebarOpen"
        @sidebar-width-change="updateSidebarWidth"
        @mobile-change="updateMobileSidebarViewport"
      >
        <div
          v-if="bannerVisible"
          slot="banner"
          class="relative grid grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-2 bg-(--wui-color-accent) px-4 py-2 text-sm text-(--wui-color-on-accent)"
        >
          <web-ui-button
            class="absolute top-1/2 right-4 -translate-y-1/2"
            size="24"
            icon
            variant="ghost"
            aria-label="关闭横幅"
            @click="bannerVisible = false"
          >
            <web-ui-icon class="text-(--wui-color-on-accent)" :icon="lucideX"></web-ui-icon>
          </web-ui-button>
          <span class="col-start-2 text-center">🎉 欢迎使用 web-ui 组件库！</span>
        </div>
        <!--
          移动端为前置导航区预留 60px，与 collapsed sidebar 使用同一基准。
          移动端纵向内边距与 layout 的 `.mobile-toggle` 上间距（8px）一致，右侧控件才与左上角切换按钮同高对齐。
        -->
        <div
          slot="header"
          class="flex h-full w-full items-center justify-end gap-2 px-4 py-2 mobile:w-[calc(100vw-60px)] mobile:gap-1.5 mobile:px-2 mobile:py-2"
        >
          <div :class="searchOpen ? 'flex items-center gap-2 mobile:hidden' : 'flex items-center gap-2 mobile:gap-1.5'">
            <web-ui-select variant="icon" :value="themeMotion" aria-label="全局动效" @change="updateThemeMotion">
              <web-ui-icon
                slot="trigger"
                :icon="
                  themeMotion === 'full'
                    ? icOutlineMotionPhotosOn
                    : themeMotion === 'reduced'
                      ? icOutlineMotionPhotosOff
                      : antDesignSyncOutlined
                "
                :size="18"
              ></web-ui-icon>
              <web-ui-option value="full" label="完整动效">完整动效</web-ui-option>
              <web-ui-option value="reduced" label="减弱动效">减弱动效</web-ui-option>
              <web-ui-option value="system" label="跟随系统">跟随系统</web-ui-option>
            </web-ui-select>
            <web-ui-select
              variant="icon"
              :value="themeAppearance"
              placement="bottom"
              aria-label="全局主题"
              @change="updateThemeAppearance"
            >
              <web-ui-icon
                slot="trigger"
                :icon="
                  themeAppearance === 'light' ? lucideSun : themeAppearance === 'dark' ? lucideMoon : lucideContrast
                "
                :size="18"
              ></web-ui-icon>
              <!-- 外观名称由 Wuchale 壳文案统一翻译成 Light / Dark。 -->
              <web-ui-option value="light" label="浅色模式">浅色模式</web-ui-option>
              <web-ui-option value="dark" label="深色模式">深色模式</web-ui-option>
              <web-ui-option value="system" label="跟随系统">跟随系统</web-ui-option>
            </web-ui-select>
            <web-ui-select
              variant="icon"
              :value="currentLocale"
              :disabled="localePending"
              :aria-busy="localePending"
              aria-label="全局语言"
              @change="updateLocale"
            >
              <web-ui-icon slot="trigger" :icon="lucideLanguages" :size="18"></web-ui-icon>
              <web-ui-option value="zh-CN" :label="ZH_LABEL">{{ ZH_LABEL }}</web-ui-option>
              <web-ui-option value="en" :label="EN_LABEL">{{ EN_LABEL }}</web-ui-option>
            </web-ui-select>
            <span v-if="localePending" class="sr-only" role="status">正在加载语言</span>
          </div>
          <Search v-model:open="searchOpen" />
        </div>
        <OverlayScrollbarsComponent
          slot="sidebar"
          ref="navSidebar"
          :options="appScrollbarsOptions"
          class="relative z-20 h-full min-h-0 overflow-y-auto p-2 mobile:p-0"
          aria-label="应用导航"
        >
          <nav class="grid gap-1" aria-label="主导航">
            <SidebarNavLink
              to="/home"
              label="组件总览"
              :active="isNavActive(route.path, '/home')"
              :collapsed="navCollapsed"
              :item-class="NAV_ITEM_CLASS"
              :title="navCollapsed ? undefined : '组件总览'"
              @navigate="sidebarOpen = false"
            />
            <SidebarNavLink
              to="/getting-started"
              label="快速开始"
              :active="isNavActive(route.path, '/getting-started')"
              :collapsed="navCollapsed"
              :item-class="NAV_ITEM_CLASS"
              :title="navCollapsed ? undefined : '快速开始'"
              @navigate="sidebarOpen = false"
            />
            <SidebarNavLink
              to="/changelog"
              label="更新日志"
              :active="isNavActive(route.path, '/changelog')"
              :collapsed="navCollapsed"
              :item-class="NAV_ITEM_CLASS"
              :title="navCollapsed ? undefined : '更新日志'"
              @navigate="sidebarOpen = false"
            />
            <div
              v-for="(section, index) in NAV_SECTIONS"
              :key="section.id"
              role="group"
              :aria-labelledby="`nav-section-${section.id}`"
              class="grid gap-1"
            >
              <div
                v-if="navCollapsed && index > 0"
                class="mx-2 my-1 h-px bg-(--wui-color-border)"
                aria-hidden="true"
              ></div>
              <h2 :id="`nav-section-${section.id}`" :class="[NAV_SECTION_TITLE_CLASS, navCollapsed ? 'sr-only' : '']">
                <template v-if="section.id === 'general'">通用</template>
                <template v-else-if="section.id === 'layout'">布局</template>
                <template v-else-if="section.id === 'form'">表单</template>
                <template v-else-if="section.id === 'display'">展示</template>
                <template v-else>反馈</template>
              </h2>
              <SidebarNavLink
                v-for="item in section.items"
                :key="item.path"
                :to="item.path"
                :label="item.label"
                :active="isNavActive(route.path, item.path)"
                :collapsed="navCollapsed"
                :item-class="NAV_ITEM_CLASS"
                @navigate="sidebarOpen = false"
              />
            </div>
          </nav>
        </OverlayScrollbarsComponent>
        <div class="p-3 sm:px-6 md:px-8 lg:px-10">
          <!-- 正文 gutter 归 shell 所有：web-ui-layout 的 main 不带 padding，逐页加会漏页。 -->
          <RouterView />
        </div>
      </web-ui-layout>
      <web-ui-back-top></web-ui-back-top>
    </div>
  </web-ui-theme>
</template>
