import { safeCall } from '@/shortcut'

import { definePlugin } from '../core'

type Resolve<S> = (queue: S[]) => void

interface Options<S> {
  onFlushed?: (queue: S[]) => void | Promise<void>
}

export function defineBatchEmitter<S>(options?: Options<S>) {
  return definePlugin(() => {
    const config = { onFlushed: () => {}, ...options }
    let queue: S[] = []
    let resolves: Resolve<S>[] = []
    let timerId: ReturnType<typeof setTimeout> | null = null

    /**
     * 批量发出，延迟执行
     */
    function batchEmit(data: S, batchingDelay = 0): Promise<S[]> {
      if (batchingDelay <= 0) {
        safeCall(config.onFlushed, [data])
        return Promise.resolve([data])
      }

      return new Promise(resolve => {
        resolves.push(resolve)

        if (queue.push(data) === 1) {
          timerId = setTimeout(flush, batchingDelay)
        }
      })
    }

    /**
     * 立即清空并执行当前的队列
     * 先 resolve promises（同步），再调 onFlushed（不阻塞通知）
     */
    function flush() {
      if (!queue.length) return

      // 先快照一份，防止后续 push 污染当前批次
      const currentQueue = [...queue]
      const currentResolves = [...resolves]
      queue = []
      resolves = []
      if (timerId) {
        clearTimeout(timerId)
        timerId = null
      }

      // 先同步 resolve 所有等待中的 batchEmit 调用方
      let fn: Resolve<S> | undefined
      while ((fn = currentResolves.shift())) {
        fn(currentQueue)
      }

      // onFlushed 放在后面，不阻塞 resolve
      safeCall(config.onFlushed, currentQueue)
    }

    return { batchEmit, flush }
  })
}
