/**
 * @description
 * 亡语插件：页面退出前尝试清空所有待发送数据
 * 内部自动监听 beforeunload/pagehide/visibilitychange，无需外部调用
 * 如果上游插件（如 batch-track）提供了 flush 方法，会自动调用
 */

import { definePlugin, safeCall, type PluginMade } from '@greypan/js-kit'

import { on } from '@/shortcut'

import type { defineTracker } from '../core'

export function defineLastWords() {
  return definePlugin((ctx: PluginMade<typeof defineTracker>) => {
    // SSR / 非浏览器环境无 window 与 document，插件空转，避免 ReferenceError
    if (typeof window === 'undefined' || typeof document === 'undefined') return {}

    const controller = new AbortController()
    const { signal } = controller
    let hasSent = false

    const handleFlush = () => {
      if (hasSent) return
      hasSent = true
      // flush 由上游 batch-track 等插件提供，可选依赖。退出路径是 best-effort，
      // 持久化提交失败不能变成 unhandled rejection。
      const { flush } = ctx as { flush?: () => void | Promise<void> }
      safeCall(() => flush?.())
    }

    on(window, 'beforeunload', handleFlush, { signal })
    on(window, 'pagehide', handleFlush, { signal })
    on(
      document,
      'visibilitychange',
      () => {
        if (document.visibilityState === 'hidden') {
          handleFlush()
        } else {
          hasSent = false
        }
      },
      { signal }
    )

    return {}
  })
}
