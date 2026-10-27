<script setup lang="ts">
import appScrollbarsOptions from '@greypan/app-scrollbars'
import { local } from '@greypan/browser-kit'
import type { WebUiEvent, WebUiLayout, WebUiSelect, WebUiTheme, WebUiToast } from '@greypan/web-ui'
import { toast } from '@greypan/web-ui'
import { lucideX } from '@greypan/web-ui/icons'
import { useHead } from '@unhead/vue'
import {
  OverlayScrollbarsComponent,
  useOverlayScrollbars,
  type OverlayScrollbarsComponentRef
} from 'overlayscrollbars-vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { bootDegraded, currentLocale, loadDemoLocale, localePending } from '@/i18n/locale'

const LIGHT_LABEL = 'Light'
const DARK_LABEL = 'Dark'
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
const topToastBottom = ref(0)
// 桌面端关闭按钮在 banner 右端，与默认 top-right toast 的位置重叠：按 toast 实际左缘给它让位。
const topRightToastInset = ref(0)
let stopObservingToastBounds: (() => void) | undefined
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
const [initPageScrollbars] = useOverlayScrollbars({ options: appScrollbarsOptions })

function observeToastBounds() {
  const topToasts = new Set<WebUiToast>()
  const containers = new Set<HTMLElement>()
  const shadowRootObservers = new Map<ShadowRoot, MutationObserver>()
  let measureFrame: number | undefined
  const updateToastBottom = () => {
    let bottom = 0
    let rightInset = 0
    for (const toast of topToasts) {
      const bounds = toast.getBoundingClientRect()
      const clip = toast.parentElement?.getBoundingClientRect()
      if (!clip) continue
      // 堆栈可滚动，不能给被容器或视口裁掉的 toast 预留空间。
      const visibleBottom = Math.min(bounds.bottom, clip.bottom, window.innerHeight)
      const visibleTop = Math.max(bounds.top, clip.top, 0)
      if (visibleBottom <= visibleTop) continue
      bottom = Math.max(bottom, visibleBottom)
      if (toast.position === 'top-right') {
        rightInset = Math.max(rightInset, window.innerWidth - Math.max(bounds.left, 0) + 8)
      }
    }
    topToastBottom.value = bottom
    topRightToastInset.value = rightInset
  }
  // 留到下一帧更新 banner，避免在 ResizeObserver 派发中再次触发布局尺寸通知。
  const scheduleMeasurement = () => {
    if (measureFrame !== undefined) return
    measureFrame = requestAnimationFrame(() => {
      measureFrame = undefined
      updateToastBottom()
    })
  }
  const resizeObserver = new ResizeObserver(scheduleMeasurement)

  const collectThemeScopes = (root: ParentNode, themes: Set<WebUiTheme>, shadowRoots: Set<ShadowRoot>) => {
    for (const element of root.querySelectorAll<HTMLElement>('*')) {
      if (element.matches('web-ui-theme')) themes.add(element as WebUiTheme)
      if (!element.shadowRoot) continue

      shadowRoots.add(element.shadowRoot)
      collectThemeScopes(element.shadowRoot, themes, shadowRoots)
    }
  }

  const updateToasts = () => {
    const themes = new Set<WebUiTheme>()
    const shadowRoots = new Set<ShadowRoot>()
    collectThemeScopes(document.body, themes, shadowRoots)

    for (const [shadowRoot, observer] of shadowRootObservers) {
      if (shadowRoots.has(shadowRoot)) continue
      observer.disconnect()
      shadowRootObservers.delete(shadowRoot)
    }

    for (const shadowRoot of shadowRoots) {
      if (shadowRootObservers.has(shadowRoot)) continue
      const observer = new MutationObserver(updateToasts)
      observer.observe(shadowRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['position'] })
      shadowRootObservers.set(shadowRoot, observer)
    }

    const nextTopToasts = new Set(
      Array.from(themes).flatMap(theme =>
        Array.from(theme.getOverlayRoot()?.querySelectorAll<WebUiToast>('web-ui-toast') ?? []).filter(toast =>
          toast.position.startsWith('top')
        )
      )
    )
    for (const toast of topToasts) {
      if (nextTopToasts.has(toast)) continue
      resizeObserver.unobserve(toast)
      topToasts.delete(toast)
    }
    for (const toast of nextTopToasts) {
      if (topToasts.has(toast)) continue
      topToasts.add(toast)
      resizeObserver.observe(toast)
    }
    const nextContainers = new Set(
      Array.from(nextTopToasts, toast => toast.parentElement).filter((element): element is HTMLElement => !!element)
    )
    for (const container of containers) {
      if (nextContainers.has(container)) continue
      container.removeEventListener('scroll', scheduleMeasurement)
      resizeObserver.unobserve(container)
      containers.delete(container)
    }
    for (const container of nextContainers) {
      if (containers.has(container)) continue
      containers.add(container)
      container.addEventListener('scroll', scheduleMeasurement, { passive: true })
      resizeObserver.observe(container)
    }
    updateToastBottom()
  }

  updateToasts()
  const themeObserver = new MutationObserver(updateToasts)
  themeObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['position']
  })
  window.addEventListener('resize', scheduleMeasurement, { passive: true })

  return () => {
    themeObserver.disconnect()
    resizeObserver.disconnect()
    if (measureFrame !== undefined) cancelAnimationFrame(measureFrame)
    for (const observer of shadowRootObservers.values()) observer.disconnect()
    for (const container of containers) container.removeEventListener('scroll', scheduleMeasurement)
    window.removeEventListener('resize', scheduleMeasurement)
  }
}

onBeforeUnmount(() => stopObservingToastBounds?.())

onMounted(async () => {
  initPageScrollbars(document.body)
  stopObservingToastBounds = observeToastBounds()
  if (bootDegraded.value) {
    toast.warning('目标语种加载失败，暂时使用简体中文')
    bootDegraded.value = false
  }
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
          v-if="bannerVisible || topToastBottom > 0"
          slot="banner"
          class="relative grid grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-2 bg-(--wui-color-accent) px-4 py-2 text-sm text-(--wui-color-on-accent)"
          :class="{ 'invisible pointer-events-none': !bannerVisible }"
          :aria-hidden="!bannerVisible"
          :style="{ minHeight: `${topToastBottom}px` }"
        >
          <web-ui-button
            class="absolute top-1/2 -translate-y-1/2 mobile:left-0"
            :style="{ right: isMobileSidebarViewport ? 'auto' : `${16 + topRightToastInset}px` }"
            size="24"
            icon
            variant="ghost"
            aria-label="关闭横幅"
            @click="bannerVisible = false"
          >
            <web-ui-icon class="text-(--wui-color-on-accent)" :icon="lucideX" :size="16"></web-ui-icon>
          </web-ui-button>
          <span class="col-start-2 text-center">🎉 欢迎使用 web-ui 组件库！</span>
        </div>
        <div slot="header" class="flex h-full w-full items-center justify-end gap-2 px-4 py-2 mobile:w-screen">
          <web-ui-select
            :value="themeMotion"
            class="[--wui-input-width:120px] mobile:[--wui-input-width:90px]"
            aria-label="全局动效"
            @change="updateThemeMotion"
          >
            <web-ui-option value="full" label="完整动效">完整动效</web-ui-option>
            <web-ui-option value="reduced" label="减弱动效">减弱动效</web-ui-option>
            <web-ui-option value="system" label="跟随系统">跟随系统</web-ui-option>
          </web-ui-select>
          <web-ui-select
            :value="themeAppearance"
            class="[--wui-input-width:120px] mobile:[--wui-input-width:90px]"
            aria-label="全局主题"
            @change="updateThemeAppearance"
          >
            <web-ui-option value="light" :label="LIGHT_LABEL">{{ LIGHT_LABEL }}</web-ui-option>
            <web-ui-option value="dark" :label="DARK_LABEL">{{ DARK_LABEL }}</web-ui-option>
            <web-ui-option value="system" label="跟随系统">跟随系统</web-ui-option>
          </web-ui-select>
          <web-ui-select
            :value="currentLocale"
            :disabled="localePending"
            :aria-busy="localePending"
            class="[--wui-input-width:120px] mobile:[--wui-input-width:90px]"
            aria-label="全局语言"
            @change="updateLocale"
          >
            <web-ui-option value="zh-CN" :label="ZH_LABEL">{{ ZH_LABEL }}</web-ui-option>
            <web-ui-option value="en" :label="EN_LABEL">{{ EN_LABEL }}</web-ui-option>
          </web-ui-select>
          <span v-if="localePending" class="sr-only" role="status">正在加载语言</span>
        </div>
        <OverlayScrollbarsComponent
          slot="sidebar"
          ref="navSidebar"
          :options="appScrollbarsOptions"
          class="relative z-20 h-full min-h-0 overflow-y-auto p-2 mobile:px-0"
          aria-label="应用导航"
        >
          <nav class="grid gap-1" aria-label="主导航">
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
              :title="navCollapsed ? item.label : undefined"
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
