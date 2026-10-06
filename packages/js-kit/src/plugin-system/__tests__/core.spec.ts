import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { definePlugin, type PluginMade } from '../core'

describe('definePlugin 测试', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString()
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        store = {}
      }
    }
  })()
  vi.stubGlobal('localStorage', localStorageMock)

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('make', () => {
    it('把工厂函数的返回值原样暴露为实例方法', () => {
      const tracker = definePlugin(() => ({ track: (event: string) => `tracked:${event}` })).make()

      // 插件实例就是消费面：所有 wrapper 插件都靠 make() 拿到可调用的成员
      expect(tracker.track('evt')).toBe('tracked:evt')
    })
  })

  describe('key 冲突的优先级（运行时语义，wrapper 插件依赖它）', () => {
    it('后 use 的插件在同名 key 上覆盖前者（last-wins）', () => {
      const base = definePlugin(() => ({
        who: 'base',
        send: (data: string) => `base:${data}`
      }))
      const wrapper = definePlugin(() => ({
        send: (data: string) => `wrapped:${data}`
      }))

      // batch-track 等 wrapper 插件依赖这一行为：自己的 track/flush 覆盖 core 的。
      // 写错会静默变成「核心方法被空插件顶掉」，上报整体失效。
      const composed = base.use(wrapper).make()
      expect(composed.send('x')).toBe('wrapped:x')
      // 未被覆盖的成员仍从 base 取到
      expect(composed.who).toBe('base')

      // 覆盖关系跟随 use 顺序，不是固定某一方优先
      const reversed = wrapper.use(base).make()
      expect(reversed.send('x')).toBe('base:x')
    })

    it('make() 显式 ctx 与插件成员同名时，插件成员覆盖 ctx', () => {
      const plugin = definePlugin(() => ({ a: 2 }))
      expect(plugin.make({ a: 1 }).a).toBe(2)
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

    it('组合后写入穿透到 base，同时经过中间插件', () => {
      const logSpy = vi.spyOn(console, 'log')

      const store = defineStore({ a: 1, b: 2 }).use(defineLogger()).use(definePersist()).make()

      expect(store.get('a')).toBe(1)

      // 调用链 Persist.set → Logger.set → Store.set：最外层插件必须能调用到 base 的能力
      store.set('a', 100)

      expect(store.get('a')).toBe(100)
      expect(logSpy).toHaveBeenCalledWith('set a = 100.')
      expect(JSON.parse(localStorage.getItem('persit-store') || '{}').a).toBe(100)
    })

    it('组合时从持久化恢复数据，覆盖 base 的初始值', () => {
      localStorage.setItem('persit-store', JSON.stringify({ a: 999 }))

      const store = defineStore({ a: 1 }).use(definePersist()).make()

      // 恢复发生在工厂函数执行期：漏掉这一步会让用户每次刷新都丢掉上次的状态
      expect(store.get('a')).toBe(999)
    })
  })
})
