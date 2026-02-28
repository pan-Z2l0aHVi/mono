import { createPlugin } from '@mono/utils-core'
import { del, get, update } from 'idb-keyval'

import { on } from '@/shortcut'

import type { Params, TransportApi } from './transport'

export interface OfflineRestoreApi {
  persist: (paramsList: Params[]) => Promise<void>
  restore: () => Promise<void>
  destroy: () => void
}
export type OfflineRestoreOptions = {
  restoreKey?: string
  restoreMaxSize?: number
}
type OfflineRestoreConfig = Required<OfflineRestoreOptions>

const DEFAULT_OPTIONS = {
  restoreKey: 'tracker-restore',
  restoreMaxSize: 1000
}

export function createOfflineRestore(options?: OfflineRestoreOptions) {
  return createPlugin<'offlineRestore', OfflineRestoreApi, { transport: TransportApi }>('offlineRestore', ctx => {
    const config: OfflineRestoreConfig = { ...DEFAULT_OPTIONS, ...options }

    const persist = (paramsList: Params[]) => {
      const { restoreKey, restoreMaxSize } = config
      return update(restoreKey, (p: Params[] = []) => [...p, ...paramsList].slice(-restoreMaxSize))
    }

    const restore = async () => {
      const { restoreKey } = config
      const paramsList = await get<Params[]>(restoreKey)
      if (!paramsList?.length) return

      await ctx.transport.send(paramsList)
      await del(restoreKey)
    }

    const controller = new AbortController()
    const { signal } = controller
    on(window, 'online', () => restore(), { signal })

    return {
      persist,
      restore,
      destroy: () => controller.abort()
    }
  })
}
