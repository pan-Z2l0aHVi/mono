// 扩展 core track(data) 为 track(data, batchDelay?)，支持聚合上报
// batchDelay <= 0 时跳过批处理，直接逐条上报
import { defineBatchEmitter, definePlugin } from '@greypan/js-kit'

import type { FlushCapability, TrackCapability } from '../capabilities'

interface Options {
  defaultBatchDelay?: number
  /** 单次传输目标上限（KB）。上限的绝对值取决于 transport：默认 beaconTransport 受
   * sendBeacon / fetch keepalive 的 64KB 约束；更换 transport 时按其承载能力调整。 */
  maxBatchKB?: number
}
type Config = Required<Options>

const DEFAULT_OPTIONS = {
  defaultBatchDelay: 500, // ms
  maxBatchKB: 64 // kb
}

export function defineBatchTrack(options?: Options) {
  return definePlugin((ctx: TrackCapability & FlushCapability) => {
    const config = { ...DEFAULT_OPTIONS, ...options } as Config

    // 超出 sendBeacon 64KB 限制时二分递归分片
    // 始终传数组给 ctx.track，保证后端接收到的数据格式统一（始终为数组）
    function sliceTrack(dataList: object[]) {
      if (dataList.length === 0) return
      // 后端批量接口统一接收数组格式，单项也需要包装
      // 单条数据无法再分片（分片要求至少两条），即使超出 maxBatchKB 也照发：
      // sendBeacon 可能拒收（>64KB），fetch 降级同样受 keepalive 64KB 限制，投递属 best-effort。
      if (dataList.length === 1) return ctx.track(dataList)

      const totalSize = dataList.reduce((pre, cur) => pre + ctx.computeDataSize(cur), 0)
      const actualMaxBatchBytes = config.maxBatchKB * 1024
      if (totalSize > actualMaxBatchBytes) {
        const mid = Math.floor(dataList.length / 2)
        sliceTrack(dataList.slice(0, mid))
        sliceTrack(dataList.slice(mid))
        return
      }
      ctx.track(dataList)
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
      return ctx.flush()
    }

    return { track, flush }
  })
}
