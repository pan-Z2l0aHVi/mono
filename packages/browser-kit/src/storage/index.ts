import { definePlugin, type PluginMade } from '@greypan/js-kit'

import { on } from '@/shortcut'

export type StorageType = 'local' | 'session'
const PKG_MARK = '_pkg'
interface Pkg<T> {
  m: typeof PKG_MARK
  v: T
  t?: number
}

interface StorageOptions {
  namespace?: string
}
type StorageConfig = Required<StorageOptions>

const STORAGE_DEFAULT_OPTIONS = {
  namespace: ''
}

function defineStorage(type: StorageType, options: StorageOptions = {}) {
  return definePlugin(() => {
    const config = { ...STORAGE_DEFAULT_OPTIONS, ...options } as StorageConfig
    const store = typeof window !== 'undefined' ? window[`${type}Storage`] : ({} as globalThis.Storage)
    const prefix = config.namespace ? `${config.namespace}:` : ''

    // blocked storage（隐私模式、沙箱 iframe 无 allow-same-origin）下访问
    // localStorage 会抛 SecurityError。统一降级：读取返回 null、写入静默跳过，
    // 避免调用方（含 tracker 持久化）在存储被禁时崩溃。
    function safeGetItem(key: string): string | null {
      try {
        return store.getItem(key)
      } catch {
        return null
      }
    }

    function safeSetItem(key: string, value: string): void {
      try {
        store.setItem(key, value)
      } catch {
        // 静默跳过：配额溢出或存储被禁
      }
    }

    function safeRemoveItem(key: string): void {
      try {
        store.removeItem(key)
      } catch {
        // 静默跳过
      }
    }

    function getRealKey(key: string): string {
      return `${prefix}${key}`
    }

    function isPkg<T>(arg: unknown): arg is Pkg<T> {
      return arg !== null && typeof arg === 'object' && 'm' in arg && arg.m === PKG_MARK && 'v' in arg
    }

    function toPkg<T>(val: T, ttl?: number): Pkg<T> {
      return {
        m: PKG_MARK,
        v: val,
        t: ttl !== undefined ? Date.now() + ttl : undefined
      }
    }

    function unPkg<T>(raw: string | null): T | null {
      if (raw === null) return null

      try {
        const pkg: unknown = JSON.parse(raw)
        if (!isPkg<T>(pkg)) return raw as T
        return pkg.v
      } catch {
        return raw as T
      }
    }

    function isExpired(raw: string): boolean {
      try {
        const pkg: unknown = JSON.parse(raw)
        return isPkg(pkg) && !!pkg.t && Date.now() >= pkg.t
      } catch {
        return false
      }
    }

    /**
     * @param key 存储键名
     * @param def 默认值：当 key 不存在或已过期时返回
     */
    function get<T>(key: string, def: T | null = null): T | null {
      const realKey = getRealKey(key)
      const raw = safeGetItem(realKey)
      if (raw === null) return def

      let pkg: unknown
      try {
        pkg = JSON.parse(raw)
      } catch {
        return raw as T
      }

      if (isPkg<T>(pkg)) {
        if (pkg.t && Date.now() >= pkg.t) {
          remove(key)
          return def
        }
        return pkg.v
      }

      return raw as T
    }

    function has(key: string): boolean {
      return get(key) !== null
    }

    /**
     * @param key
     * @param val
     * @param ttl 有效期持续时间，单位 ms
     */
    function set<T>(key: string, val: T, ttl?: number) {
      if (val === undefined) return remove(key)

      const realKey = getRealKey(key)
      const pkg = toPkg(val, ttl)
      const json = JSON.stringify(pkg)
      try {
        store.setItem(realKey, json)
      } catch (error) {
        // 溢出时重试一次；存储被禁等 SecurityError 静默跳过（持久化降级）
        if (isQuotaExceeded(error)) {
          clearUseless()
          safeSetItem(realKey, json)
        }
      }
    }

    function remove(key: string) {
      safeRemoveItem(getRealKey(key))
    }

    function clearUseless() {
      Reflect.ownKeys(store).forEach(realKey => {
        if (typeof realKey === 'string' && realKey.startsWith(prefix)) {
          const raw = safeGetItem(realKey)
          if (raw && isExpired(raw)) safeRemoveItem(realKey)
        }
      })
    }

    function clear() {
      if (!prefix) {
        try {
          return store.clear()
        } catch {
          return
        }
      }

      Reflect.ownKeys(store).forEach(realKey => {
        if (typeof realKey === 'string' && realKey.startsWith(prefix)) safeRemoveItem(realKey)
      })
    }

    function isQuotaExceeded(err: unknown) {
      return (
        err instanceof DOMException && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      )
    }

    // 当前标签页的 storage 事件不会触发，需要其他方式通知（如 BroadcastChannel）
    function watch<T>(key: string, callback: (newValue: T | null, oldValue: T | null) => void): () => void {
      const controller = new AbortController()
      on(
        window,
        'storage',
        e => {
          if (e.key !== getRealKey(key)) return

          callback(
            e.newValue && isExpired(e.newValue) ? null : unPkg(e.newValue),
            e.oldValue && isExpired(e.oldValue) ? null : unPkg(e.oldValue)
          )
        },
        {
          signal: controller.signal
        }
      )
      return function unwatch() {
        controller.abort()
      }
    }

    return { has, get, set, remove, clear, clearUseless, watch }
  })
}

// 单例缓存，确保 namespace 相同时使用同一个实例
type StorageInst = PluginMade<typeof defineStorage>
const uniqueInstMap = new Map<string, StorageInst>()
const DEFAULT_INST_KEY = '_default'

function createStorage(type: StorageType, namespace?: string): StorageInst {
  const instKey = `${type}:${namespace ?? DEFAULT_INST_KEY}`

  if (uniqueInstMap.has(instKey)) return uniqueInstMap.get(instKey) as StorageInst

  const inst = defineStorage(type, { namespace }).make()
  uniqueInstMap.set(instKey, inst)
  return inst
}

export const defineLocal = (namespace?: string): StorageInst => createStorage('local', namespace)
export const defineSession = (namespace?: string): StorageInst => createStorage('session', namespace)

export const local = defineLocal()
export const session = defineSession()
