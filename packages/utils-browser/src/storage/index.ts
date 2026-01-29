/**
 * @file storage
 * @description 增强型本地存储工具（localStorage/sessionStorage）
 * 特性：
 * 1.保持类型：支持泛型、直接存取各种类型的数据
 * 2.实效控制：设置有效期（TTL）
 * 3.数据隔离：命名空间单例
 * 4.溢出重试：存入溢出时自动清理过期数据并重试一次
 * 5.跨标签页：跨标签页事件监听
 * @example
 * local.set('data', { a: 1 }, 5000)
 * local.get('data') // 返回 { a: 1 }
 * setTimeout(() => {
 *   local.has('data') // 返回 false
 * }, 5000)
 */

import { on } from '@/shortcut'

export type StorageType = 'local' | 'session'
const PKG_MARK = '_pkg'
interface Pkg<T> {
  m: typeof PKG_MARK
  v: T
  t?: number
}

export interface StorageOptions {
  namespace?: string
}

class Storage {
  private readonly store: globalThis.Storage
  private readonly prefix: string

  constructor(type: StorageType, options: StorageOptions = {}) {
    this.store = typeof window !== 'undefined' ? window[`${type}Storage`] : ({} as globalThis.Storage)
    this.prefix = options.namespace ? `${options.namespace}:` : ''
  }

  private getRealKey(key: string): string {
    return `${this.prefix}${key}`
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * @param key
   * @param def 默认值：当 key 不存在或已过期时返回
   */
  get<T>(key: string, def: T | null = null): T | null {
    const realKey = this.getRealKey(key)
    const raw = this.store.getItem(realKey)
    if (raw === null) return def

    return this.unPkg(key, raw) ?? def
  }

  /**
   * @param key
   * @param val
   * @param ttl 有效期持续时间，单位 ms
   * @returns 存入成功与否
   */
  set<T>(key: string, val: T, ttl?: number) {
    if (val === undefined) return this.remove(key)

    const realKey = this.getRealKey(key)
    const pkg = this.pkg(val, ttl)
    const json = JSON.stringify(pkg)
    try {
      return this.store.setItem(realKey, json)
    } catch (error) {
      // 溢出时重试一次
      if (this.isQuotaExceeded(error)) {
        this.clearUseless()
        return this.store.setItem(realKey, json)
      }
      throw error
    }
  }

  remove(key: string) {
    this.store.removeItem(this.getRealKey(key))
  }

  clear() {
    if (!this.prefix) return this.store.clear()

    Reflect.ownKeys(this.store).forEach(realKey => {
      if (typeof realKey === 'string' && realKey.startsWith(this.prefix)) this.store.removeItem(realKey)
    })
  }

  private isPkg<T>(arg: unknown): arg is Pkg<T> {
    return arg !== null && typeof arg === 'object' && 'm' in arg && arg.m === PKG_MARK && 'v' in arg
  }

  private pkg<T>(val: T, ttl?: number): Pkg<T> {
    return {
      m: PKG_MARK,
      v: val,
      t: ttl ? Date.now() + ttl : undefined
    }
  }

  private unPkg<T>(key: string, raw: string | null): T | null {
    if (raw === null) return null

    try {
      const pkg: unknown = JSON.parse(raw)
      if (!this.isPkg<T>(pkg)) return raw as T

      if (pkg.t && Date.now() > pkg.t) {
        this.remove(key)
        return null
      }
      return pkg.v
    } catch {
      return raw as T
    }
  }

  private isQuotaExceeded(err: unknown): boolean {
    return (
      err instanceof DOMException && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    )
  }

  clearUseless() {
    Reflect.ownKeys(this.store).forEach(realKey => {
      if (typeof realKey === 'string' && realKey.startsWith(this.prefix)) {
        // 还原为不带 prefix 的业务 key，因为 unPkg 内部会再次 getRealKey
        const key = realKey.slice(this.prefix.length)
        // 逐一解包，unPkg 副作用会自动清除无效数据
        this.unPkg(key, this.store.getItem(realKey))
      }
    })
  }

  // 同页面不触发：在当前标签页执行 storage.set 时，当前标签页的 on 监听器不会触发，只有其他标签页会收到通知
  watch<T>(key: string, callback: (newValue: T | null, oldValue: T | null) => void): () => void {
    const controller = new AbortController()
    on(
      window,
      'storage',
      e => {
        if (e.key !== this.getRealKey(key)) return

        callback(this.unPkg(key, e.newValue), this.unPkg(key, e.oldValue))
      },
      {
        signal: controller.signal
      }
    )
    return function unwatch() {
      controller.abort()
    }
  }
}

// 单例缓存，确保 namespace 相同时使用同一个实例
const uniqueInstMap = new Map<string, Storage>()
const DEFAULT_INST_KEY = '_default'

function createStorage(type: StorageType, namespace?: string): Storage {
  const instKey = `${type}:${namespace ?? DEFAULT_INST_KEY}`

  if (uniqueInstMap.has(instKey)) return uniqueInstMap.get(instKey) as Storage

  const inst = new Storage(type, { namespace })
  uniqueInstMap.set(instKey, inst)
  return inst
}

export const createLocal = (namespace?: string): Storage => createStorage('local', namespace)
export const createSession = (namespace?: string): Storage => createStorage('session', namespace)

export const local = createLocal()
export const session = createSession()
