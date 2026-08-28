import { ref } from 'vue'

import { router } from '@/router'

/**
 * 基于真实浏览器 history 的前进/后退可用性跟踪。
 *
 * vue-router 只在 router.push() 时维护 history.state.back/forward；地址栏输入、
 * 浏览器前进/后退创建的 entry 会克隆旧 state，导致 back/forward 恒为 null，
 * 无法用来判断能否后退/前进。这里用「已访问 URL 栈 + 当前索引」自行跟踪
 * 浏览器 history 位置，并通过 sessionStorage 持久化，刷新后仍能恢复。
 *
 * 必须在应用启动时（main.ts）调用 installHistoryNav() 全局注册，否则
 * 页面懒加载之前的历史 entry 不会被记录。
 */
const HISTORY_STACK_KEY = 'interweave-shell:history-stack'
const HISTORY_INDEX_KEY = 'interweave-shell:history-index'

const historyStack: string[] = JSON.parse(sessionStorage.getItem(HISTORY_STACK_KEY) ?? 'null') ?? []
let historyIndex = Number(sessionStorage.getItem(HISTORY_INDEX_KEY) ?? '-1')
let installed = false

export const canGoBack = ref(false)
export const canGoForward = ref(false)

function persist() {
  sessionStorage.setItem(HISTORY_STACK_KEY, JSON.stringify(historyStack))
  sessionStorage.setItem(HISTORY_INDEX_KEY, String(historyIndex))
}

function track(to: string) {
  // 同一 entry（刷新 / 重复导航）不处理
  if (historyStack[historyIndex] === to) return
  // 栈里往前找 → 浏览器后退
  const prev = historyStack.lastIndexOf(to, historyIndex - 1)
  if (prev !== -1) {
    historyIndex = prev
  } else {
    // 栈里往后找 → 浏览器前进
    const next = historyStack.indexOf(to, historyIndex + 1)
    if (next !== -1) {
      historyIndex = next
    } else {
      // 全新地址（地址栏输入新路由）→ 截断前进分支并追加
      historyStack.length = historyIndex + 1
      historyStack.push(to)
      historyIndex++
    }
  }
  persist()
}

function sync() {
  canGoBack.value = historyIndex > 0
  canGoForward.value = historyIndex < historyStack.length - 1
}

export function installHistoryNav() {
  if (installed) return
  installed = true
  // 在 mount 之前注册，初始导航完成后 afterEach 会记录真实初始路由
  router.afterEach(to => {
    track(to.fullPath)
    sync()
  })
}
