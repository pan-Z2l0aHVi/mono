import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createLocal } from '..'

describe('storage 单元测试', () => {
  const NS = 'mfe'
  const local = createLocal(NS)

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('基础存取', () => {
    it('应当能存取各种类型的数据 (Object, Array, Number, String)', () => {
      const cases = [
        { key: 'obj', val: { a: 1 } },
        { key: 'arr', val: [1, 2] },
        { key: 'num', val: 123 },
        { key: 'str', val: 'hello' }
      ]

      cases.forEach(({ key, val }) => {
        local.set(key, val)
        expect(local.get(key)).toEqual(val)
      })
    })

    it('当设置 val 为 undefined 时应移除该 key', () => {
      local.set('test', 'data')
      local.set('test', undefined)
      expect(local.has('test')).toBe(false)
    })

    it('key 不存在时应返回默认值', () => {
      const def = { a: 1 }
      expect(local.get('non-existent', def)).toEqual(def)
    })
  })

  describe('命名空间与单例', () => {
    it('相同命名空间应指向同一个实例 (单例验证)', () => {
      const local1 = createLocal('app')
      const local2 = createLocal('app')
      expect(local1).toBe(local2)
    })

    it('不同命名空间的数据不应互干扰', () => {
      const storageA = createLocal('A')
      const storageB = createLocal('B')

      storageA.set('key', 'valA')
      storageB.set('key', 'valB')

      expect(storageA.get('key')).toBe('valA')
      expect(storageB.get('key')).toBe('valB')
      expect(localStorage.getItem('A:key')).toContain('valA')
    })

    it('clear() 应当只清除当前命名空间下的数据', () => {
      local.set('data', 1)
      localStorage.setItem('other_data', 'keep')

      local.clear()

      expect(local.has('data')).toBe(false)
      expect(localStorage.getItem('other_data')).toBe('keep')
    })
  })

  describe('有效期 (TTL)', () => {
    it('数据未过期前应正常读取', () => {
      local.set('temp', 'data', 1000)
      vi.advanceTimersByTime(500)
      expect(local.get('temp')).toBe('data')
    })

    it('数据过期后读取应返回默认值并清理', () => {
      local.set('temp', 'data', 1000)
      vi.advanceTimersByTime(1001)

      expect(local.get('temp')).toBe(null)
      expect(localStorage.getItem(`${NS}:temp`)).toBeNull()
    })
  })

  describe('异常处理', () => {
    it('应兼容非 JSON 格式或非本库封装的数据', () => {
      const key = 'raw_data'
      localStorage.setItem(`${NS}:${key}`, 'legacy_string')

      expect(local.get(key)).toBe('legacy_string')
    })

    it('当存储满额时应当触发 clearUseless 并重试', () => {
      // 通过原型链 spy 模拟原生存储溢出
      const setItemSpy = vi.spyOn(Object.getPrototypeOf(window.localStorage), 'setItem')

      // 模拟第一次失败，抛出溢出错误
      setItemSpy.mockImplementationOnce(() => {
        const err = new DOMException('QuotaExceededError', 'QuotaExceededError')
        Object.defineProperty(err, 'code', { value: 22 })
        throw err
      })

      // 模拟第二次成功
      setItemSpy.mockImplementationOnce(() => {})

      local.set('retry_test', 'some_value')

      expect(setItemSpy).toHaveBeenCalledTimes(2)

      setItemSpy.mockRestore()
    })
  })

  describe('Watch 监听', () => {
    it('监听到对应的 key 变化时应触发回调', () => {
      const callback = vi.fn()
      const unwatch = local.watch('msg', callback)

      // 为了模拟格式，需要手动拼装 pkg
      // 由于 pkg 方法是私有的，测试中我们手动模拟其结构
      const createPkg = (val: unknown) => ({ m: '_pkg', v: val })

      const event = new StorageEvent('storage', {
        key: `${NS}:msg`,
        newValue: JSON.stringify(createPkg('new')),
        oldValue: JSON.stringify(createPkg('old'))
      })
      window.dispatchEvent(event)

      expect(callback).toHaveBeenCalledWith('new', 'old')

      unwatch()
      window.dispatchEvent(event)
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })
})
