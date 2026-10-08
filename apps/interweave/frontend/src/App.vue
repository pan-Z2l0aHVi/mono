<script setup lang="ts">
import { webUiScrollbarsOptions } from '@greypan/web-ui/scrollbars'
import { useOverlayScrollbars } from 'overlayscrollbars-vue'
import { computed, onMounted } from 'vue'

import AppLayout from '@/components/AppLayout.vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

// 整页滚动条接管的是 document 的滚动元素，不是某个 DOM 容器，所以没有可渲染的宿主元素，
// 只能直接初始化 body。资源库列表的 useWindowVirtualizer 读的 window.scrollY 不受影响：
// 这个模式下 html 仍是 documentElement，窗口滚动 API 保持原生语义。
const [initPageScrollbars] = useOverlayScrollbars({ options: webUiScrollbarsOptions })

onMounted(() => {
  initPageScrollbars(document.body)
})

/*
 * appearance 必须始终作为 attribute 存在，不能在无值时整个省掉：web-ui-theme 靠它选 token
 * 分支，attribute 缺失会让整个 scope 的 token 掉光（theme/index.ts 会 dev warn）。
 * 三态里 system 由 theme 自己按 prefers-color-scheme 解析，宿主不存派生值。
 *
 * accent 只能靠覆盖 CSS 变量：theme 没有 accent 属性。写成内联 style 而不是 <style> 规则，
 * 是为了赢过 theme 自己那条 :host([appearance=...]) —— 内联样式优先级高于任何作者样式表规则，
 * 于是一处覆盖同时压住 light / dark / system 三个分支。
 */
const themeStyle = computed(() => ({ '--wui-color-accent': settings.accent }))
</script>

<template>
  <web-ui-theme :appearance="settings.appearance" :style="themeStyle">
    <AppLayout />
  </web-ui-theme>
</template>
