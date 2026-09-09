import { defineAckQueue, definePlugin } from '@greypan/js-kit'

import { defineLocal } from '@/storage'

import { beaconTransport } from './transport'

interface Options {
  url: string
  /**
   * 载荷变换。注意它会在一次上报生命周期里被应用多次：批量分片估算体积
   * （computeDataSize）与实际传输（onConsume）各一次，因此必须可重复
   * 应用（幂等）且不依赖调用时序。
   */
  transform?: (data: object) => object
  /**
   * 单条传输函数，接收 transform 后的载荷；默认使用 beaconTransport
   * （sendBeacon → fetch keepalive no-cors）。队列在其 Promise fulfilled
   * 后才移除条目，rejection 会保留条目等待 resume/flush 重试。
   */
  transport?: (item: object) => Promise<void> | void
  disablePersistence?: boolean
  /** 同一页面存在多个独立 Tracker 时使用的稳定持久化键。 */
  persistenceKey?: string
}

interface Config {
  url: string
  transform: (data: object) => object
  transport: (item: object) => Promise<void> | void
  disablePersistence: boolean
  persistenceKey: string
}

const DEFAULT_OPTIONS = {
  transform: (data: object): object => data,
  disablePersistence: false
}

const INVALID_RESTORED_QUEUE_MESSAGE = 'Tracker 持久化数据不是有效的数组，已丢弃该快照。'
const INVALID_RESTORED_ITEM_MESSAGE = 'Tracker 持久化数据包含无效条目，已丢弃这些条目。'
const PERSISTENCE_FALLBACK_MESSAGE =
  'Tracker 持久化失败，已降级为内存模式；当前 localStorage 快照可能残留，并在下次初始化时导致重复发送。'

function isTrackData(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}

/**
 * Tracker core。它只负责单条传输和待传输 outbox；批量、离线和退出时 flush 由上层插件组合。
 */
export function defineTracker(options: Options) {
  return definePlugin(() => {
    const config: Config = {
      ...DEFAULT_OPTIONS,
      ...options,
      persistenceKey: options.persistenceKey ?? options.url,
      // transport 闭包惰性读取 config.url；首次消费发生在 make() 之后，config 已初始化。
      transport: options.transport ?? (data => beaconTransport(config.url, data))
    }

    const storage = defineLocal('tracker')
    const storageKey = `queue:${config.persistenceKey}`
    let persistenceEnabled = !config.disablePersistence
    let hasReportedPersistenceFallback = false

    function warnTracker(message: string, error?: unknown) {
      try {
        if (error === undefined) console.warn(message, `[track: ${storageKey}]`)
        else console.warn(error, message, `[track: ${storageKey}]`)
      } catch {
        // console 被宿主替换时也不能让 track() 失败。
      }
    }

    function warnPersistenceFallback(error: unknown) {
      if (hasReportedPersistenceFallback) return
      hasReportedPersistenceFallback = true
      warnTracker(PERSISTENCE_FALLBACK_MESSAGE, error)
    }

    function disablePersistence(error: unknown) {
      persistenceEnabled = false
      warnPersistenceFallback(error)
    }

    /**
     * Tracker 的浏览器存储适配器采用 best-effort 降级，而不是让一次 storage 故障
     * 阻塞当前实例的传输。失败后不再访问 storage；因此旧快照可能残留，后续实例
     * 可能再次恢复同一条目，这是可接受的 at-least-once 风险。
     */
    function persistSnapshot(items: readonly object[]): void {
      if (!persistenceEnabled) return

      try {
        const persisted = items.length > 0 ? storage.set(storageKey, items) : storage.remove(storageKey)
        if (!persisted) {
          throw new Error(`Tracker outbox 持久化失败: ${storageKey}`)
        }
      } catch (error) {
        // 通用 queue 仍保持 fail-closed；Tracker 在浏览器适配层明确降级为 memory-only。
        disablePersistence(error)
      }
    }

    function discardInvalidSnapshot() {
      try {
        if (!storage.remove(storageKey)) {
          disablePersistence(new Error(`无法清理无效的 Tracker outbox: ${storageKey}`))
        }
      } catch (error) {
        disablePersistence(error)
      }
    }

    function restoreQueue(): object[] {
      if (!persistenceEnabled) return []

      let stored: unknown
      try {
        stored = storage.get<unknown>(storageKey)
      } catch (error) {
        disablePersistence(error)
        return []
      }

      if (stored === null) return []
      if (!Array.isArray(stored)) {
        warnTracker(INVALID_RESTORED_QUEUE_MESSAGE)
        discardInvalidSnapshot()
        return []
      }

      const validItems = stored.filter(isTrackData)
      if (validItems.length !== stored.length) {
        warnTracker(INVALID_RESTORED_ITEM_MESSAGE)
        persistSnapshot(validItems)
      }
      return validItems
    }

    const queue = defineAckQueue<object>({
      initialItems: restoreQueue(),
      // transform 先于 transport 应用，使自定义 transport 也拿到转换后的载荷。
      onConsume: data => config.transport(config.transform(data)),
      // 这里故意使用 AckQueue：transport fulfilled 后才移除内存条目；这只是
      // 浏览器传输 Promise 的本地确认，不是服务端确认。storage 故障由上面的适配器
      // best-effort 吸收，允许当前 Tracker 继续发送，但可能留下旧快照。
      onPersist: config.disablePersistence ? undefined : persistSnapshot,
      onConsumeError: error => console.warn(error, '[track 上报失败]')
    }).make()

    function cloneTrackData(data: object): object {
      // 入队时固定数据快照，避免调用方在 transport 或持久化前修改同一个对象。
      const clone = (globalThis as typeof globalThis & { structuredClone?: <T>(value: T) => T }).structuredClone
      if (clone) {
        try {
          return clone(data)
        } catch {
          // 对不可 structured-clone 的值继续尝试 JSON 快照；最终浅拷贝只是最后兜底。
        }
      }

      try {
        return JSON.parse(JSON.stringify(data)) as object
      } catch {
        return Array.isArray(data) ? [...data] : { ...data }
      }
    }

    function track(data: object) {
      if (!data) return
      queue.enqueue(cloneTrackData(data))
    }

    // 返回序列化后的字节数，而非 UTF-16 字符数——sendBeacon/keepalive 的
    // 大小上限按字节计，字符数在中文/emoji 载荷下会低估实际体积。
    function computeDataSize(data: object) {
      return new Blob([JSON.stringify(config.transform(data))]).size
    }

    return {
      computeDataSize,
      track,
      flush: () => queue.flush(),
      pause: () => queue.pause(),
      resume: () => queue.resume()
    }
  })
}
