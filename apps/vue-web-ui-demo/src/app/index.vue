<script setup lang="ts">
import { local } from '@greypan/browser-kit'
import type { WebUiEvent, WebUiLayout, WebUiSelect } from '@greypan/web-ui'
import { lucideX } from '@greypan/web-ui/icons'
import { webUiScrollbarsOptions } from '@greypan/web-ui/scrollbars'
import { useHead } from '@unhead/vue'
import {
  OverlayScrollbarsComponent,
  useOverlayScrollbars,
  type OverlayScrollbarsComponentRef
} from 'overlayscrollbars-vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

type ThemeAppearance = 'light' | 'dark' | 'system'
type ThemeMotion = 'full' | 'reduced' | 'system'

const STORAGE_KEY = 'theme-appearance'
const MOTION_STORAGE_KEY = 'theme-motion'
const SIDEBAR_WIDTH_STORAGE_KEY = 'sidebar-width'
const DEFAULT_SIDEBAR_WIDTH = '240px'
const THEME_APPEARANCES = new Set<ThemeAppearance>(['light', 'dark', 'system'])
const THEME_MOTIONS = new Set<ThemeMotion>(['full', 'reduced', 'system'])

function isThemeAppearance(appearance: unknown): appearance is ThemeAppearance {
  return typeof appearance === 'string' && THEME_APPEARANCES.has(appearance as ThemeAppearance)
}

function isThemeMotion(motion: unknown): motion is ThemeMotion {
  return typeof motion === 'string' && THEME_MOTIONS.has(motion as ThemeMotion)
}

function getInitialThemeAppearance(): ThemeAppearance {
  const appearance = local.get<unknown>(STORAGE_KEY)
  return isThemeAppearance(appearance) ? appearance : 'light'
}

function getInitialThemeMotion(): ThemeMotion {
  const motion = local.get<unknown>(MOTION_STORAGE_KEY)
  return isThemeMotion(motion) ? motion : 'system'
}

function getInitialSidebarWidth(): string {
  const width = local.get<unknown>(SIDEBAR_WIDTH_STORAGE_KEY)
  return typeof width === 'string' && /^\d+(\.\d+)?px$/.test(width) ? width : DEFAULT_SIDEBAR_WIDTH
}

const themeAppearance = ref(getInitialThemeAppearance())
const themeMotion = ref(getInitialThemeMotion())
const bannerVisible = ref(true)
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
  local.set(STORAGE_KEY, appearance)
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
  local.set(MOTION_STORAGE_KEY, motion)
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
const [initPageScrollbars] = useOverlayScrollbars({ options: webUiScrollbarsOptions })

onMounted(async () => {
  initPageScrollbars(document.body)
  await router.isReady()
  requestAnimationFrame(() => {
    const link = navSidebar.value?.getElement()?.querySelector('[data-active="true"]')
    link?.scrollIntoView({ block: 'center' })
  })
})

interface NavItem {
  path: string
  label: string
}

const navItems: NavItem[] = [
  { path: '/home', label: 'Home' },
  { path: '/components/avatar', label: 'Avatar' },
  { path: '/components/badge', label: 'Badge' },
  { path: '/components/button', label: 'Button' },
  { path: '/components/icon', label: 'Icon' },
  { path: '/components/input', label: 'Input' },
  { path: '/components/textarea', label: 'Textarea' },
  { path: '/components/editable-text', label: 'EditableText' },
  { path: '/components/theme', label: 'Theme' },
  { path: '/components/input-number', label: 'InputNumber' },
  { path: '/components/select', label: 'Select' },
  { path: '/components/autocomplete', label: 'Autocomplete' },
  { path: '/components/dropdown', label: 'Dropdown' },
  { path: '/components/collapse', label: 'Collapse' },
  { path: '/components/dialog', label: 'Dialog' },
  { path: '/components/drawer', label: 'Drawer' },
  { path: '/components/image-preview', label: 'ImagePreview' },
  { path: '/components/empty', label: 'Empty' },
  { path: '/components/middle-ellipsis', label: 'MiddleEllipsis' },
  { path: '/components/tooltip', label: 'Tooltip' },
  { path: '/components/switch', label: 'Switch' },
  { path: '/components/slider', label: 'Slider' },
  { path: '/components/radio', label: 'Radio' },
  { path: '/components/checkbox', label: 'Checkbox' },
  { path: '/components/segmented', label: 'Segmented' },
  { path: '/components/spinner', label: 'Spinner' },
  { path: '/components/popover', label: 'Popover' },
  { path: '/components/context-menu', label: 'ContextMenu' },
  { path: '/components/toast', label: 'Toast' },
  { path: '/components/svg-draw-lines', label: 'SVGDrawLines' },
  { path: '/components/back-top', label: 'BackTop' },
  { path: '/components/layout', label: 'Layout' }
]

// active 底色浅色取设计给定的 #d5d7d7；深色不跟——sidebar 在深色是 #2c2c2e，亮灰会读成一条高亮带，仍走 control 档。
const navItemClass =
  'flex items-center gap-2 w-full min-w-9 min-h-9 px-2.5 border-0 rounded-full cursor-pointer text-left transition-all duration-150 text-(--wui-color-text) active:bg-[rgb(34_33_42/0.12)] dark:active:bg-white/15 data-[active=true]:bg-[#d5d7d7] data-[active=true]:hover:bg-[#d5d7d7] data-[active=true]:active:bg-[color-mix(in_srgb,#d5d7d7_70%,var(--wui-color-text,#1b1b1b))] dark:data-[active=true]:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_90%,var(--wui-color-text,#1b1b1b))] dark:data-[active=true]:hover:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_90%,var(--wui-color-text,#1b1b1b))] dark:data-[active=true]:active:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_70%,var(--wui-color-text,#1b1b1b))]'

function isNavActive(path: string) {
  return route.path === path || route.path === `${path}/`
}
</script>

<template>
  <web-ui-theme :appearance="themeAppearance" :motion="themeMotion">
    <div class="min-h-screen bg-(--wui-color-page) text-(--wui-color-text)">
      <!--
        Boolean 动态绑定走 camelCase Property（Vue 对已存在的属性名直接写 DOM property）。
        kebab-case（:sidebar-collapsed）会写字符串 attribute，布尔属性存在即 true，无法表达 false。
      -->
      <web-ui-layout
        header-glow
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
          class="flex items-center justify-center gap-2 bg-(--wui-color-accent) px-4 py-2 text-sm text-(--wui-color-on-accent)"
        >
          <span>🎉 Welcome to the web-ui component library!</span>
          <web-ui-button
            class="ml-auto"
            size="24"
            icon
            variant="ghost"
            aria-label="关闭横幅"
            @click="bannerVisible = false"
          >
            <web-ui-icon class="text-(--wui-color-on-accent)" :icon="lucideX" :size="16"></web-ui-icon>
          </web-ui-button>
        </div>
        <div slot="header" class="flex h-full w-full items-center justify-end gap-4 px-4 py-2 mobile:w-screen">
          <web-ui-select
            :value="themeMotion"
            class="[--wui-input-width:120px]"
            aria-label="Global motion"
            @change="updateThemeMotion"
          >
            <web-ui-option value="full" label="Full motion">Full motion</web-ui-option>
            <web-ui-option value="reduced" label="Reduced motion">Reduced motion</web-ui-option>
            <web-ui-option value="system" label="Follow system">Follow system</web-ui-option>
          </web-ui-select>
          <web-ui-select
            :value="themeAppearance"
            class="[--wui-input-width:120px]"
            aria-label="Global theme"
            @change="updateThemeAppearance"
          >
            <web-ui-option value="light" label="Light">Light</web-ui-option>
            <web-ui-option value="dark" label="Dark">Dark</web-ui-option>
            <web-ui-option value="system" label="Follow system">Follow system</web-ui-option>
          </web-ui-select>
        </div>
        <OverlayScrollbarsComponent
          slot="sidebar"
          ref="navSidebar"
          :options="webUiScrollbarsOptions"
          class="relative z-20 h-full min-h-0 overflow-y-auto p-2 mobile:px-0"
          aria-label="App navigation"
        >
          <nav class="grid gap-1" aria-label="Main navigation">
            <RouterLink
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              :class="[
                navItemClass,
                isNavActive(item.path) ? '' : 'hover:bg-black/4 dark:hover:bg-white/6',
                navCollapsed ? 'justify-center' : ''
              ]"
              :data-active="isNavActive(item.path)"
              :aria-current="isNavActive(item.path) ? 'page' : undefined"
              :aria-label="item.label"
              @click="sidebarOpen = false"
            >
              <span :class="navCollapsed ? 'w-full truncate text-center text-sm' : 'min-w-0 flex-1 truncate text-sm'">
                {{ item.label }}
              </span>
            </RouterLink>
          </nav>
        </OverlayScrollbarsComponent>
        <div class="p-3">
          <!-- 正文 gutter 归 shell 所有：web-ui-layout 的 main 不带 padding，逐页加会漏页。 -->
          <RouterView />
        </div>
      </web-ui-layout>
      <web-ui-back-top></web-ui-back-top>
    </div>
  </web-ui-theme>
</template>
