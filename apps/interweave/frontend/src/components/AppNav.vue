<script setup lang="ts">
import type { WebUiIcon, WebUiSvgDrawLines } from '@greypan/web-ui'
import { lucideFolderOpen, lucideLayoutGrid, lucideSettings } from '@greypan/web-ui/icons'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type NavKey = 'library' | 'map'

defineProps<{ collapsed?: boolean }>()

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

const navDrawRefs = ref<Record<NavKey, WebUiSvgDrawLines | null>>({
  library: null,
  map: null
})

function setNavDrawRef(key: NavKey, element: unknown) {
  navDrawRefs.value[key] = (element as WebUiSvgDrawLines | null) ?? null
}

const navItemClass =
  /*
   * 过渡只列 background-color，不写 transition-all：ring 由 global.css 绘制，而
   * outline-color 的初始计算值是 currentcolor。transition-all 会把它从深色文字色
   * 补间到浅蓝，Tab 过去时边缘先黑一下再变蓝。
   */
  'flex items-center gap-2 w-full min-w-9 min-h-9 px-2.5 border-0 rounded-full cursor-pointer text-left transition-[background-color] duration-150 text-(--wui-color-text) [--wui-icon-color:var(--wui-color-accent,#08f)] active:bg-[rgb(34_33_42/0.12)] dark:active:bg-white/15 data-[active=true]:bg-(--wui-color-surface-control,#dfdfdf) data-[active=true]:hover:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_90%,var(--wui-color-text,#1b1b1b))] data-[active=true]:active:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_70%,var(--wui-color-text,#1b1b1b))]'

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

function selectNav(item: (typeof navItems)[number]) {
  // shell 挂在 RouterView 之外，切路由不会重建 AppNav，因此这里总能直接播。
  void playDraw(item.key)
  emit('navigate', item.key)
  if (route.path !== item.path) void router.push(item.path)
}
</script>

<template>
  <!--
    pt-2 而不是 pt-14：面板自身圆角 24px，导航项若顶到 y=8 会压进圆角弧里被削掉两角。
    左右 px-3（12px）比它宽，两侧留白比顶部宽一点。

    flex + pb-0 是为了让设置入口贴住面板底部：nav 是流内内容排在上面，设置按钮用 mt-auto
    被推到盒子底边，而 AppNav 正是 .sidebar-viewport（layout 里 flex: 1 的那一格）里 h-full
    的那个盒子，于是这一行的底边恰好落在 .sidebar-toggle-area 的上沿、与折叠 toggle 同一列。
    底部留白改由折叠 toggle 自带的 8px margin 承担，pb 再留一份会把两者推散。nav 的 mb-1 是
    兜底：h-full 万一没解析出来，mt-auto 不生效，没有这 4px 两块就会贴成一片。
  -->
  <div class="relative z-20 flex h-full flex-col pt-2 pb-0 px-3 mobile:px-0" aria-label="应用导航">
    <nav class="grid gap-1 mb-1" aria-label="主导航">
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
            :ref="(element: unknown) => setNavDrawRef(item.key, element)"
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

    <!--
      复用 navItemClass 而不是另写一份：同宽、同内缩、同折叠行为都随它一起成立，折叠态因此
      自动只剩图标，tooltip 也用与导航项相同的 portal/placement/disabled 组合。图标不套
      web-ui-svg-draw-lines——画线动画跟着路由选中语义走，设置不参与导航，就没有可重放的那一次点击。
    -->
    <button
      type="button"
      :class="[navItemClass, collapsed ? 'justify-center' : '', 'mt-auto hover:bg-black/4 dark:hover:bg-white/6']"
      aria-label="设置"
      @click="emit('openSettings')"
    >
      <web-ui-tooltip portal placement="right" content="设置" :disabled="!collapsed">
        <web-ui-icon :icon="lucideSettings" :size="18" />
      </web-ui-tooltip>
      <span v-if="!collapsed" class="text-sm whitespace-nowrap overflow-hidden">设置</span>
    </button>
  </div>
</template>
