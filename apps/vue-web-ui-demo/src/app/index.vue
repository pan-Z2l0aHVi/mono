<script setup lang="ts">
import { local } from '@greypan/browser-kit/storage'
import type { WebUiEvent, WebUiLayout, WebUiSelect, WebUiTheme } from '@greypan/web-ui'
import { useHead } from '@unhead/vue'
import { computed, nextTick, onMounted, onScopeDispose, ref } from 'vue'
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
const themeRoot = ref<WebUiTheme>()
const themeSelect = ref<WebUiSelect>()
let themeSelectPointer: { x: number; y: number } | undefined
let activeThemeTransition: ViewTransition | undefined

const THEME_TRANSITION_VARS = ['--theme-transition-x', '--theme-transition-y', '--theme-transition-radius'] as const

const mobileSidebarWidth = 'min(320px, 80vw)'
const mobileSidebarQuery = window.matchMedia('(max-width: 640px)')
const isMobileSidebarViewport = ref(mobileSidebarQuery.matches)
const desktopSidebarWidth = ref(getInitialSidebarWidth())
const sidebarWidth = computed(() => (isMobileSidebarViewport.value ? mobileSidebarWidth : desktopSidebarWidth.value))
function syncMobileSidebarViewport() {
  isMobileSidebarViewport.value = mobileSidebarQuery.matches
}
syncMobileSidebarViewport()
mobileSidebarQuery.addEventListener('change', syncMobileSidebarViewport)
onScopeDispose(() => mobileSidebarQuery.removeEventListener('change', syncMobileSidebarViewport))

function recordThemeSelectPointer(event: PointerEvent) {
  themeSelectPointer = { x: event.clientX, y: event.clientY }
}

function resolvedAppearance(appearance: ThemeAppearance): 'light' | 'dark' {
  if (appearance !== 'system') return appearance
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// 「全局动效」下拉是显式覆盖项，动效语义以 web-ui-theme 的 isReducedMotion 为唯一来源
function skipThemeTransition(): boolean {
  return !themeRoot.value || themeRoot.value.isReducedMotion()
}

// 指针位置只记在主题控件上，键盘选择不会被页面其它地方的点击带偏；无坐标时退回控件中心
function themeTransitionOrigin(): { x: number; y: number } {
  if (themeSelectPointer) return themeSelectPointer
  const box = themeSelect.value?.getBoundingClientRect()
  if (box?.width) return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

function commitThemeAppearance(appearance: ThemeAppearance) {
  themeAppearance.value = appearance
  local.set(STORAGE_KEY, appearance)
}

async function transitionThemeAppearance(appearance: ThemeAppearance, next: 'light' | 'dark') {
  const root = document.documentElement
  // 过渡未结束前的新请求直接落地：同方向 class 与圆心变量都是单 owner 资源，
  // 与其让后续动画互相 skip 并清理掉对方的 state，不如保证状态一步到位。
  if (activeThemeTransition) {
    commitThemeAppearance(appearance)
    return
  }

  const { x, y } = themeTransitionOrigin()
  // 半径取到最远角，圆心落在视口任意位置都能覆盖整屏
  const radius = Math.ceil(Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)))
  root.style.setProperty('--theme-transition-x', `${x}px`)
  root.style.setProperty('--theme-transition-y', `${y}px`)
  root.style.setProperty('--theme-transition-radius', `${radius}px`)
  const direction = next === 'dark' ? 'theme-transition-to-dark' : 'theme-transition-to-light'
  root.classList.add(direction)

  const transition = document.startViewTransition(async () => {
    commitThemeAppearance(appearance)
    await nextTick()
    await themeRoot.value?.updateComplete
  })
  activeThemeTransition = transition
  // finished 必须先接住：updateCallbackDone reject 时控制流离开 try，不能留 unhandled rejection
  const finished = transition.finished.catch(() => undefined)
  try {
    // 旧快照在 startViewTransition 调用瞬间采集，所以主题变更必须留在回调里；
    // Vue 的 DOM 更新和 web-ui-theme 的 Lit 渲染都是异步的，新快照要等这两步落地。
    await transition.updateCallbackDone
    await finished
  } finally {
    if (activeThemeTransition === transition) activeThemeTransition = undefined
    root.classList.remove(direction)
    for (const name of THEME_TRANSITION_VARS) root.style.removeProperty(name)
  }
}

async function updateThemeAppearance(event: WebUiEvent<WebUiSelect, 'change'>) {
  const appearance = event.currentTarget.value
  if (!isThemeAppearance(appearance)) return

  const previous = resolvedAppearance(themeAppearance.value)
  const next = resolvedAppearance(appearance)
  if (previous === next || !document.startViewTransition || skipThemeTransition()) {
    commitThemeAppearance(appearance)
    return
  }
  await transitionThemeAppearance(appearance, next)
}

function updateThemeMotion(event: WebUiEvent<WebUiSelect, 'change'>) {
  const motion = event.currentTarget.value
  if (!isThemeMotion(motion)) return

  themeMotion.value = motion
  local.set(MOTION_STORAGE_KEY, motion)
}

function updateSidebarCollapsed(event: WebUiEvent<WebUiLayout, 'sidebar-collapsed-change'>) {
  sidebarCollapsed.value = event.detail.collapsed
}

function updateSidebarOpen(event: WebUiEvent<WebUiLayout, 'sidebar-open-change'>) {
  sidebarOpen.value = event.detail.open
}

// 拖拽调宽的受控回写 + localStorage 持久化（仅桌面端生效）
function updateSidebarWidth(event: WebUiEvent<WebUiLayout, 'sidebar-width-change'>) {
  desktopSidebarWidth.value = event.detail.width
  local.set(SIDEBAR_WIDTH_STORAGE_KEY, event.detail.width)
}

const route = useRoute()
const router = useRouter()

useHead({ title: () => route.meta.title })
const navSidebar = ref<HTMLElement>()

onMounted(async () => {
  await router.isReady()
  requestAnimationFrame(() => {
    const link = navSidebar.value?.querySelector('.router-link-exact-active')
    link?.scrollIntoView({ block: 'center' })
  })
})

interface NavItem {
  path: string
  label: string
}

const navItems: NavItem[] = [
  { path: '/home', label: '首页' },
  { path: '/components/avatar', label: 'Avatar 头像' },
  { path: '/components/badge', label: 'Badge 徽标' },
  { path: '/components/button', label: 'Button 按钮' },
  { path: '/components/icon', label: 'Icon 图标' },
  { path: '/components/input', label: 'Input 输入框' },
  { path: '/components/textarea', label: 'Textarea 文本域' },
  { path: '/components/theme', label: 'Theme 主题' },
  { path: '/components/input-number', label: 'InputNumber 数字输入框' },
  { path: '/components/select', label: 'Select 下拉选择' },
  { path: '/components/autocomplete', label: 'Autocomplete 自动补全' },
  { path: '/components/dropdown', label: 'Dropdown 下拉菜单' },
  { path: '/components/collapse', label: 'Collapse 折叠面板' },
  { path: '/components/dialog', label: 'Dialog 对话框' },
  { path: '/components/drawer', label: 'Drawer 抽屉' },
  { path: '/components/image-preview', label: 'ImagePreview 图片预览' },
  { path: '/components/empty', label: 'Empty 空状态' },
  { path: '/components/tooltip', label: 'Tooltip 工具提示' },
  { path: '/components/switch', label: 'Switch 开关' },
  { path: '/components/slider', label: 'Slider 滑块' },
  { path: '/components/radio', label: 'Radio 单选框' },
  { path: '/components/checkbox', label: 'Checkbox 复选框' },
  { path: '/components/segmented', label: 'Segmented 分段控制器' },
  { path: '/components/spinner', label: 'Spinner 加载指示器' },
  { path: '/components/popover', label: 'Popover 气泡卡片' },
  { path: '/components/context-menu', label: 'ContextMenu 右键菜单' },
  { path: '/components/toast', label: 'Toast 通知' },
  { path: '/components/svg-draw-lines', label: 'SVGDrawLines 描边动画' },
  { path: '/components/back-top', label: 'BackTop 回到顶部' }
]
</script>

<template>
  <web-ui-theme ref="themeRoot" :appearance="themeAppearance" :motion="themeMotion">
    <div class="min-h-screen bg-[var(--wui-color-page)] text-[var(--wui-color-text)]">
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
      >
        <div
          v-if="bannerVisible"
          slot="banner"
          class="flex items-center justify-center gap-2 py-2 px-4 bg-[var(--wui-color-accent)] text-[var(--wui-color-on-accent)] text-sm"
        >
          <span>🎉 欢迎使用 web-ui 组件库！</span>
          <button class="ml-auto text-current opacity-70 hover:opacity-100" @click="bannerVisible = false">✕</button>
        </div>
        <div slot="header" class="flex h-full w-full items-center justify-end gap-4 px-4 py-2 max-[640px]:w-screen">
          <web-ui-select
            :value="themeMotion"
            class="[--wui-input-width:120px]"
            aria-label="全局动效"
            @change="updateThemeMotion"
          >
            <web-ui-option value="full" label="完整动效">完整动效</web-ui-option>
            <web-ui-option value="reduced" label="减少动效">减少动效</web-ui-option>
            <web-ui-option value="system" label="跟随系统">跟随系统</web-ui-option>
          </web-ui-select>
          <web-ui-select
            ref="themeSelect"
            :value="themeAppearance"
            class="[--wui-input-width:120px]"
            aria-label="全局主题"
            @pointerdown.capture="recordThemeSelectPointer"
            @change="updateThemeAppearance"
          >
            <web-ui-option value="light" label="浅色">浅色</web-ui-option>
            <web-ui-option value="dark" label="深色">深色</web-ui-option>
            <web-ui-option value="system" label="跟随系统">跟随系统</web-ui-option>
          </web-ui-select>
        </div>
        <div class="flex h-full min-h-0 flex-col" slot="sidebar">
          <div
            class="shrink-0 px-5 pt-4 pb-2 text-xs font-semibold uppercase text-[var(--wui-color-text-secondary)] max-[640px]:px-0"
          >
            组件列表
          </div>
          <nav ref="navSidebar" class="min-h-0 flex-1 p-2 max-[640px]:px-0 overflow-y-auto">
            <RouterLink
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="flex items-center h-8 my-1 rounded-full px-3 text-sm leading-5 text-[var(--wui-color-text)] transition-[background-color] duration-150 hover:bg-[color-mix(in_srgb,var(--wui-color-surface-raised)_80%,var(--wui-color-text))]"
              :class="
                route.path === item.path ? '!bg-[var(--wui-color-accent)] !text-[var(--wui-color-on-accent)]' : ''
              "
            >
              <span class="truncate">{{ item.label }}</span>
            </RouterLink>
          </nav>
        </div>
        <RouterView />
        <div class="h-100 w-full"></div>
      </web-ui-layout>
      <web-ui-back-top></web-ui-back-top>
    </div>
  </web-ui-theme>
</template>
