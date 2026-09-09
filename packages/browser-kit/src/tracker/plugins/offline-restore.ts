/**
 * @description
 * 离线恢复插件：离线时暂停 outbox，在线时恢复
 * 内部自动监听 online/offline 事件，无需外部调用
 */

import { definePlugin, safeCall } from '@greypan/js-kit'

import { on } from '@/shortcut'

import type { PauseCapability } from '../capabilities'

export function defineOfflineRestore() {
  return definePlugin((ctx: PauseCapability) => {
    // SSR / 非浏览器环境无 navigator 与 window，插件空转，避免 ReferenceError
    if (typeof window === 'undefined') return {}

    // 启动时已离线，立即暂停
    if (!navigator.onLine) {
      ctx.pause()
    }

    const controller = new AbortController()
    const { signal } = controller

    on(window, 'offline', () => ctx.pause(), { signal })
    on(
      window,
      'online',
      () =>
        safeCall(() => ctx.resume(), {
          // resume() 的 rejection 携带 queue 构造好的 persistence 错误；
          // 这里必须可观察，否则持久化恢复失败将静默丢失。
          onError: error => console.warn(error, 'Tracker 离线恢复（resume）失败，outbox 保持现状。')
        }),
      { signal }
    )

    return {}
  })
}
