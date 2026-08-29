import { ref } from 'vue'

import { defineHistoryNav, type HistoryNav } from '@greypan/browser-kit/history-nav'

/**
 * history-nav（browser-kit）的 Vue 薄包装。
 *
 * browser-kit 侧只提供纯 TS 对象与事件（AGENTS.md 约束：browser-kit 不得引入
 * 框架运行时），这里把 canGoBack/canGoForward 转成响应式 ref 并订阅
 * currententrychange 更新。页面通过这两个 ref 驱动前进/后退按钮禁用态。
 *
 * 必须在应用启动时（main.ts 调用 installHistoryNav）注册，保证页面懒加载之前
 * 的导航也被记录；defineHistoryNav 本身幂等。
 */
const nav: HistoryNav = defineHistoryNav({ namespace: 'interweave' })

export const canGoBack = ref(nav.canGoBack)
export const canGoForward = ref(nav.canGoForward)

nav.onCurrentEntryChange(() => {
  canGoBack.value = nav.canGoBack
  canGoForward.value = nav.canGoForward
})

export function installHistoryNav(): HistoryNav {
  return nav
}
