import { describe, expect, it } from 'vitest'

import { compose, type Middleware } from '../compose'

describe('Compose 单元测试', () => {
  describe('基本用法', () => {
    it('应当按顺序运行中间件', async () => {
      const calls: string[] = []

      const middleware1: Middleware = async (ctx, next) => {
        calls.push('m1-before')
        await next()
        calls.push('m1-after')
      }
      const middleware2: Middleware = async (ctx, next) => {
        calls.push('m2-before')
        await next()
        calls.push('m2-after')
      }
      const middleware3: Middleware = async (ctx, next) => {
        calls.push('m3')
        await next()
      }

      const fn = compose(middleware1, middleware2, middleware3)

      await fn({}, async () => {
        calls.push('end')
      })

      expect(calls).toEqual(['m1-before', 'm2-before', 'm3', 'end', 'm2-after', 'm1-after'])
    })
  })

  describe('compose 边界情况', () => {
    it('空中间件数组时应直接调用外层 next', async () => {
      const calls: string[] = []
      const fn = compose()
      await fn({}, async () => {
        calls.push('end')
      })
      expect(calls).toEqual(['end'])
    })

    it('单个中间件时应正常执行并调用外层 next', async () => {
      const calls: string[] = []
      const fn = compose(async (ctx, next) => {
        calls.push('single')
        await next()
      })
      await fn({}, async () => {
        calls.push('end')
      })
      expect(calls).toEqual(['single', 'end'])
    })

    it('多次调用同一个 compose 函数时索引不应污染', async () => {
      const fn = compose(
        async (ctx: { calls: string[] }, next) => {
          ctx.calls.push('m1')
          await next()
        },
        async (ctx: { calls: string[] }, next) => {
          ctx.calls.push('m2')
          await next()
        }
      )
      const calls1: string[] = []
      const calls2: string[] = []
      await fn({ calls: calls1 }, async () => {
        calls1.push('end')
      })
      await fn({ calls: calls2 }, async () => {
        calls2.push('end')
      })
      expect(calls1).toEqual(['m1', 'm2', 'end'])
      expect(calls2).toEqual(['m1', 'm2', 'end'])
    })

    it('中间件抛出错误时应正确传递异常', async () => {
      const fn = compose(
        async () => {
          throw new Error('boom')
        },
        async (ctx, next) => {
          await next()
        }
      )
      await expect(fn({}, async () => {})).rejects.toThrow('boom')
    })

    it('同一个中间件里重复调用 next 应该抛错', async () => {
      const fn = compose(
        async (ctx, next) => {
          await next()
          await next() // 第二次调用，触发防护
        },
        async (ctx, next) => {
          await next()
        }
      )
      await expect(fn({}, async () => {})).rejects.toThrow('Should not call "await next()" multiple times!')
    })
  })
})
