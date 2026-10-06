import { describe, expect, it, vi } from 'vite-plus/test'

import { safeCall } from '..'

describe('safeCall 测试', () => {
  it('返回值恒为 undefined，调用方拿不到被包装函数的返回值', () => {
    // safeCall 的全部语义就是「fire-and-forget」：返回值恒丢，调用方不得依赖它
    expect(safeCall(() => 42)).toBeUndefined()
    expect(safeCall(() => Promise.resolve(42))).toBeUndefined()
  })

  it('同步抛错被吞掉，不向上冒泡', () => {
    expect(() =>
      safeCall(() => {
        throw new Error('sync boom')
      })
    ).not.toThrow()
  })

  it('同步异常交给 options.onError，并保留原始错误对象', async () => {
    const onError = vi.fn<(error: unknown) => void>()
    const boom = new Error('sync boom')

    safeCall(
      () => {
        throw boom
      },
      { onError }
    )

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(boom))
  })

  it('异步 rejection 交给 options.onError，不产生 unhandled rejection', async () => {
    const onError = vi.fn<(error: unknown) => void>()
    const boom = new Error('async boom')
    const unhandled = vi.fn<(reason: unknown) => void>()
    const onUnhandled = (reason: unknown) => unhandled(reason)
    process.on('unhandledRejection', onUnhandled)

    safeCall(() => Promise.reject(boom), { onError })

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(boom))
    process.off('unhandledRejection', onUnhandled)

    // 安全函数的核心承诺：调用方忘了处理也不会污染进程级错误通道
    expect(unhandled).not.toHaveBeenCalled()
  })

  it('未提供 onError 时，异步 rejection 同样不产生 unhandled rejection', async () => {
    const unhandled = vi.fn<(reason: unknown) => void>()
    const onUnhandled = (reason: unknown) => unhandled(reason)
    process.on('unhandledRejection', onUnhandled)

    safeCall(async () => {
      throw new Error('async boom')
    })

    // 给 promise 链一个宏任务机会去 catch rejection
    await new Promise(resolve => setTimeout(resolve, 0))
    process.off('unhandledRejection', onUnhandled)

    expect(unhandled).not.toHaveBeenCalled()
  })

  it('onError 自身抛错时不产生 unhandled rejection', async () => {
    const unhandled = vi.fn<(reason: unknown) => void>()
    const onUnhandled = (reason: unknown) => unhandled(reason)
    process.on('unhandledRejection', onUnhandled)

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
    process.off('unhandledRejection', onUnhandled)

    // 观察者抛错不得把「已消化的错误」重新变成进程级 unhandled rejection
    expect(unhandled).not.toHaveBeenCalled()
  })
})
