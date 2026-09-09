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

  it('同步异常会交给 options.onError', async () => {
    const onError = vi.fn<(error: unknown) => void>()
    const boom = new Error('sync boom')
    safeCall(
      () => {
        throw boom
      },
      { onError }
    )

    // catch 回调在微任务中执行
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(onError).toHaveBeenCalledWith(boom)
  })

  it('异步 rejection 会交给 options.onError', async () => {
    const onError = vi.fn<(error: unknown) => void>()
    const boom = new Error('async boom')
    safeCall(() => Promise.reject(boom), { onError })

    await new Promise(resolve => setTimeout(resolve, 0))
    expect(onError).toHaveBeenCalledWith(boom)
  })

  it('onError 自身抛错不产生 unhandled rejection', async () => {
    const unhandled = vi.fn<(reason: unknown) => void>()
    const handler = (reason: unknown) => unhandled(reason)
    process.on('unhandledRejection', handler)

    safeCall(
      () => {
        throw new Error('boom')
      },
      {
        onError: () => {
          throw new Error('reporter boom')
        }
      }
    )

    await new Promise(resolve => setTimeout(resolve, 0))
    process.off('unhandledRejection', handler)
    expect(unhandled).not.toHaveBeenCalled()
  })
})
