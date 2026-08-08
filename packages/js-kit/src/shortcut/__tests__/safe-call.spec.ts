import { describe, expect, it, vi } from 'vite-plus/test'

import { safeCall } from '..'

describe('safeCall 测试', () => {
  it('同步抛错时不应向上抛出', () => {
    expect(() =>
      safeCall(() => {
        throw new Error('sync boom')
      })
    ).not.toThrow()
  })

  it('异步 rejection 不应产生 unhandled rejection', async () => {
    const unhandled = vi.fn<(reason: unknown) => void>()
    const handler = (reason: unknown) => unhandled(reason)
    process.on('unhandledRejection', handler)

    safeCall(async () => {
      throw new Error('async boom')
    })

    // 给 promise 链一个宏任务机会去 catch rejection
    await new Promise(resolve => setTimeout(resolve, 0))
    process.off('unhandledRejection', handler)

    expect(unhandled).not.toHaveBeenCalled()
  })

  it('返回值恒为 undefined（fire-and-forget）', () => {
    const result = safeCall(() => 42)
    expect(result).toBeUndefined()
  })

  it('正常函数会执行并透传参数', () => {
    const fn = vi.fn<(a: number, b: string) => void>()
    safeCall(fn, 1, 'x')
    expect(fn).toHaveBeenCalledWith(1, 'x')
  })
})
