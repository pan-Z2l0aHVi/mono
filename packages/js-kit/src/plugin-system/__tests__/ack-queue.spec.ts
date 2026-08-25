import { describe, expect, it, vi } from 'vite-plus/test'

import { defineAckQueue } from '../plugins/ack-queue'

const settleMicrotasks = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve()
}

describe('defineAckQueue', () => {
  it('普通 drain 会串行等待 fulfilled，并继续处理后续条目', async () => {
    const calls: number[] = []
    let releaseFirst!: () => void
    const first = new Promise<void>(resolve => {
      releaseFirst = resolve
    })

    const queue = defineAckQueue<number>({
      onConsume: item => {
        calls.push(item)
        if (item === 1) return first
      }
    }).make()

    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)

    await settleMicrotasks()
    expect(calls).toEqual([1])

    releaseFirst()
    await settleMicrotasks()
    expect(calls).toEqual([1, 2, 3])
  })

  it('同步失败后立即 flush 会重新尝试该项', async () => {
    const calls: number[] = []
    let shouldFail = true
    const queue = defineAckQueue<number>({
      onConsume: item => {
        calls.push(item)
        if (shouldFail) {
          shouldFail = false
          throw new Error('temporary failure')
        }
      }
    }).make()

    queue.enqueue(1)
    await queue.flush()

    expect(calls).toEqual([1, 1])
  })

  it('单项失败会保留该项，但不会阻塞后续条目', async () => {
    const calls: number[] = []
    const errors: number[] = []
    const queue = defineAckQueue<number>({
      initialItems: [1, 2, 3],
      onConsume: item => {
        calls.push(item)
        if (item === 1) return Promise.reject(new Error('failed'))
      },
      onConsumeError: (_error, item) => errors.push(item)
    }).make()

    await settleMicrotasks()
    expect(calls).toEqual([1, 2, 3])
    expect(errors).toEqual([1])

    queue.pause()
    await queue.flush()
    expect(calls).toEqual([1, 2, 3, 1])
  })

  it('resume 会恢复 failed 条目，并保持它在剩余队列中的原位置', async () => {
    const calls: number[] = []
    let shouldFail = true
    const queue = defineAckQueue<number>({
      initialItems: [1, 2, 3],
      onConsume: item => {
        calls.push(item)
        if (item === 1 && shouldFail) {
          shouldFail = false
          return Promise.reject(new Error('retry me'))
        }
      }
    }).make()

    await settleMicrotasks()
    expect(calls).toEqual([1, 2, 3])

    queue.resume()
    await settleMicrotasks()
    expect(calls).toEqual([1, 2, 3, 1])
  })

  it('flush 并发启动调用时的 pending/failed 项，并等待 dispatch settle', async () => {
    const calls: number[] = []
    let releaseFirst!: () => void
    let releaseSecond!: () => void
    const first = new Promise<void>(resolve => {
      releaseFirst = resolve
    })
    const second = new Promise<void>(resolve => {
      releaseSecond = resolve
    })

    const queue = defineAckQueue<number>({
      onConsume: item => {
        calls.push(item)
        return item === 1 ? first : second
      }
    }).make()

    queue.pause()
    queue.enqueue(1)
    queue.enqueue(2)

    const flushPromise = queue.flush()
    await settleMicrotasks()
    expect(calls).toEqual([1, 2])

    let settled = false
    void flushPromise.then(() => {
      settled = true
    })
    await settleMicrotasks()
    expect(settled).toBe(false)

    releaseFirst()
    await settleMicrotasks()
    expect(settled).toBe(false)

    releaseSecond()
    await flushPromise
    expect(settled).toBe(true)
  })

  it('flush 不重复启动 in-flight 项，并以调用时快照为边界', async () => {
    const calls: number[] = []
    let release!: () => void
    const pending = new Promise<void>(resolve => {
      release = resolve
    })
    const queue = defineAckQueue<number>({
      onConsume: item => {
        calls.push(item)
        return item === 1 ? pending : undefined
      }
    }).make()

    queue.enqueue(1)
    await settleMicrotasks()

    const flushPromise = queue.flush()
    queue.enqueue(2)
    await settleMicrotasks()
    expect(calls).toEqual([1])

    release()
    await flushPromise
    await settleMicrotasks()
    expect(calls).toEqual([1, 2])
  })

  it('flush 遇到一个持久化错误时 reject 原始错误，条目保持不丢失', async () => {
    const error = new Error('persist failed')
    // 使用 initialItems，避免 enqueue 的同步持久化错误干扰 flush 的错误契约。
    const restored = defineAckQueue<string>({
      initialItems: ['item'],
      onConsume: () => {},
      onPersist: () => {
        throw error
      }
    }).make()
    restored.pause()

    await expect(restored.flush()).rejects.toBe(error)
    expect(() => restored.resume()).toThrow(error)
  })

  it('已经处于 persistence-blocked 时，flush 会继续 reject 最近的持久化错误', async () => {
    const error = new Error('persist blocked')
    const queue = defineAckQueue<string>({
      initialItems: ['item'],
      onConsume: () => {},
      onPersist: () => {
        throw error
      }
    }).make()
    queue.pause()

    await expect(queue.flush()).rejects.toBe(error)
    await expect(queue.flush()).rejects.toBe(error)
  })

  it('多个持久化错误会聚合为 AggregateError', async () => {
    const errorA = new Error('persist A')
    const errorB = new Error('persist B')
    let persistCount = 0
    const queue = defineAckQueue<string>({
      initialItems: ['a', 'b'],
      onConsume: () => undefined,
      onPersist: () => {
        persistCount += 1
        throw persistCount === 1 ? errorA : errorB
      }
    }).make()
    queue.pause()

    const result = queue.flush()
    await expect(result).rejects.toMatchObject({ errors: [errorA, errorB] })
  })

  it('resume 在 persistence-blocked 时先 probe 当前快照，成功后恢复消费', async () => {
    let shouldFail = true
    const persisted: Array<readonly number[]> = []
    const calls: number[] = []
    const queue = defineAckQueue<number>({
      initialItems: [1],
      onConsume: item => {
        calls.push(item)
      },
      onPersist: items => {
        persisted.push(items)
        if (shouldFail) throw new Error('temporary')
      }
    }).make()
    queue.pause()

    await expect(queue.flush()).rejects.toThrow('temporary')
    shouldFail = false
    queue.resume()
    await settleMicrotasks()

    expect(persisted).toEqual([[], [1], []])
    expect(calls).toEqual([1, 1])
  })

  it('onConsumeError 自身抛错不会改变确认状态', async () => {
    const onConsumeError = vi.fn<() => void>(() => {
      throw new Error('observer failed')
    })
    const queue = defineAckQueue<number>({
      initialItems: [1],
      onConsume: () => Promise.reject(new Error('consume failed')),
      onConsumeError
    }).make()

    await settleMicrotasks()
    await queue.flush()
    expect(onConsumeError).toHaveBeenCalledTimes(2)
  })
})
