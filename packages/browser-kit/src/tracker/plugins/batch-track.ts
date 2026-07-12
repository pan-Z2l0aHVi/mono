// 扩展 core track(data) 为 track(data, batchDelay?)，支持聚合上报
// batchDelay <= 0 时跳过批处理，直接逐条上报
import { defineBatchEmitter, definePlugin, type PluginMade } from '@greypan/js-kit'

import type { defineTracker } from '../core'

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

    // 超出 sendBeacon 64KB 限制时二分递归分片
    // 始终传数组给 ctx.track，保证后端接收到的数据格式统一（始终为数组）
    function sliceTrack(dataList: object[]) {
      if (dataList.length === 0) return
      // 后端批量接口统一接收数组格式，单项也需要包装
      if (dataList.length === 1) return ctx.track(dataList as object)

      const totalSize = dataList.reduce((pre, cur) => pre + ctx.computeDataSize(cur), 0)
      const actualMaxBeaconSize = config.maxBeaconSize * 1024
      if (totalSize > actualMaxBeaconSize) {
        const mid = Math.floor(dataList.length / 2)
        sliceTrack(dataList.slice(0, mid))
        sliceTrack(dataList.slice(mid))
        return
      }
      ctx.track(dataList as object)
    }

    const batchEmitter = defineBatchEmitter<object>({ onFlushed: sliceTrack }).make()

    // batchDelay <= 0 时立即上报，否则聚合后统一上报
    function track(data: object, batchDelay = config.defaultBatchDelay) {
      if (batchDelay <= 0) {
        return ctx.track(data)
      }
      void batchEmitter.batchEmit(data, batchDelay)
    }

    function flush() {
      batchEmitter.flush()
      ctx.flush()
    }

    return { track, flush }
  })
}
