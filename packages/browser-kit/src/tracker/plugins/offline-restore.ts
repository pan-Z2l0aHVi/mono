/**
 * @description
 * 离线恢复插件：离线时暂停上报 loop，在线时恢复
 * 内部自动监听 online/offline 事件，无需外部调用
 */

import { definePlugin, type PluginMade } from '@greypan/js-kit'

import { on } from '@/shortcut'

import type { defineTracker } from '../core'

export function defineOfflineRestore() {
  return definePlugin((ctx: PluginMade<typeof defineTracker>) => {
    // 启动时已离线，立即暂停
    if (!navigator.onLine) {
      ctx.pause()
    }

    const controller = new AbortController()
    const { signal } = controller

    on(window, 'offline', () => ctx.pause(), { signal })
    on(window, 'online', () => ctx.resume(), { signal })

    return {}
  })
}
