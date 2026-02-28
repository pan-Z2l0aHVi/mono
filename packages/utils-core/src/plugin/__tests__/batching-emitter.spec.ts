import { describe, expect, it, vi } from 'vitest'

import { createBatchingEmitter } from '..'
import { make } from '../make'

describe('BatchingEmitter 单元测试', () => {
  it('立即返回单个 id，当 delay <= 0', async () => {
    const batchingEmitter = make(createBatchingEmitter())
    const { batchingEmit } = batchingEmitter
    const result = await batchingEmit('a', 0)
    expect(result).toEqual(['a'])
  })

  it('延迟后批量返回多个 id', async () => {
    const batchingEmitter = make(createBatchingEmitter())
    const { batchingEmit } = batchingEmitter
    const p1 = batchingEmit('a', 10)
    const p2 = batchingEmit('b', 10)
    const p3 = batchingEmit('c', 10)

    const results = await Promise.all([p1, p2, p3])
    // 三个 promise 都应该 resolve 同一个批次
    results.forEach(r => expect(r).toEqual(['a', 'b', 'c']))
  })

  it('flush 可以同步清空队列并调用 callback', async () => {
    const batchingEmitter = make(createBatchingEmitter())
    const { batchingEmit, flush } = batchingEmitter

    const p1 = batchingEmit(1, 100)
    const p2 = batchingEmit(2, 100)

    const callback = vi.fn()
    flush(callback)

    const results = await Promise.all([p1, p2])
    expect(results[0]).toEqual([1, 2])
    expect(results[1]).toEqual([1, 2])
    expect(callback).toHaveBeenCalledWith([1, 2])
  })

  it('flush 在队列为空时不做任何事', () => {
    const batchingEmitter = make(createBatchingEmitter())
    const { flush } = batchingEmitter
    const callback = vi.fn()
    flush(callback)
    expect(callback).not.toHaveBeenCalled()
  })
})
