/**
 * @description
 * 亡语。只有在使用了 batch track 的时候有必要。
 * 聚合数据批量延迟发送的场景，页面退出｜销毁前立刻清空队列全部上报
 */

import { definePlugin, type PluginMade } from '@mono/utils-core'

import { on } from '@/shortcut'

import type { defineBatchTrack } from './batch-track'

export function defineLastWords() {
  return definePlugin((ctx: PluginMade<typeof defineBatchTrack>) => {
    let controller: AbortController | null = null

    function onLastWords() {
      if (controller) controller.abort()

      controller = new AbortController()
      let hasSent = false
      const flushHandler = () => {
        if (hasSent) return
        hasSent = true
        ctx.flush()
      }
      const { signal } = controller
      on(window, 'beforeunload', flushHandler, { signal })
      on(window, 'pagehide', flushHandler, { signal })
      on(
        document,
        'visibilitychange',
        () => {
          if (document.visibilityState === 'hidden') flushHandler()
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
