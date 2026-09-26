<script setup lang="ts">
import type { WebUiIcon, WebUiSvgDrawLines } from '@greypan/web-ui'
import { lucideFolderOpen, lucideLayoutGrid } from '@greypan/web-ui/icons'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { NavDrawKey } from '@/composables/useNavDrawHandoff'
import { consumeNavDraw, requestNavDraw } from '@/composables/useNavDrawHandoff'

type NavKey = NavDrawKey

defineProps<{ collapsed?: boolean }>()

const emit = defineEmits<{
  navigate: [key: NavKey]
}>()

const route = useRoute()
const router = useRouter()

const navItems = [
  { key: 'library' as const, label: '资料库', path: '/library', icon: lucideFolderOpen },
  { key: 'map' as const, label: '关系图谱', path: '/map', icon: lucideLayoutGrid }
]

const navDrawRefs = ref<Record<NavKey, WebUiSvgDrawLines | null>>({
  library: null,
  map: null
})

function setNavDrawRef(key: NavKey, element: unknown) {
  navDrawRefs.value[key] = (element as WebUiSvgDrawLines | null) ?? null
}

const navItemClass =
  'flex items-center gap-2 w-full min-w-9 min-h-9 px-2.5 border-0 rounded-full font-medium cursor-pointer text-left transition-all duration-150 text-(--wui-color-text) [--wui-icon-color:var(--wui-color-accent,#08f)] active:bg-[rgb(34_33_42/0.12)] dark:active:bg-white/15 data-[active=true]:bg-(--wui-color-surface-control,#dfdfdf) data-[active=true]:hover:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_90%,var(--wui-color-text,#1b1b1b))] data-[active=true]:active:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_70%,var(--wui-color-text,#1b1b1b))]'

function navKeyOf(path: string): NavKey | undefined {
  return navItems.find(item => item.path === path)?.key
}

/** web-ui-icon 是 Lit 渲染，shadow root 里的几何要等它首次 update 后才在位，否则 replay() 空转。 */
async function playDraw(key: NavKey) {
  const host = navDrawRefs.value[key]
  if (!host) return

  await Promise.all([...host.querySelectorAll<WebUiIcon>('web-ui-icon')].map(icon => icon.updateComplete))

  void host.replay()

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  host.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)', offset: 0.4 }, { transform: 'scale(1)' }], {
    duration: 720,
    easing: 'ease-out'
  })
}

onMounted(async () => {
  // 接住上一个实例发起的导航意图；直接访问或刷新时没有意图，不播。
  const key = navKeyOf(route.path)
  if (consumeNavDraw(key)) await playDraw(key)
})

function selectNav(item: (typeof navItems)[number]) {
  if (route.path === item.path) {
    // 无路由变化，实例存活，直接播。
    void playDraw(item.key)
  } else {
    requestNavDraw(item.key)
  }

  emit('navigate', item.key)
  if (route.path !== item.path) void router.push(item.path)
}
</script>

<template>
  <div class="relative z-20 h-full pt-14 pb-4 px-2 max-[640px]:px-0" aria-label="应用导航">
    <nav class="grid gap-1" aria-label="主导航">
      <button
        v-for="item in navItems"
        :key="item.key"
        type="button"
        :class="[
          navItemClass,
          route.path === item.path ? '' : 'hover:bg-black/4 dark:hover:bg-white/6',
          collapsed ? 'justify-center' : ''
        ]"
        :data-active="route.path === item.path"
        :aria-current="route.path === item.path ? 'page' : undefined"
        :aria-label="item.label"
        @click="selectNav(item)"
      >
        <web-ui-tooltip portal placement="right" :content="collapsed ? item.label : ''" :disabled="!collapsed">
          <web-ui-svg-draw-lines
            :ref="element => setNavDrawRef(item.key, element)"
            :duration="720"
            easing="ease-out"
            no-autoplay
          >
            <web-ui-icon :icon="item.icon" :size="18" />
          </web-ui-svg-draw-lines>
        </web-ui-tooltip>
        <span v-if="!collapsed" class="text-sm whitespace-nowrap overflow-hidden">{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>
