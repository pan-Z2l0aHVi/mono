import { describe, expect, it, vi } from 'vite-plus/test'

import { defineBatchEmitter } from '..'

describe('BatchEmitter 测试', () => {
  it('delay <= 0 时跳过等待，立即以单元素批次 resolve', async () => {
    const batchEmitter = defineBatchEmitter<string>().make()
    const { batchEmit } = batchEmitter
    expect(await batchEmit('a', 0)).toEqual(['a'])
  })

  it('窗口内的多次 emit 合并成一个批次，每个调用方拿到同一份批次', async () => {
    // 每个 emit 的返回值就是调用方拿到的「本次上报内容」，批次切分错误会直接丢事件
    const batchEmitter = defineBatchEmitter<string>().make()
    const { batchEmit } = batchEmitter
    const results = await Promise.all([batchEmit('a', 10), batchEmit('b', 10), batchEmit('c', 10)])

    for (const result of results) {
      expect(result).toEqual(['a', 'b', 'c'])
    }
  })

  it('flush 提前结算当前批次并交给 onFlushed，队列随即清空', async () => {
    const onFlushed = vi.fn<(queue: unknown[]) => Promise<void>>()
    const { batchEmit, flush } = defineBatchEmitter<number>({ onFlushed }).make()

    const p1 = batchEmit(1, 100)
    const p2 = batchEmit(2, 100)
    flush()

    expect(await p1).toEqual([1, 2])
    expect(await p2).toEqual([1, 2])
    expect(onFlushed).toHaveBeenCalledWith([1, 2])

    // flush 后的新 emit 自成一个批次，不会混进已结算的那一批
    expect(await batchEmit(3, 0)).toEqual([3])
    expect(onFlushed).toHaveBeenLastCalledWith([3])
    expect(onFlushed).toHaveBeenCalledTimes(2)
  })

  it('队列为空时 flush 是无操作，不调用 onFlushed', () => {
    const onFlushed = vi.fn<(queue: unknown[]) => Promise<void>>()
    const { flush } = defineBatchEmitter({ onFlushed }).make()

    expect(() => flush()).not.toThrow()
    expect(onFlushed).not.toHaveBeenCalled()
  })

  it('onFlushed 抛错不连累调用方，batchEmit 仍正常 resolve', async () => {
    // 上报通道失败不应让业务侧的 batchEmit 变成 rejected promise
    const batchEmitter = defineBatchEmitter<number>({
      onFlushed: () => {
        throw new Error('flush failed')
      }
    }).make()

    expect(await batchEmitter.batchEmit(1, 0)).toEqual([1])
  })

  it('未提供 onFlushed 时 flush 与 emit 都不报错', async () => {
    const { batchEmit, flush } = defineBatchEmitter<string>().make()

    expect(await batchEmit('a', 0)).toEqual(['a'])
    void batchEmit('b', 100)
    expect(() => flush()).not.toThrow()
  })
})
