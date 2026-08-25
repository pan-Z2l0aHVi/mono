import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineQueue, type QueueController } from '../plugins/queue'

const settleMicrotasks = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve()
}

describe('defineQueue', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('enqueue 会调用消费者，并在调用后立即视为完成', async () => {
    const onConsume = vi.fn<(item: { id: number }) => void>()
    const queue = defineQueue({ onConsume }).make()

    queue.enqueue({ id: 1 })

    expect(onConsume).toHaveBeenCalledWith({ id: 1 })
    await queue.flush()
    expect(onConsume).toHaveBeenCalledTimes(1)
  })

  it('initialItems 会在一个 microtask 后开始消费', async () => {
    const items = [{ id: 1 }, { id: 2 }]
    const onConsume = vi.fn<(item: { id: number }) => void>()

    defineQueue({ initialItems: items, onConsume }).make()

    expect(onConsume).not.toHaveBeenCalled()
    await settleMicrotasks()
    expect(onConsume).toHaveBeenNthCalledWith(1, items[0])
    expect(onConsume).toHaveBeenNthCalledWith(2, items[1])
  })

  it('初始化 microtask 前 enqueue 不会绕过初始消费调度', async () => {
    const consumed: number[] = []
    const queue = defineQueue<number>({
      initialItems: [1, 2],
      onConsume: item => {
        consumed.push(item)
      }
    }).make()

    queue.enqueue(3)

    expect(consumed).toEqual([])
    await settleMicrotasks()
    expect(consumed).toEqual([1, 2, 3])
  })

  it('pause 会暂停新消费，resume 会恢复', async () => {
    const consumed: number[] = []
    const queue = defineQueue<number>({
      onConsume: item => {
        consumed.push(item)
      }
    }).make()

    queue.pause()
    queue.enqueue(1)
    queue.enqueue(2)
    expect(consumed).toEqual([])

    queue.resume()
    await settleMicrotasks()
    expect(consumed).toEqual([1, 2])
  })

  it('flush 忽略 pause，但不会解除 pause', async () => {
    const consumed: number[] = []
    const queue = defineQueue<number>({
      onConsume: item => {
        consumed.push(item)
      }
    }).make()

    queue.pause()
    queue.enqueue(1)
    queue.enqueue(2)

    await queue.flush()
    expect(consumed).toEqual([1, 2])

    queue.enqueue(3)
    await settleMicrotasks()
    expect(consumed).toEqual([1, 2])

    queue.resume()
    await settleMicrotasks()
    expect(consumed).toEqual([1, 2, 3])
  })

  it('flush 不等待消费者返回的 Promise', async () => {
    let release!: () => void
    const pending = new Promise<void>(resolve => {
      release = resolve
    })
    const queue = defineQueue({
      onConsume: () => pending
    }).make()

    queue.pause()
    queue.enqueue('item')

    let flushed = false
    const flushPromise = queue.flush().then(() => {
      flushed = true
    })

    await flushPromise
    expect(flushed).toBe(true)
    release()
  })

  it('同步异常与异步 rejection 只通知错误观察器，不阻塞后续条目', async () => {
    const errors: Array<{ error: unknown; item: number }> = []
    const consumed: number[] = []
    const queue = defineQueue({
      initialItems: [1, 2, 3],
      onConsume: item => {
        if (item === 1) throw new Error('sync failure')
        if (item === 2) return Promise.reject(new Error('async failure'))
        consumed.push(item)
      },
      onConsumeError: (error, item) => errors.push({ error, item })
    }).make()

    await settleMicrotasks()
    expect(consumed).toEqual([3])
    expect(errors.map(({ item }) => item)).toEqual([1, 2])
    expect(queue).toBeDefined()
  })

  it('onConsumeError 自身抛错不会阻塞队列', async () => {
    const consumed: number[] = []
    const queue = defineQueue({
      initialItems: [1, 2],
      onConsume: item => {
        if (item === 1) throw new Error('consume failure')
        consumed.push(item)
      },
      onConsumeError: () => {
        throw new Error('observer failure')
      }
    }).make()

    await settleMicrotasks()
    expect(consumed).toEqual([2])
    await queue.flush()
  })

  it('onPersist 在成员关系改变前收到新的快照', async () => {
    const snapshots: Array<readonly number[]> = []
    const queue = defineQueue<number>({
      onPersist: items => snapshots.push(items),
      onConsume: () => {}
    }).make()

    queue.pause()
    queue.enqueue(1)
    queue.enqueue(2)
    await queue.flush()

    expect(snapshots).toEqual([[1], [1, 2], [2], []])
    expect(snapshots[0]).not.toBe(snapshots[1])
  })

  it('消费同步失败时即使删除持久化失败也会通知 onConsumeError', async () => {
    const consumeError = new Error('consume failed')
    const persistError = new Error('persist failed')
    const errors: unknown[] = []
    const queue = defineQueue({
      initialItems: ['item'],
      onConsume: () => {
        throw consumeError
      },
      onConsumeError: error => errors.push(error),
      onPersist: items => {
        if (items.length === 0) throw persistError
      }
    }).make()

    queue.pause()

    await expect(queue.flush()).rejects.toBe(persistError)
    expect(errors).toEqual([consumeError])
  })

  it('持久化失败时 enqueue 同步抛错且不接受条目', () => {
    const error = new Error('persist failed')
    const onPersist = vi.fn<() => void>(() => {
      throw error
    })
    const onConsume = vi.fn<() => void>()
    const queue = defineQueue({ onPersist, onConsume }).make()

    expect(() => queue.enqueue('item')).toThrow(error)
    expect(onConsume).not.toHaveBeenCalled()
  })

  it('拒绝异步 onPersist，避免破坏 persist-before-commit', async () => {
    const queue = defineQueue({
      onPersist: async () => {},
      onConsume: vi.fn<() => void>()
    }).make()

    expect(() => queue.enqueue('item')).toThrow(TypeError)
    await expect(queue.flush()).rejects.toThrow(TypeError)
  })

  it('检测 onPersist 重入，避免外部回调与成员提交交错', async () => {
    const holder: { instance?: QueueController<number> } = {}
    const onPersist = () => {
      holder.instance?.enqueue(2)
    }

    const instance = defineQueue<number>({ onPersist, onConsume: () => {} }).make()
    holder.instance = instance

    expect(() => instance.enqueue(1)).toThrow('onPersist 必须是不可重入的同步提交函数')
    await expect(instance.flush()).rejects.toThrow('onPersist 必须是不可重入的同步提交函数')
  })

  it('onConsume 同步调用自身 flush 时会被明确拒绝且不会死锁', async () => {
    const errors: unknown[] = []
    const holder: { instance?: QueueController<number> } = {}
    const instance = defineQueue<number>({
      initialItems: [1],
      onConsume: () => holder.instance!.flush(),
      onConsumeError: error => errors.push(error)
    }).make()
    holder.instance = instance

    await settleMicrotasks()

    expect(errors).toHaveLength(1)
    expect(errors[0]).toEqual(
      expect.objectContaining({
        message: 'onConsume 不能在同步执行期间调用同一队列的 flush()；请在消费者外部触发 flush()。'
      })
    )

    await expect(instance.flush()).resolves.toBeUndefined()
    expect(errors).toHaveLength(1)
  })

  it('onPersist 内调用 flush 会同步失败', () => {
    const holder: { instance?: QueueController<number> } = {}
    const onPersist = () => {
      void holder.instance?.flush()
    }

    const instance = defineQueue<number>({ onPersist, onConsume: () => {} }).make()
    holder.instance = instance

    expect(() => instance.enqueue(1)).toThrow('onPersist 必须是不可重入的同步提交函数')
  })
})
