import { describe, expect, it, vi } from 'vitest'

import { defineBatchEmitter } from '..'

describe('BatchEmitter 单元测试', () => {
  it('立即返回单个 id，当 delay <= 0', async () => {
    const batchEmitter = defineBatchEmitter().make()
    const { batchEmit } = batchEmitter
    const result = await batchEmit('a', 0)
    expect(result).toEqual(['a'])
  })

  it('延迟后批量返回多个 id', async () => {
    const batchEmitter = defineBatchEmitter().make()
    const { batchEmit } = batchEmitter
    const p1 = batchEmit('a', 10)
    const p2 = batchEmit('b', 10)
    const p3 = batchEmit('c', 10)

    const results = await Promise.all([p1, p2, p3])
    // 三个 promise 都应该 resolve 同一个批次
    results.forEach(r => expect(r).toEqual(['a', 'b', 'c']))
  })

  it('flush 可以同步清空队列并调用 onFlushed', async () => {
    const onFlushed = vi.fn()
    const batchEmitter = defineBatchEmitter(onFlushed).make()
    const { batchEmit, flush } = batchEmitter

    const p1 = batchEmit(1, 100)
    const p2 = batchEmit(2, 100)

    flush()

    const results = await Promise.all([p1, p2])
    expect(results[0]).toEqual([1, 2])
    expect(results[1]).toEqual([1, 2])
    expect(onFlushed).toHaveBeenCalledWith([1, 2])
  })

  it('flush 在队列为空时不做任何事', () => {
    const onFlushed = vi.fn()
    const batchEmitter = defineBatchEmitter(onFlushed).make()
    const { flush } = batchEmitter
    flush()
    expect(onFlushed).not.toHaveBeenCalled()
  })
})
