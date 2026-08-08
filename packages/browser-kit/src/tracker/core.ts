import { definePlugin, defineLoopQueue } from '@greypan/js-kit'

import { defineLocal } from '@/storage'

interface Options {
  url: string
  transform?: (data: object) => object
  disablePersistence?: boolean
}
type Config = Required<Options>

const DEFAULT_OPTIONS = {
  transform: (data: object): object => data,
  disablePersistence: false
}

export function defineTracker(options: Options) {
  return definePlugin(() => {
    const config = { ...DEFAULT_OPTIONS, ...options } as Config

    // 原子发送：sendBeacon 优先，失败降级 fetch
    async function send(data: object) {
      const body = JSON.stringify(config.transform(data))
      try {
        // 保持字符串载荷以使用 CORS-safelisted 的 text/plain，避免跨域采集端触发预检。
        const ok = navigator.sendBeacon(config.url, body)
        if (!ok) throw new Error('sendBeacon 失败.')
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
    const STORAGE_KEY = `queue:${config.url}`
    // 追踪已入队但未确认发送的 items，用于持久化
    // loop-queue 入队即处理，无法通过队列状态获取，需单独维护
    const pendingSet = new Set<object>()

    function restoreQueue(): object[] {
      if (config.disablePersistence) return []
      return storage.get<object[]>(STORAGE_KEY) ?? []
    }

    function persistQueue() {
      if (config.disablePersistence) return
      if (pendingSet.size > 0) {
        storage.set(STORAGE_KEY, [...pendingSet])
      } else {
        storage.remove(STORAGE_KEY)
      }
    }

    const restored = config.disablePersistence ? [] : restoreQueue()
    // 恢复的数据也要纳入 pendingSet，发送确认前不清除 storage；
    // 否则发送失败（sendBeacon 与 fetch 都失败）时数据已从 storage 移除，无法重试。
    restored.forEach(item => pendingSet.add(item))

    const queue = defineLoopQueue({
      initialQueue: restored,
      onConsume: target => {
        const confirm = () => {
          pendingSet.delete(target)
          persistQueue()
        }
        // 发送成功才确认；失败时保留 pendingSet 与 storage，下次启动恢复时重试。
        return send(target).then(confirm, () => {})
      }
    }).make()

    function track(data: object) {
      if (!data) return
      pendingSet.add(data)
      persistQueue()
      queue.enqueue(data)
    }

    // 返回序列化后的字节数，而非 UTF-16 字符数——sendBeacon/keepalive 的
    // 大小上限按字节计，字符数在中文/emoji 载荷下会低估实际体积
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
