import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineLocal, defineSession } from '..'

const NS = 'mfe'

/** 复刻写入信封，用于构造「由外部代码或旧版本写入」的原始数据。 */
const pkg = (val: unknown, ttl?: number) => ({ m: '_pkg', v: val, t: ttl !== undefined ? Date.now() + ttl : undefined })

/** 让首次 setItem 抛配额错误，其后放行，用来看溢出重试是否真的生效。 */
function failFirstSetWithQuota() {
  const spy = vi.spyOn(Object.getPrototypeOf(window.localStorage), 'setItem')
  spy.mockImplementationOnce(() => {
    throw new DOMException('QuotaExceededError', 'QuotaExceededError')
  })
  return spy
}

describe('storage 测试', () => {
  const local = defineLocal(NS)

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('基础存取', () => {
    it('各类值往返后与写入时一致', () => {
      const cases = [
        { key: 'obj', val: { a: 1 } },
        { key: 'arr', val: [1, 2] },
        { key: 'num', val: 123 },
        { key: 'str', val: 'hello' },
        { key: 'false', val: false },
        { key: 'null', val: null }
      ]

      for (const { key, val } of cases) {
        expect(local.set(key, val)).toBe(true)
        expect(local.get(key)).toEqual(val)
      }
    })

    it('写入 undefined 等价于删除该 key', () => {
      local.set('test', 'data')
      local.set('test', undefined)

      expect(local.has('test')).toBe(false)
      expect(localStorage.getItem(`${NS}:test`)).toBeNull()
    })

    it('key 不存在时返回调用方给的默认值', () => {
      expect(local.get('non-existent', { a: 1 })).toEqual({ a: 1 })
      expect(local.get('non-existent')).toBeNull()
    })

    it('set / has / remove 的返回值反映底层是否真的生效', () => {
      // 调用方（tracker 持久化）靠返回值判断要不要降级，只断言「不抛错」挡不住
      // 一个永远返回 true 的空实现
      expect(local.set('k', 'v')).toBe(true)
      expect(local.has('k')).toBe(true)
      expect(local.remove('k')).toBe(true)
      expect(local.has('k')).toBe(false)
    })
  })

  describe('命名空间与单例', () => {
    it('同类型同命名空间返回同一实例，不同命名空间互相隔离', () => {
      expect(defineLocal('app')).toBe(defineLocal('app'))
      expect(defineLocal('A')).not.toBe(defineLocal('B'))

      const storageA = defineLocal('A')
      const storageB = defineLocal('B')
      storageA.set('key', 'valA')
      storageB.set('key', 'valB')

      expect(storageA.get('key')).toBe('valA')
      expect(storageB.get('key')).toBe('valB')
      expect(localStorage.getItem('A:key')).toContain('valA')
    })

    it('defineSession 落到 sessionStorage，与 localStorage 互不可见', () => {
      const session = defineSession('session-ns')

      expect(session).toBe(defineSession('session-ns'))

      session.set('key', { a: 1 })
      expect(sessionStorage.getItem('session-ns:key')).toContain('_pkg')
      expect(session.get('key')).toEqual({ a: 1 })

      // 隔离是会话存储的意义：关掉标签页后 localStorage 里的东西不该留下
      expect(localStorage.getItem('session-ns:key')).toBeNull()
    })

    it('clear() 只清当前命名空间', () => {
      local.set('data', 1)
      localStorage.setItem('other_data', 'keep')
      localStorage.setItem('unrelated', 'keep')

      local.clear()

      expect(local.has('data')).toBe(false)
      expect(localStorage.getItem('other_data')).toBe('keep')
      expect(localStorage.getItem('unrelated')).toBe('keep')
    })

    it('无命名空间的实例 clear() 清空整个存储', () => {
      // 与带命名空间的行为刻意不同：默认实例代表「整站存储」，调用方默认它就是全量的
      const unscoped = defineLocal()
      unscoped.set('data', 1)
      localStorage.setItem('unrelated', '1')

      unscoped.clear()

      expect(localStorage.getItem('unrelated')).toBeNull()
    })
  })

  describe('有效期 (TTL)', () => {
    it('未到期正常读取，到期后返回默认值并清理底层条目', () => {
      local.set('temp', 'data', 1000)

      vi.advanceTimersByTime(999)
      expect(local.get('temp')).toBe('data')

      vi.advanceTimersByTime(1)
      expect(local.get('temp')).toBe(null)
      // 过期条目必须被清掉，否则配额一直涨
      expect(localStorage.getItem(`${NS}:temp`)).toBeNull()
    })

    it('ttl 为 0 表示立即过期', () => {
      local.set('zero_ttl', 'data', 0)
      expect(local.get('zero_ttl')).toBe(null)
    })

    it('过期的 key 不会让 has() 误报为存在', () => {
      local.set('temp', 'data', 1000)
      vi.advanceTimersByTime(1001)

      expect(local.has('temp')).toBe(false)
    })
  })

  describe('与外部数据共存', () => {
    it('非 JSON 字符串按原文返回，不做隐式解析', () => {
      localStorage.setItem(`${NS}:raw`, 'legacy_string')

      // 兼容契约：外部或旧版本直接写入的裸值原样读出（JSON.parse 失败即回退原文）
      expect(local.get('raw')).toBe('legacy_string')
    })

    it('合法 JSON 但缺少本库信封时返回原始字符串，而不是解析后的对象', () => {
      // 这条最容易在重构中被「顺手修好」：一旦改成隐式 JSON.parse，
      // 外部写入的对象会静默变成实例，调用方的相等判断随之失效
      localStorage.setItem(`${NS}:plain_json`, JSON.stringify({ a: 1 }))

      expect(local.get('plain_json')).toBe('{"a":1}')
    })
  })

  describe('异常处理', () => {
    it('配额溢出时清理过期条目后重试写入', () => {
      local.set('expired', 'stale', 1000)
      local.set('keep', 'fresh')
      vi.advanceTimersByTime(1001)

      const setItemSpy = failFirstSetWithQuota()

      expect(local.set('after_overflow', 'value')).toBe(true)

      // 重试路径要真的写进去，否则数据在配额溢出时静默丢失
      expect(setItemSpy).toHaveBeenCalledTimes(2)
      expect(local.get('after_overflow')).toBe('value')
      // 清理只针对过期条目，未过期的必须留下
      expect(localStorage.getItem(`${NS}:keep`)).not.toBeNull()
      expect(localStorage.getItem(`${NS}:expired`)).toBeNull()
    })

    it('配额溢出且重试仍失败时返回 false', () => {
      const spy = vi.spyOn(Object.getPrototypeOf(window.localStorage), 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError')
      })

      expect(local.set('k', 'v')).toBe(false)
      expect(local.has('k')).toBe(false)

      spy.mockRestore()
    })
  })

  describe('blocked storage 降级', () => {
    it('get 在存储被禁时返回默认值而非抛错', () => {
      vi.spyOn(Object.getPrototypeOf(window.localStorage), 'getItem').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      })

      // 隐私模式与无 allow-same-origin 的沙箱 iframe 会走到这里；
      // 抛错会连带打断调用方（tracker 持久化正是这种调用方）
      expect(() => local.get('blocked-key', 'def')).not.toThrow()
      expect(local.get('blocked-key', 'def')).toBe('def')
    })

    it('set / remove 在存储被禁时返回 false 而非抛错', () => {
      vi.spyOn(Object.getPrototypeOf(window.localStorage), 'setItem').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      })
      vi.spyOn(Object.getPrototypeOf(window.localStorage), 'removeItem').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      })

      // 返回 false 是「降级到内存模式」的信号，调用方据此决定要不要告警
      expect(local.set('blocked-key', 'value')).toBe(false)
      expect(local.remove('blocked-key')).toBe(false)
    })

    it('获取 Storage 对象本身被禁时也降级而非抛错', () => {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      })

      // 这条发生在实例创建期：抛错的话连 defineLocal 都用不了
      const blocked = defineLocal('blocked-object')
      expect(() => blocked.get('blocked-key', 'def')).not.toThrow()
      expect(blocked.get('blocked-key', 'def')).toBe('def')
    })

    it('clear 在存储被禁时不抛错', () => {
      vi.spyOn(Object.getPrototypeOf(window.localStorage), 'removeItem').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      })

      expect(() => local.clear()).not.toThrow()
    })
  })

  describe('watch 监听', () => {
    const dispatchStorage = (key: string, newValue: unknown, oldValue?: unknown) => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: `${NS}:${key}`,
          newValue: typeof newValue === 'string' ? newValue : JSON.stringify(newValue),
          oldValue: typeof oldValue === 'string' ? oldValue : oldValue === undefined ? null : JSON.stringify(oldValue)
        })
      )
    }

    it('把 storage 事件解包成本库的值变化传给回调', () => {
      const callback = vi.fn<(newValue: unknown, oldValue: unknown) => void>()
      const unwatch = local.watch('msg', callback)

      dispatchStorage('msg', pkg('new'), pkg('old'))
      expect(callback).toHaveBeenCalledWith('new', 'old')

      // unwatch 必须真的摘掉监听，否则多页同步场景会重复回调
      unwatch()
      dispatchStorage('msg', pkg('again'), pkg('new'))
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('过期的新旧值都归一为 null', () => {
      const callback = vi.fn<(newValue: unknown, oldValue: unknown) => void>()
      local.watch('expired', callback)

      dispatchStorage('expired', pkg('stale', -1000), pkg('older', -1000))

      // 跨页同步时不该把已过期的值推给订阅方，那等于复活一份陈旧数据
      expect(callback).toHaveBeenCalledWith(null, null)
    })

    it('忽略不匹配 key 的事件', () => {
      const callback = vi.fn<(newValue: unknown, oldValue: unknown) => void>()
      local.watch('target', callback)

      dispatchStorage('other', pkg('x'))

      expect(callback).not.toHaveBeenCalled()
    })

    it('删除事件（newValue 为 null）解包成 null 而非字符串 "null"', () => {
      const callback = vi.fn<(newValue: unknown, oldValue: unknown) => void>()
      local.watch('removed', callback)

      window.dispatchEvent(
        new StorageEvent('storage', {
          key: `${NS}:removed`,
          newValue: null,
          oldValue: JSON.stringify(pkg('gone'))
        })
      )

      expect(callback).toHaveBeenCalledWith(null, 'gone')
    })
  })
})
