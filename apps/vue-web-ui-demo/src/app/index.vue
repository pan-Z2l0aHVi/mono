<script setup lang="ts">
import { local } from '@greypan/browser-kit/storage'
import { useHead } from '@unhead/vue'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

type ThemeAppearance = 'light' | 'dark' | 'system'
type ThemeMotion = 'full' | 'reduced' | 'system'

const STORAGE_KEY = 'theme-appearance'
const MOTION_STORAGE_KEY = 'theme-motion'
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

const themeAppearance = ref(getInitialThemeAppearance())
const themeMotion = ref(getInitialThemeMotion())
const appTheme = ref<HTMLElement & { updateComplete?: Promise<unknown> }>()
let themeTransitionOrigin: { x: number; y: number } | undefined

function recordThemeTransitionOrigin(event: MouseEvent) {
  themeTransitionOrigin = { x: event.clientX, y: event.clientY }
}

function resolvedAppearance(appearance: ThemeAppearance): 'light' | 'dark' {
  if (appearance !== 'system') return appearance
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function captureThemeTransitionOrigin(event: PointerEvent) {
  recordThemeTransitionOrigin(event)
}

async function updateThemeAppearance(event: Event) {
  const appearance = (event.currentTarget as HTMLElement & { value?: unknown }).value
  if (!isThemeAppearance(appearance)) return

  const previous = resolvedAppearance(themeAppearance.value)
  const next = resolvedAppearance(appearance)
  if (previous === next) {
    themeAppearance.value = appearance
    local.set(STORAGE_KEY, appearance)
    return
  }

  const reducedMotion =
    themeMotion.value === 'reduced' ||
    (themeMotion.value === 'system' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  if (reducedMotion || !document.startViewTransition) {
    themeAppearance.value = appearance
    local.set(STORAGE_KEY, appearance)
    return
  }

  const x = themeTransitionOrigin?.x ?? window.innerWidth / 2
  const y = themeTransitionOrigin?.y ?? window.innerHeight / 2
  themeTransitionOrigin = undefined
  const radius = Math.ceil(Math.hypot(window.innerWidth, window.innerHeight))
  const root = document.documentElement
  root.classList.add(next === 'dark' ? 'theme-transition--to-dark' : 'theme-transition--to-light')
  root.style.setProperty('--theme-transition-x', `${x}px`)
  root.style.setProperty('--theme-transition-y', `${y}px`)
  root.style.setProperty('--theme-transition-radius', `${radius}px`)

  const transition = document.startViewTransition(async () => {
    themeAppearance.value = appearance
    await nextTick()
    await appTheme.value?.updateComplete
  })
  local.set(STORAGE_KEY, appearance)

  try {
    await transition.finished
  } finally {
    root.classList.remove('theme-transition--to-dark', 'theme-transition--to-light')
    root.style.removeProperty('--theme-transition-x')
    root.style.removeProperty('--theme-transition-y')
    root.style.removeProperty('--theme-transition-radius')
  }
}

function updateThemeMotion(event: Event) {
  const motion = (event.currentTarget as HTMLElement & { value?: unknown }).value
  if (!isThemeMotion(motion)) return

  themeMotion.value = motion
  local.set(MOTION_STORAGE_KEY, motion)
}

const route = useRoute()
const router = useRouter()

useHead({ title: () => route.meta.title })
const navSidebar = ref<HTMLElement>()

onMounted(async () => {
  window.addEventListener('pointermove', recordThemeTransitionOrigin, { passive: true })
  document.addEventListener('pointerdown', recordThemeTransitionOrigin, { capture: true, passive: true })
  document.addEventListener('click', recordThemeTransitionOrigin, { capture: true, passive: true })

  // 等待 Vue Router 完成首次导航，确保 active class 已就绪
  await router.isReady()
  requestAnimationFrame(() => {
    const link = navSidebar.value?.querySelector('.router-link-exact-active')
    link?.scrollIntoView({ block: 'center' })
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', recordThemeTransitionOrigin)
  document.removeEventListener('pointerdown', recordThemeTransitionOrigin, true)
  document.removeEventListener('click', recordThemeTransitionOrigin, true)
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
  { path: '/components/dropdown', label: 'Dropdown 下拉菜单' },
  { path: '/components/dialog', label: 'Dialog 对话框' },
  { path: '/components/drawer', label: 'Drawer 抽屉' },
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
  <web-ui-theme ref="appTheme" :appearance="themeAppearance" :motion="themeMotion">
    <div class="min-h-screen bg-[var(--wui-color-page)] text-[var(--wui-color-text)]">
      <web-ui-layout>
        <div slot="header" class="flex h-full w-full items-center justify-end gap-4 px-4 max-[640px]:w-screen">
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
            :value="themeAppearance"
            class="[--wui-input-width:120px]"
            aria-label="全局主题"
            @pointerdown="captureThemeTransitionOrigin"
            @change="updateThemeAppearance"
          >
            <web-ui-option value="light" label="浅色" @pointerdown="captureThemeTransitionOrigin">浅色</web-ui-option>
            <web-ui-option value="dark" label="深色" @pointerdown="captureThemeTransitionOrigin">深色</web-ui-option>
            <web-ui-option value="system" label="跟随系统" @pointerdown="captureThemeTransitionOrigin">
              跟随系统
            </web-ui-option>
          </web-ui-select>
        </div>
        <nav ref="navSidebar" slot="sidebar" class="h-full overflow-y-auto px-2 pt-3 pb-2">
          <div class="px-3 pb-2 text-xs font-semibold uppercase text-[var(--wui-color-text-muted)]">组件列表</div>
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="block rounded-full px-3 py-2 text-sm leading-5 text-[var(--wui-color-text)] transition-[background-color] duration-150 hover:bg-[color-mix(in_srgb,var(--wui-color-surface-raised)_80%,var(--wui-color-text))]"
            :class="route.path === item.path ? '!bg-[var(--wui-color-accent)] !text-[var(--wui-color-on-accent)]' : ''"
          >
            {{ item.label }}
          </RouterLink>
        </nav>
        <RouterView />
        <div class="h-100 w-full"></div>
      </web-ui-layout>
      <web-ui-back-top></web-ui-back-top>
    </div>
  </web-ui-theme>
</template>

<style>
::view-transition-old(root),
::view-transition-new(root) {
  mix-blend-mode: normal;
  animation: none;
}

::view-transition-group(root) {
  animation: none;
}

/* stylelint-disable-next-line selector-class-pattern */
.theme-transition--to-dark::view-transition-new(root) {
  will-change: clip-path;
  z-index: 2;
  animation: theme-transition-reveal 4.6s linear both;
}

/* stylelint-disable-next-line selector-class-pattern */
.theme-transition--to-dark::view-transition-old(root) {
  z-index: 1;
}

/* stylelint-disable-next-line selector-class-pattern */
.theme-transition--to-light::view-transition-new(root) {
  z-index: 1;
}

/* stylelint-disable-next-line selector-class-pattern */
.theme-transition--to-light::view-transition-old(root) {
  will-change: clip-path;
  z-index: 2;
  animation: theme-transition-reveal 4.6s linear both reverse;
}

@keyframes theme-transition-reveal {
  from {
    clip-path: circle(0 at var(--theme-transition-x) var(--theme-transition-y));
  }

  to {
    clip-path: circle(var(--theme-transition-radius) at var(--theme-transition-x) var(--theme-transition-y));
  }
}
</style>
