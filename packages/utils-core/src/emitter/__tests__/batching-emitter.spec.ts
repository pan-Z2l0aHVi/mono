import { describe, expect, it, vi } from 'vitest'

import { BatchingEmitter } from '..'

describe('BatchingEmitter 单元测试', () => {
  it('立即返回单个 id，当 delay <= 0', async () => {
    const emitter = new BatchingEmitter()
    const result = await emitter.batchingEmit('a', 0)
    expect(result).toEqual(['a'])
  })

  it('延迟后批量返回多个 id', async () => {
    const emitter = new BatchingEmitter()
    const p1 = emitter.batchingEmit('a', 10)
    const p2 = emitter.batchingEmit('b', 10)
    const p3 = emitter.batchingEmit('c', 10)

    const results = await Promise.all([p1, p2, p3])
    // 三个 promise 都应该 resolve 同一个批次
    results.forEach(r => expect(r).toEqual(['a', 'b', 'c']))
  })

  it('flush 可以同步清空队列并调用 callback', async () => {
    const emitter = new BatchingEmitter()
    const callback = vi.fn()

    const p1 = emitter.batchingEmit(1, 100)
    const p2 = emitter.batchingEmit(2, 100)

    emitter.flush(callback)

    const results = await Promise.all([p1, p2])
    expect(results[0]).toEqual([1, 2])
    expect(results[1]).toEqual([1, 2])
    expect(callback).toHaveBeenCalledWith([1, 2])
  })

  it('flush 在队列为空时不做任何事', () => {
    const emitter = new BatchingEmitter()
    const callback = vi.fn()
    emitter.flush(callback)
    expect(callback).not.toHaveBeenCalled()
  })
})
