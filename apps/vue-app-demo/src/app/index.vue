<script setup lang="ts">
import { local } from '@greypan/browser-kit/storage'
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

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

interface NavItem {
  path: string
  label: string
}

const navItems: NavItem[] = [
  { path: '/home', label: '首页' },
  { path: '/components/avatar', label: '头像' },
  { path: '/components/badge', label: '徽标' },
  { path: '/components/button', label: '按钮' },
  { path: '/components/icon', label: '图标' },
  { path: '/components/input', label: '输入框' },
  { path: '/components/textarea', label: '文本域' },
  { path: '/components/theme', label: '主题' },
  { path: '/components/input-number', label: '数字输入框' },
  { path: '/components/select', label: '下拉选择' },
  { path: '/components/dropdown', label: '下拉菜单' },
  { path: '/components/dialog', label: '对话框' },
  { path: '/components/drawer', label: '抽屉' },
  { path: '/components/empty', label: '空状态' },
  { path: '/components/tooltip', label: '工具提示' },
  { path: '/components/switch', label: '开关' },
  { path: '/components/slider', label: '滑块' },
  { path: '/components/radio', label: '单选框' },
  { path: '/components/checkbox', label: '复选框' },
  { path: '/components/segmented', label: '分段控制器' },
  { path: '/components/spinner', label: '加载指示器' },
  { path: '/components/popover', label: '气泡卡片' },
  { path: '/components/context-menu', label: '右键菜单' },
  { path: '/components/toast', label: 'Toast 通知' }
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
            <web-ui-option value="light">浅色</web-ui-option>
            <web-ui-option value="dark">深色</web-ui-option>
            <web-ui-option value="system">跟随系统</web-ui-option>
          </web-ui-select>
        </div>
        <nav slot="sidebar" class="h-full overflow-y-auto px-2 py-3">
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
