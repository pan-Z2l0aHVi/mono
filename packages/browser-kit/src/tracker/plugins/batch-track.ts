// 扩展 core track(data) 为 track(data, batchDelay?)，支持聚合上报
// batchDelay <= 0 时跳过批处理，直接逐条上报
import { defineBatchEmitter, definePlugin, type PluginMade } from '@greypan/js-kit'
import { nanoid } from 'nanoid'

import type { Flushable } from '../func-types'

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
  return definePlugin((ctx: PluginMade<typeof defineTracker> & Flushable) => {
    const config = { ...DEFAULT_OPTIONS, ...options } as Config

    // 超出 sendBeacon 64KB 限制时二分递归分片
    // 注意：ctx.track 支持传入数组，后端批量接收
    async function sliceTrack(dataList: object[]): Promise<void> {
      if (dataList.length === 0) return
      if (dataList.length === 1) return ctx.track(dataList)

      const totalSize = dataList.reduce((pre, cur) => pre + ctx.computeDataSize(cur), 0)
      const actualMaxBeaconSize = config.maxBeaconSize * 1024
      if (totalSize > actualMaxBeaconSize) {
        const mid = Math.floor(dataList.length / 2)
        await Promise.all<void>([sliceTrack(dataList.slice(0, mid)), sliceTrack(dataList.slice(mid))])
        return
      }
      return ctx.track(dataList)
    }

    const batchEmitter = defineBatchEmitter<object>(sliceTrack).make()

    // batchDelay <= 0 时立即上报，否则聚合后统一上报
    async function track(data: object, batchDelay = config.defaultBatchDelay) {
      if (batchDelay <= 0) {
        return ctx.track(data)
      }
      // _track_id 用于后端去重，展开运算符不修改原始 data
      const dataWithId = {
        ...data,
        _track_id: nanoid()
      }
      await batchEmitter.batchEmit(dataWithId, batchDelay)
    }

    function flush() {
      batchEmitter.flush()
      ctx.flush?.()
    }

    return { track, flush }
  })
}
