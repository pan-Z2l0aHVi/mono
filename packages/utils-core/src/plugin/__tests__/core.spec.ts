import { beforeEach, describe, expect, it, vi } from 'vitest'

import { definePlugin, type PluginMade } from '../core'

describe('definePlugin 单元测试', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString()
      },
      clear: () => {
        store = {}
      }
    }
  })()
  vi.stubGlobal('localStorage', localStorageMock)

  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('make', () => {
    it('应当实例化插件，并且能够调用插件的属性方法', () => {
      function defineTracker() {
        return definePlugin(() => ({
          track: (event: string) => console.log(`tracking ${event}`)
        }))
      }
      const tracker = defineTracker().make()
      expect(tracker).toHaveProperty('track')
      expect(typeof tracker.track).toBe('function')

      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      tracker.track('test event')
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('use', () => {
    const defineStore = (initial: Record<string, number>) =>
      definePlugin(() => {
        let store: Record<string, number> = initial
        return {
          setStore(newStore: Record<string, number>) {
            store = newStore
          },
          get(key: string) {
            return store[key]
          },
          set(key: string, val: number) {
            store[key] = val
          }
        }
      })

    const defineLogger = () =>
      definePlugin((ctx: PluginMade<typeof defineStore>) => ({
        set: (key: string, val: number) => {
          ctx.set(key, val)
          console.log(`set ${key} = ${val}.`)
        }
      }))

    const definePersist = (persitKey = 'persit-store') =>
      definePlugin((ctx: PluginMade<typeof defineStore>) => {
        const cache = localStorage.getItem(persitKey)
        if (cache) ctx.setStore(JSON.parse(cache))
        return {
          setStore(newStore: Record<string, number>) {
            ctx.setStore(newStore)
            localStorage.setItem(persitKey, JSON.stringify(newStore))
          },
          set(key: string, val: number) {
            ctx.set(key, val)
            const cache: Record<string, number> = JSON.parse(localStorage.getItem(persitKey) ?? '{}')
            cache[key] = val
            localStorage.setItem(persitKey, JSON.stringify(cache))
          }
        }
      })

    it('应当正确组合 Store, Logger 和 Persist 逻辑', () => {
      const logSpy = vi.spyOn(console, 'log')

      const store = defineStore({ a: 1, b: 2 }).use(defineLogger()).use(definePersist()).make()

      expect(store.get('a')).toBe(1)

      // 调用顺序: Persist.set -> Logger.set -> Store.set
      store.set('a', 100)

      expect(store.get('a')).toBe(100)
      expect(logSpy).toHaveBeenCalledWith('set a = 100.')

      const cached = JSON.parse(localStorage.getItem('persit-store') || '{}')
      expect(cached.a).toBe(100)
    })

    it('应当在初始化时从持久化恢复数据', () => {
      localStorage.setItem('persit-store', JSON.stringify({ a: 999 }))

      const store = defineStore({ a: 1 }).use(definePersist()).make()

      expect(store.get('a')).toBe(999)
    })
  })
})
