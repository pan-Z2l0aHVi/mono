<script setup lang="ts">
import { ciSettingsFuture, lucideFolderOpen, lucideLayoutGrid } from '@greypan/web-ui/icons'
import { useRoute, useRouter } from 'vue-router'

import PressDrawIcon from './PressDrawIcon.vue'

type NavKey = 'library' | 'map'

defineProps<{ collapsed?: boolean; mobile?: boolean }>()

const emit = defineEmits<{
  navigate: [key: NavKey]
  openSettings: []
}>()

const route = useRoute()
const router = useRouter()

const navItems = [
  { key: 'library', label: '资料库', path: '/library', icon: lucideFolderOpen },
  { key: 'map', label: '关系图谱', path: '/map', icon: lucideLayoutGrid }
] as const

const navItemClass =
  /*
   * 过渡只列 background-color，不写 transition-all：ring 由 global.css 绘制，而
   * outline-color 的初始计算值是 currentcolor。transition-all 会把它从深色文字色
   * 补间到浅蓝，Tab 过去时边缘先黑一下再变蓝。
   */
  'flex items-center gap-2 w-full min-w-9 min-h-9 px-2.5 border-0 rounded-full cursor-pointer text-left transition-[background-color] duration-(--wui-duration-trigger) text-(--wui-color-text) [--wui-icon-color:var(--wui-color-accent,#08f)] active:bg-[rgb(27_27_48/0.12)] dark:active:bg-white/15 data-[active=true]:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#e5e5eb)_95%,#1b1b30)] dark:data-[active=true]:bg-(--wui-color-surface-control,#e5e5eb) data-[active=true]:hover:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#e5e5eb)_90%,#1b1b30)] data-[active=true]:active:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#e5e5eb)_70%,#1b1b30)] dark:data-[active=true]:hover:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#e5e5eb)_90%,var(--wui-color-text,#1b1b20))] dark:data-[active=true]:active:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#e5e5eb)_70%,var(--wui-color-text,#1b1b20))]'

function selectNav(item: (typeof navItems)[number]) {
  emit('navigate', item.key)
  if (route.path !== item.path) void router.push(item.path)
}
</script>

<template>
  <div class="relative z-20 flex h-full flex-col" :class="mobile ? 'p-0' : 'p-2 pb-0'" aria-label="应用导航">
    <nav class="grid gap-1 mb-1" aria-label="主导航">
      <button
        v-for="item in navItems"
        :key="item.key"
        type="button"
        :class="[navItemClass, route.path === item.path ? '' : 'hover:bg-[#1b1b30]/4 dark:hover:bg-white/6']"
        :data-active="route.path === item.path"
        :aria-current="route.path === item.path ? 'page' : undefined"
        :aria-label="item.label"
        @click="selectNav(item)"
      >
        <web-ui-tooltip portal placement="right" :content="collapsed ? item.label : ''" :disabled="!collapsed">
          <PressDrawIcon>
            <web-ui-icon :icon="item.icon" :size="18" />
          </PressDrawIcon>
        </web-ui-tooltip>
        <span v-if="!collapsed" class="text-sm whitespace-nowrap overflow-hidden">{{ item.label }}</span>
      </button>
    </nav>

    <web-ui-dropdown-divider class="mt-auto [--wui-space-1:8px]" />
    <button
      type="button"
      :class="[navItemClass, 'hover:bg-[#1b1b30]/4 dark:hover:bg-white/6']"
      aria-label="设置"
      @click="emit('openSettings')"
    >
      <web-ui-tooltip portal placement="right" content="设置" :disabled="!collapsed">
        <PressDrawIcon>
          <web-ui-icon :icon="ciSettingsFuture" :size="18" />
        </PressDrawIcon>
      </web-ui-tooltip>
      <span v-if="!collapsed" class="text-sm whitespace-nowrap overflow-hidden">设置</span>
    </button>
  </div>
</template>
