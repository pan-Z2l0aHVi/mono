import { describe, expect, it, vi } from 'vitest'

import { type Context, createPlugin, type Plugin } from '../create'
import { make } from '../make'

describe('create & make plugin 单元测试', () => {
  describe('createPlugin', () => {
    type PersitAdded = {
      set(val: unknown): void
    }
    const persit = createPlugin('persit', () => {
      const key = 'persit-key'
      return {
        set(val: unknown) {
          localStorage.setItem(key, JSON.stringify(val))
        }
      }
    })

    type PinaAdded = {
      store: {
        a: number
        b: number
      }
      setA(v: number): void
    }
    const pina = createPlugin<'pina', PinaAdded, { persit: PersitAdded }>('pina', ctx => ({
      store: { a: 1, b: 2 },
      setA(v: number) {
        console.log(ctx, ctx)
        ctx.pina.store.a = v
        ctx.persit.set(v)
      }
    })).use(persit)

    const logger = createPlugin('logger', () => ({
      log: (m: string) => console.log(m)
    }))
    interface App<N extends string, T extends object, E extends Context> {
      use<M extends string, U extends object, V extends Context>(plugin: Plugin<M, U, V>): App<N, T, E & Record<M, U>>
      mount(): T & { ctx: E & Record<N, T> }
    }
    // 类似 Vue3 的封装方式。createApp 实例提供 mount 方法以实现插件实例化
    function createApp<T extends object>(rootSetup: () => T): App<'app', T, Record<string, never>> {
      let appPlugin = createPlugin<'app', T, Record<string, never>>('app', rootSetup)

      const app = {
        use<M extends string, U extends object, V extends Context>(plugin: Plugin<M, U, V>) {
          appPlugin = appPlugin.use(plugin)
          return app
        },
        mount() {
          return make(appPlugin)
        }
      }

      return app
    }

    /*
     * 相当于：
     * const appPlugin = createPlugin('app', () => ({
     *   version: '1.0.1'
     * }))
     *   .use(pina)
     *   .use(logger)
     * const app = make(appPlugin)
     */
    const app = createApp(() => ({
      version: '1.0.1'
    }))
      .use(pina)
      .use(logger)
      .mount()

    it('调用 mount() 后，应当能够获取根插件定义的属性', () => {
      expect(app.version).toBe('1.0.1')
    })

    it('调用 mount() 后，应当能够获取依赖插件定义的属性', () => {
      expect(typeof app.ctx.logger.log).toBe('function')
      expect(app.ctx.pina.store).toEqual({ a: 1, b: 2 })
    })

    it('应当能够访问命名空间', () => {
      expect(app.ctx.pina.store).toEqual({ a: 1, b: 2 })
      app.ctx.pina.setA(42)
      expect(app.ctx.pina.store.a).toBe(42)
    })

    it('应当执行 console.log', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      app.ctx.logger.log('hello')
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('make', () => {
    it('应当实例化插件，并且能够调用插件的属性方法', () => {
      function createTracker() {
        return createPlugin('tracker', () => ({
          track: (event: string) => console.log(`tracking ${event}`)
        }))
      }
      const tracker = make(createTracker())
      expect(tracker).toHaveProperty('track')
      expect(typeof tracker.track).toBe('function')

      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      tracker.track('test event')
      expect(spy).toHaveBeenCalled()
    })
  })
})
