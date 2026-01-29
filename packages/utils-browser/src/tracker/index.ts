/**
 * @file tracker
 * @description 数据埋点上报工具
 * 特性：
 * 1.批量数据聚合：在 batchingDelay ms 内合并多次上报
 * 2.临终遗言：关闭标签页或切换到后台时立即同步回调执行上报
 * 3.断网重发：重连后从 IndexedDB 中恢复数据重发
 * 4.数据分片：由于 sendBeacon 限制约 64 KB，超出阈值时分多次传输。二分递归分片。
 * 5.降级策略：sendBeacon 失败时降级到 fetch keepalive
 * @example
 * const tracker = new Tracker({ url: 'your report api url' })
 * tracker.track({ event: 'click' })
 * 应用初始化入口处执行
 * const offLeave = tracker.onSendBeforeLeave()
 * const offRestore = tracker.onSendAfterNetworkRestore()
 * 应用卸载处执行
 * offLeave()
 * offRestore()
 */
import { BatchingEmitter } from '@mono/utils-core'
import { del, get, update } from 'idb-keyval'
import { nanoid } from 'nanoid'

import { on } from '@/shortcut'

type QueueId = string
interface Params {
  [key: string]: unknown
}
interface TrackerOptions {
  url: string
  batchingDelay: number
  chunkSize: number // KB
  restoreMaxSize: number
  // 数据最终发送前的格式化函数
  formatter: (paramsList: Params[]) => unknown
  paramsProvider: (id: QueueId) => Params
}

const DEFAULT_OPTIONS = {
  batchingDelay: 200,
  chunkSize: 64,
  restoreMaxSize: 1000,
  formatter: (x: Params[]) => x,
  paramsProvider: (id: QueueId) => ({
    id,
    timestamp: Date.now(),
    screen: `${window.screen.width}x${window.screen.height}`
  })
}
const RESTORE_QUEUE_KEY = 'tracker-restore'

export class Tracker<S extends Params> extends BatchingEmitter<QueueId> {
  private options: TrackerOptions
  private paramsCache: Map<QueueId, S> = new Map()
  private isWatchingLeave = false
  private isWatchingNetwork = false

  constructor(opts: Partial<TrackerOptions>) {
    super()
    this.options = {
      ...DEFAULT_OPTIONS,
      ...opts
    } as TrackerOptions
  }

  /**
   * 上报埋点数据
   * @param params 业务埋点参数
   * @param isBatching 是否聚合上报，默认 true
   */
  async track(params: S, isBatching = true): Promise<void> {
    const trackID = nanoid()
    const baseParams = this.options.paramsProvider(trackID)
    const mergedParams = {
      ...baseParams,
      ...params
    }
    if (isBatching) {
      this.paramsCache.set(trackID, mergedParams)
      const queue = await this.batchingEmit(trackID, this.options.batchingDelay)
      return this.consumeBatchingQueue(queue)
    }
    await this.persist([mergedParams])
    return this.request([mergedParams])
  }

  private async consumeBatchingQueue(queue: QueueId[]): Promise<void> {
    if (!queue.length) return

    const paramsList = queue.map(id => this.paramsCache.get(id)).filter(v => !!v)
    queue.forEach(id => this.paramsCache.delete(id))
    await this.persist(paramsList)
    return this.request(paramsList)
  }

  // 优先使用 sendBeacon，其次是 fetch
  // sendBeacon 限制 约 64 KB，超过时分多次传输
  private async request(paramsList: S[]): Promise<void> {
    if (!paramsList.length) return

    const { url, chunkSize } = this.options
    const data = JSON.stringify(this.options.formatter(paramsList))

    const MAX_BEACON_SIZE = chunkSize * 1024
    if (data.length > MAX_BEACON_SIZE && paramsList.length > 1) {
      // 递归分片：简单粗暴地将列表一分为二发送
      const mid = Math.floor(paramsList.length / 2)
      await Promise.all<void>([this.request(paramsList.slice(0, mid)), this.request(paramsList.slice(mid))])
      return
    }
    try {
      const isSuccess = navigator.sendBeacon(url, data)
      if (isSuccess) return
    } catch (error) {
      console.error('SendBeacon error, falling back fetch: ', error)
    }
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      mode: 'no-cors',
      body: data
    })
  }

  private persist(paramsList: S[]) {
    const { restoreMaxSize } = this.options
    return update(RESTORE_QUEUE_KEY, (p: S[] = []) => [...p, ...paramsList].slice(-restoreMaxSize))
  }

  // 直接关闭标签页｜切换到后台
  onSendBeforeLeave(): (() => void) | void {
    if (this.isWatchingLeave) return
    this.isWatchingLeave = true

    const controller = new AbortController()
    const leaveHandler = () => {
      // 不是 this.flush(this.consumeBatchingQueue) 因为修复 this 指向
      this.flush(q => this.consumeBatchingQueue(q))
    }
    on(
      window,
      'beforeunload',
      () => {
        leaveHandler()
      },
      { signal: controller.signal }
    )
    on(
      window,
      'pagehide',
      () => {
        leaveHandler()
      },
      { signal: controller.signal }
    )
    on(
      document,
      'visibilitychange',
      () => {
        if (document.visibilityState === 'hidden') leaveHandler()
      },
      { signal: controller.signal }
    )
    return () => {
      controller.abort()
      this.isWatchingLeave = false
    }
  }

  onSendAfterNetworkRestore(): (() => void) | void {
    if (this.isWatchingNetwork) return
    this.isWatchingNetwork = true

    const controller = new AbortController()
    on(
      window,
      'online',
      async () => {
        const paramsList = await get<S[]>(RESTORE_QUEUE_KEY)
        if (paramsList?.length) {
          try {
            await this.request(paramsList)
            await del(RESTORE_QUEUE_KEY)
          } catch {
            // 重试一次
            await this.request(paramsList)
          }
        }
      },
      { signal: controller.signal }
    )
    return () => {
      controller.abort()
      this.isWatchingNetwork = false
    }
  }
}
