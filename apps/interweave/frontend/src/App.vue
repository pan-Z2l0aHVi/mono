<script setup lang="ts">
import appScrollbarsOptions from '@greypan/app-scrollbars'
import { Window } from '@wailsio/runtime'
import { useOverlayScrollbars } from 'overlayscrollbars-vue'
import { computed, onMounted, onScopeDispose, watch } from 'vue'

import AppLayout from '@/components/AppLayout.vue'
import { dismissStartupLayer, scheduleStartupTimeout } from '@/composables/startupLayer'
import { hasWailsRuntime } from '@/services/runtime'
import { createSettingsRuntime } from '@/services/settings'
import { onAccentFor, useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const settingsRuntime = createSettingsRuntime()

// 设置由 Go 拥有：启动先拉一次全量快照，之后由 settings:changed 事件覆盖。
// 拉取失败不阻塞启动，store 会保留默认快照并把原因写进 error。
void settings.load(settingsRuntime)
const stopSettingsChanges = settingsRuntime.onChanged(snapshot => settings.applySnapshot(snapshot))
onScopeDispose(stopSettingsChanges)

/*
 * 启动层退场的两条路：设置就绪，或超时兜底。
 *
 * 必须等设置落定再撤——撤早了就是「先闪一帧默认主题，再跳成用户主题」，
 * 那正是这一层要解决的问题。超时兜底则是「读不到也不能把人永远挡在 logo 后面」。
 */
const cancelStartupTimeout = scheduleStartupTimeout()
const stopStartupWatch = watch(
  () => settings.loaded,
  loaded => {
    if (!loaded) return
    cancelStartupTimeout()
    // 等一帧，让 theme 属性在同一帧内落到 DOM，再开始淡出。
    requestAnimationFrame(() => dismissStartupLayer())
    stopStartupWatch()
  }
)

// 整页 scrollbar 接管的是 document 的滚动元素，不是某个 DOM 容器，所以没有可渲染的宿主元素，
// 只能直接初始化 body。资源库列表的 virtua WindowVirtualizer 读的是 document.scrollingElement
// 的滚动位置，这个模式下它仍是 html（documentElement），窗口滚动语义保持原生，不受影响。
const [initPageScrollbars] = useOverlayScrollbars({ options: appScrollbarsOptions })

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
 *
 * 强调色背景的前景色由 Go 在快照里按对比度算好下发（presets[].onAccent），前端只查表：
 * 对比度规则是与 macOS 色板绑定的产品事实，不该在前端再实现一遍。
 */
const themeStyle = computed(() => ({
  '--wui-color-accent': settings.accent,
  '--wui-color-on-accent': onAccentFor(settings.accent, settings.presets)
}))

/*
 * 界面缩放的档位由 Go 拥有（菜单改档、设置面板选档都走 settings service），窗口缩放只能经
 * Wails runtime 执行：快照里每出现一个新档位就把它落到窗口上。immediate 那一跳发生在占位
 * 快照（100%），真正的档位随首次读取到达，此时启动层还盖着，用户看不到未缩放的界面。
 */
watch(
  () => settings.zoom,
  zoom => {
    if (!hasWailsRuntime()) return
    void Window.SetZoom(zoom / 100)
  },
  { immediate: true }
)
</script>

<template>
  <web-ui-theme
    :appearance="settings.appearance"
    :motion="settings.reducedMotion ? 'reduced' : 'system'"
    :style="themeStyle"
  >
    <AppLayout />
  </web-ui-theme>
</template>
