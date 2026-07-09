/**
 * @description
 * 亡语插件：页面退出前尝试清空所有待发送数据
 * 不依赖特定插件，只要上游有 flush 方法即可
 */

import { definePlugin, type PluginMade } from '@greypan/js-kit'

import { on } from '@/shortcut'

import type { Flushable } from '../func-types'

import type { defineTracker } from './core'

export function defineLastWords() {
  return definePlugin((ctx: PluginMade<typeof defineTracker> & Flushable) => {
    let controller: AbortController | null = null

    function onLastWords() {
      if (controller) controller.abort()

      controller = new AbortController()
      let hasSent = false
      const handleFlush = () => {
        if (hasSent) return
        hasSent = true
        ctx.flush?.()
      }
      const { signal } = controller
      on(window, 'beforeunload', handleFlush, { signal })
      on(window, 'pagehide', handleFlush, { signal })
      on(
        document,
        'visibilitychange',
        () => {
          if (document.visibilityState === 'hidden') handleFlush()
        },
        { signal }
      )
    }

    function offLastWords() {
      if (controller) controller.abort()
    }

    return {
      onLastWords,
      offLastWords
    }
  })
}
