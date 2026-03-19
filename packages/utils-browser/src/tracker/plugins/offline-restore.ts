/**
 * @description
 * 离线时收集埋点数据先存本地，等到重连或页面刷新后再上报
 * 需要持久化，避免数据太大放不下，选用 indexDB 而不是 localStorage
 */

import { definePlugin, type PluginMade } from '@mono/utils-core'
import { del, get, update } from 'idb-keyval'
import { isDeepEqual, uniqueWith } from 'remeda'

import { on } from '@/shortcut'

import type { defineTracker } from './core'

type Options = {
  restoreKey?: string
  restoreMaxSize?: number
}
type Config = Required<Options>

const DEFAULT_OPTIONS = {
  restoreKey: 'tracker-restore',
  restoreMaxSize: 1000 // 条
}

export function defineOfflineRestore(options: Options) {
  return definePlugin((ctx: PluginMade<typeof defineTracker>) => {
    const config: Config = { ...DEFAULT_OPTIONS, ...options }

    let staged: object[] = []

    function track(data: object): Promise<void> {
      if (!navigator.onLine) {
        staged.push(data)
      }
      return ctx.track(data)
    }

    function save(): Promise<void> {
      return update(config.restoreKey, (p: object[] = []) =>
        uniqueWith([...p, ...staged], isDeepEqual).slice(-config.restoreMaxSize)
      )
    }

    async function init(): Promise<void> {
      const caches = await get<object[]>(config.restoreKey)
      if (!caches || !caches.length) return
      for (const data of caches) {
        ctx.track(data)
      }
      staged = []
      del(config.restoreKey)
    }

    init()

    let controller: AbortController | null = null

    function onOfflineRestore() {
      if (controller) controller.abort()
      controller = new AbortController()
      const { signal } = controller
      on(
        window,
        'offline',
        () => {
          if (staged.length) save()
        },
        { signal }
      )
      on(
        window,
        'online',
        () => {
          init()
        },
        { signal }
      )
    }

    function offOfflineRestore() {
      if (controller) controller.abort()
    }

    return {
      track,
      onOfflineRestore,
      offOfflineRestore
    }
  })
}
