import { defineBatchEmitter, definePlugin, type PluginMade } from '@mono/utils-core'
import { nanoid } from 'nanoid'

import type { defineTracker } from './core'

interface Options {
  defaultBatchDelay?: number
  maxBeaconSize?: number
}
type Config = Required<Options>

const DEFAULT_OPTIONS = {
  defaultBatchDelay: 500, // ms
  maxBeaconSize: 64 // kb
}

export function defineBatchTrack(options?: Options) {
  return definePlugin((ctx: PluginMade<typeof defineTracker>) => {
    const config = { ...DEFAULT_OPTIONS, ...options } as Config

    // 简单粗暴的二分分片
    async function sliceTrack(dataList: object[]): Promise<void> {
      if (dataList.length === 0) return
      // 单条埋点数据不太可能超出限制，即使超出也能兜底 fetch 上报逻辑
      if (dataList.length === 1) return ctx.track(dataList)

      const totalSize = dataList.reduce((pre, cur) => pre + ctx.computeDataSize(cur), 0)
      const actualMaxBeaconSize = config.maxBeaconSize * 1024
      if (totalSize > actualMaxBeaconSize) {
        // 二分分片：超出 sendBeacon 限制阈值时分多次发送
        const mid = Math.floor(dataList.length / 2)
        await Promise.all<void>([sliceTrack(dataList.slice(0, mid)), sliceTrack(dataList.slice(mid))])
        return
      }
      return ctx.track(dataList)
    }

    const batchEmitter = defineBatchEmitter<object>(sliceTrack).make()

    async function track(data: object, batchDelay = config.defaultBatchDelay) {
      if (batchDelay <= 0) {
        return ctx.track(data)
      }
      const dataWithId = {
        ...data,
        _track_id: nanoid()
      }
      await batchEmitter.batchEmit(dataWithId, batchDelay)
    }

    function flush() {
      batchEmitter.flush()
    }

    return { track, flush }
  })
}
