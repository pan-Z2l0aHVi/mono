import { type BatchingEmitterApi, createPlugin } from '@mono/utils-core'
import { nanoid } from 'nanoid'

import type { OfflineRestoreApi } from './offline-restore'
import { type Params, type TransportApi } from './transport'

export type QueueId = string
export type TrackerApi = {
  track: <S extends Params>(params: S, isBatching?: boolean) => Promise<void>
  flush: BatchingEmitterApi['flush']
}
export type TrackerOptions = {
  batchingDelay?: number
  paramsProvider?: (id: QueueId) => Params
}
type TrackerConfig = Required<TrackerOptions>

const DEFAULT_OPTIONS = {
  batchingDelay: 200, // ms
  paramsProvider: (id: QueueId) => ({
    id,
    timestamp: Date.now(),
    screen: `${window.screen.width}x${window.screen.height}`
  })
}

export function createTracker(options?: TrackerOptions) {
  return createPlugin<
    'tracker',
    TrackerApi,
    {
      transport: TransportApi
      offlineRestore: OfflineRestoreApi
      batchingEmitter: BatchingEmitterApi
    }
  >('tracker', ctx => {
    const config: TrackerConfig = { ...DEFAULT_OPTIONS, ...options }
    const paramsCache: Map<QueueId, Params> = new Map()

    async function consumeBatchingQueue(queue: QueueId[]): Promise<void> {
      if (!queue.length) return

      const paramsList = queue.map(id => paramsCache.get(id)).filter(v => !!v)
      queue.forEach(id => paramsCache.delete(id))
      if (ctx.offlineRestore) await ctx.offlineRestore.persist(paramsList)
      return ctx.transport.send(paramsList)
    }

    async function track<S extends Params>(params: S, isBatching = false): Promise<void> {
      const { paramsProvider, batchingDelay } = config
      const trackID = nanoid()
      const baseParams = paramsProvider(trackID)
      const mergedParams = {
        ...baseParams,
        ...params
      }
      if (isBatching) {
        paramsCache.set(trackID, mergedParams)
        const queue = await ctx.batchingEmitter.batchingEmit(trackID, batchingDelay)
        return consumeBatchingQueue(queue)
      }
      if (ctx.offlineRestore) await ctx.offlineRestore.persist([mergedParams])
      return ctx.transport.send([mergedParams])
    }

    return {
      track,
      flush: (...args) => ctx.batchingEmitter.flush(...args)
    }
  })
}
