import { createPlugin, make, type PluginInstance } from '@mono/utils-core'

import { on } from '@/shortcut'

export interface StorageApi {
  has(key: string): boolean
  get<T>(key: string, def?: T | null): T | null
  set<T>(key: string, val: T, ttl?: number): void
  remove(key: string): void
  clear(): void
  clearUseless(): void
  watch<T>(key: string, callback: (val: T | null) => void): () => void
}

export type StorageType = 'local' | 'session'
const PKG_MARK = '_pkg'
interface Pkg<T> {
  m: typeof PKG_MARK
  v: T
  t?: number
}
type PluginName = 'storage'

export interface StorageOptions {
  namespace?: string
}

function _createStorage(type: StorageType, options: StorageOptions = {}) {
  return createPlugin<PluginName, StorageApi>('storage', () => {
    const store = typeof window !== 'undefined' ? window[`${type}Storage`] : ({} as globalThis.Storage)
    const prefix = options.namespace ? `${options.namespace}:` : ''

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
        t: ttl ? Date.now() + ttl : undefined
      }
    }

    function unPkg<T>(key: string, raw: string | null): T | null {
      if (raw === null) return null

      try {
        const pkg: unknown = JSON.parse(raw)
        if (!isPkg<T>(pkg)) return raw as T

        if (pkg.t && Date.now() > pkg.t) {
          remove(key)
          return null
        }
        return pkg.v
      } catch {
        return raw as T
      }
    }

    /**
     * @param key
     * @param def 默认值：当 key 不存在或已过期时返回
     */
    function get<T>(key: string, def: T | null = null): T | null {
      const realKey = getRealKey(key)
      const raw = store.getItem(realKey)
      if (raw === null) return def

      return unPkg(key, raw) ?? def
    }

    function has(key: string): boolean {
      return get(key) !== null
    }

    /**
     * @param key
     * @param val
     * @param ttl 有效期持续时间，单位 ms
     * @returns 存入成功与否
     */
    function set<T>(key: string, val: T, ttl?: number) {
      if (val === undefined) return remove(key)

      const realKey = getRealKey(key)
      const pkg = toPkg(val, ttl)
      const json = JSON.stringify(pkg)
      try {
        return store.setItem(realKey, json)
      } catch (error) {
        // 溢出时重试一次
        if (isQuotaExceeded(error)) {
          clearUseless()
          return store.setItem(realKey, json)
        }
        throw error
      }
    }

    function remove(key: string) {
      store.removeItem(getRealKey(key))
    }

    function clearUseless() {
      Reflect.ownKeys(store).forEach(realKey => {
        if (typeof realKey === 'string' && realKey.startsWith(prefix)) {
          // 还原为不带 prefix 的业务 key，因为 unPkg 内部会再次 getRealKey
          const key = realKey.slice(prefix.length)
          // 逐一解包，unPkg 副作用会自动清除无效数据
          unPkg(key, store.getItem(realKey))
        }
      })
    }

    function clear() {
      if (!prefix) return store.clear()

      Reflect.ownKeys(store).forEach(realKey => {
        if (typeof realKey === 'string' && realKey.startsWith(prefix)) store.removeItem(realKey)
      })
    }

    function isQuotaExceeded(err: unknown): boolean {
      return (
        err instanceof DOMException && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      )
    }

    // 同页面不触发：在当前标签页执行 storage.set 时，当前标签页的 on 监听器不会触发，只有其他标签页会收到通知
    function watch<T>(key: string, callback: (newValue: T | null, oldValue: T | null) => void): () => void {
      const controller = new AbortController()
      on(
        window,
        'storage',
        e => {
          if (e.key !== getRealKey(key)) return

          callback(unPkg(key, e.newValue), unPkg(key, e.oldValue))
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
type StorageInst = PluginInstance<PluginName, StorageApi, Record<string, never>>
const uniqueInstMap = new Map<string, StorageInst>()
const DEFAULT_INST_KEY = '_default'

function createStorage(type: StorageType, namespace?: string): StorageInst {
  const instKey = `${type}:${namespace ?? DEFAULT_INST_KEY}`

  if (uniqueInstMap.has(instKey)) return uniqueInstMap.get(instKey) as StorageInst

  const inst = make(_createStorage(type, { namespace }))
  uniqueInstMap.set(instKey, inst)
  return inst
}

export const createLocal = (namespace?: string): StorageInst => createStorage('local', namespace)
export const createSession = (namespace?: string): StorageInst => createStorage('session', namespace)

export const local = createLocal()
export const session = createSession()
