<script setup lang="ts">
import { local } from '@greypan/browser-kit/storage'
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

type ThemeAppearance = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme-appearance'
const THEME_APPEARANCES = new Set<ThemeAppearance>(['light', 'dark', 'system'])

function isThemeAppearance(appearance: unknown): appearance is ThemeAppearance {
  return typeof appearance === 'string' && THEME_APPEARANCES.has(appearance as ThemeAppearance)
}

function getInitialThemeAppearance(): ThemeAppearance {
  const appearance = local.get<unknown>(STORAGE_KEY)
  return isThemeAppearance(appearance) ? appearance : 'light'
}

const themeAppearance = ref(getInitialThemeAppearance())

function updateThemeAppearance(event: Event) {
  const appearance = (event.currentTarget as HTMLElement & { value?: unknown }).value
  if (!isThemeAppearance(appearance)) return

  themeAppearance.value = appearance
  local.set(STORAGE_KEY, appearance)
}

const route = useRoute()
const router = useRouter()
const navSidebar = ref<HTMLElement>()

onMounted(async () => {
  // 等待 Vue Router 完成首次导航，确保 router-link-active class 已就绪
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
  { path: '/components/svg-draw-lines', label: 'SVGDrawLines 描边动画' }
]
</script>

<template>
  <web-ui-theme :appearance="themeAppearance">
    <div class="min-h-screen bg-[var(--wui-color-page)] text-[var(--wui-color-text)]">
      <web-ui-layout>
        <div slot="header" class="flex h-full items-center justify-end px-4">
          <web-ui-select
            :value="themeAppearance"
            class="[--wui-input-width:120px]"
            aria-label="全局主题"
            @change="updateThemeAppearance"
          >
            <web-ui-option value="light" label="浅色">浅色1</web-ui-option>
            <web-ui-option value="dark" label="深色">深色2</web-ui-option>
            <web-ui-option value="system" label="跟随系统">跟随系统3</web-ui-option>
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
        <div class="h-75 w-full"></div>
      </web-ui-layout>
      <web-ui-back-top></web-ui-back-top>
    </div>
  </web-ui-theme>
</template>
