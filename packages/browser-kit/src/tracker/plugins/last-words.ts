/**
 * @description
 * 亡语插件：页面退出前尝试清空所有待发送数据
 * 内部自动监听 beforeunload/pagehide/visibilitychange，无需外部调用
 * 如果上游插件（如 batch-track）提供了 flush 方法，会自动调用
 */

import { definePlugin, type PluginMade } from '@greypan/js-kit'

import { on } from '@/shortcut'

import type { defineTracker } from '../core'

export function defineLastWords() {
  return definePlugin((ctx: PluginMade<typeof defineTracker>) => {
    const controller = new AbortController()
    const { signal } = controller
    let hasSent = false

    const handleFlush = () => {
      if (hasSent) return
      hasSent = true
      // flush 由上游 batch-track 等插件提供，可选依赖
      const { flush } = ctx as { flush?: () => void }
      flush?.()
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
