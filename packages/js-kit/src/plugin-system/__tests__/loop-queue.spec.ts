import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineLoopQueue } from '../plugins/loop-queue'

describe('loop-queue', () => {
  let onConsume: (target: object, queue: object[]) => void

  beforeEach(() => {
    onConsume = vi.fn<(target: object, queue: object[]) => void>()
  })

  it('enqueue 应触发 onConsume，传入目标 item 和空队列', () => {
    const queue = defineLoopQueue({ onConsume }).make()

    queue.enqueue({ event: 'click' })

    expect(onConsume).toHaveBeenCalledWith({ event: 'click' }, [])
  })

  it('多条 enqueue 应按顺序逐条触发 onConsume', () => {
    const targets: object[] = []
    const onConsume = vi.fn<(target: object, queue: object[]) => void>(target => {
      targets.push(target)
    })

    const queue = defineLoopQueue({ onConsume }).make()

    queue.enqueue({ event: 'first' })
    queue.enqueue({ event: 'second' })
    queue.enqueue({ event: 'third' })

    expect(targets).toEqual([{ event: 'first' }, { event: 'second' }, { event: 'third' }])
  })

  it('pause 应暂停处理，resume 恢复', async () => {
    const targets: object[] = []
    const onConsume = vi.fn<(target: object, queue: object[]) => void>(target => {
      targets.push(target)
    })

    const queue = defineLoopQueue({ onConsume }).make()

    queue.pause()
    queue.enqueue({ event: 'paused-item' })

    // pause 期间不应处理
    expect(targets).toEqual([])

    queue.resume()
    await new Promise(process.nextTick)

    // resume 后应处理
    expect(targets).toEqual([{ event: 'paused-item' }])
  })

  it('initialQueue 应在创建时自动处理初始数据', () => {
    const targets: object[] = []
    const onConsume = vi.fn<(target: object, queue: object[]) => void>(target => {
      targets.push(target)
    })

    defineLoopQueue({
      initialQueue: [{ event: 'a' }, { event: 'b' }],
      onConsume
    }).make()

    expect(targets).toEqual([{ event: 'a' }, { event: 'b' }])
  })

  it('onConsume 的 queue 参数应反映剩余未处理的 items', () => {
    const snapshots: object[][] = []
    const onConsume = vi.fn<(target: object, queue: object[]) => void>((target, queue) => {
      snapshots.push([...queue])
    })

    defineLoopQueue({
      initialQueue: [{ event: 'a' }, { event: 'b' }, { event: 'c' }],
      onConsume
    }).make()

    // 第一次 onConsume 后剩余 [b, c]，第二次剩余 [c]，第三次剩余 []
    expect(snapshots).toEqual([[{ event: 'b' }, { event: 'c' }], [{ event: 'c' }], []])
  })

  it('pause 后 enqueue 应暂停处理，resume 后继续', async () => {
    const targets: object[] = []
    const onConsume = vi.fn<(target: object, queue: object[]) => void>(target => {
      targets.push(target)
    })

    const queue = defineLoopQueue({
      initialQueue: [{ event: 'a' }, { event: 'b' }],
      onConsume
    }).make()

    expect(targets).toEqual([{ event: 'a' }, { event: 'b' }])

    queue.pause()
    queue.enqueue({ event: 'c' })
    expect(targets).toEqual([{ event: 'a' }, { event: 'b' }])

    queue.resume()
    await new Promise(process.nextTick)
    expect(targets).toEqual([{ event: 'a' }, { event: 'b' }, { event: 'c' }])
  })

  it('onConsume 应接收 data 对象而非 QueueItem 包装', () => {
    const onConsume = vi.fn()

    defineLoopQueue({
      initialQueue: [{ event: 'click' }],
      onConsume
    }).make()

    expect(onConsume).toHaveBeenCalledWith({ event: 'click' }, [])
    expect(onConsume.mock.calls[0][0]).not.toHaveProperty('id')
  })

  it('onConsume 异常不应阻塞后续 items 处理', () => {
    const targets: object[] = []
    const onConsume = vi.fn<(target: object, queue: object[]) => void>(target => {
      if ((target as { event: string }).event === 'fail') {
        throw new Error('onConsume 失败')
      }
      targets.push(target)
    })

    defineLoopQueue({
      initialQueue: [{ event: 'ok1' }, { event: 'fail' }, { event: 'ok2' }],
      onConsume
    }).make()

    // fail 被丢弃，ok1 和 ok2 正常处理
    expect(targets).toEqual([{ event: 'ok1' }, { event: 'ok2' }])
  })

  it('flush 应同步清空队列并触发 onConsume', () => {
    const targets: object[] = []
    const onConsume = vi.fn<(target: object, queue: object[]) => void>(target => {
      targets.push(target)
    })

    const queue = defineLoopQueue({
      initialQueue: [{ event: 'a' }, { event: 'b' }],
      onConsume
    }).make()

    // initialQueue 已自动处理
    expect(targets).toEqual([{ event: 'a' }, { event: 'b' }])

    // flush 应清空暂停期间积累的 items
    queue.pause()
    queue.enqueue({ event: 'c' })
    queue.enqueue({ event: 'd' })

    queue.flush()
    expect(targets).toEqual([{ event: 'a' }, { event: 'b' }, { event: 'c' }, { event: 'd' }])
  })

  it('onConsume 异步 rejection 不应阻塞后续 items 处理', () => {
    const targets: object[] = []
    const onConsume = vi.fn<(target: object, queue: object[]) => void>(target => {
      if ((target as { event: string }).event === 'fail') {
        return Promise.reject(new Error('async fail')) as unknown as void
      }
      targets.push(target)
    })

    defineLoopQueue({
      initialQueue: [{ event: 'ok1' }, { event: 'fail' }, { event: 'ok2' }],
      onConsume
    }).make()

    expect(targets).toEqual([{ event: 'ok1' }, { event: 'ok2' }])
  })

  it('flush 在暂停状态下应强制清空', () => {
    const targets: object[] = []
    const onConsume = vi.fn<(target: object, queue: object[]) => void>(target => {
      targets.push(target)
    })

    const queue = defineLoopQueue({ onConsume }).make()

    queue.pause()
    queue.enqueue({ event: 'a' })
    queue.enqueue({ event: 'b' })

    queue.flush()
    expect(targets).toEqual([{ event: 'a' }, { event: 'b' }])
  })

  it('未提供 onConsume 时不应报错', () => {
    expect(() => {
      const queue = defineLoopQueue({}).make()
      queue.enqueue({ event: 'click' })
    }).not.toThrow()
  })

  it('initialQueue 为空数组时不应触发 onConsume', () => {
    const onConsume = vi.fn()

    defineLoopQueue({ initialQueue: [], onConsume }).make()

    expect(onConsume).not.toHaveBeenCalled()
  })
})
