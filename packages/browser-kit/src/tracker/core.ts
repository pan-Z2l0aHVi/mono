import { defineAckQueue, definePlugin } from '@greypan/js-kit'

import { defineLocal } from '@/storage'

interface Options {
  url: string
  transform?: (data: object) => object
  disablePersistence?: boolean
  /** 同一页面存在多个独立 Tracker 时使用的稳定持久化键。 */
  persistenceKey?: string
}

interface Config {
  url: string
  transform: (data: object) => object
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
      persistenceKey: options.persistenceKey ?? options.url
    }

    // 单条传输：sendBeacon 优先，浏览器拒绝排队时降级到 fetch。
    async function transport(data: object) {
      const body = JSON.stringify(config.transform(data))
      try {
        // 保持字符串载荷以使用 CORS-safelisted 的 text/plain，避免跨域采集端触发预检。
        const accepted = navigator.sendBeacon(config.url, body)
        if (!accepted) throw new Error('sendBeacon 未接受数据.')
      } catch (error) {
        console.warn(error, '[track 降级使用 fetch]')
        // no-cors 模式下浏览器只放行 CORS-safelisted 的 Content-Type，application/json
        // 会被剥掉（实际按 text/plain 发送），因此不声明该 header，避免误导后端。
        await fetch(config.url, {
          method: 'POST',
          keepalive: true,
          mode: 'no-cors',
          body
        })
      }
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
      onConsume: transport,
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
