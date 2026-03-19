import { definePlugin } from './core'

type Resolve<S> = (queue: S[]) => void

export function defineBatchEmitter<S>(onFlushed?: (queue: S[]) => Promise<void>) {
  return definePlugin(() => {
    let queue: S[] = []
    let resolves: Resolve<S>[] = []
    let timerId: ReturnType<typeof setTimeout> | null = null

    /**
     * 批量发出，延迟执行
     */
    async function batchEmit(data: S, batchingDelay = 0): Promise<S[]> {
      if (batchingDelay <= 0) {
        if (onFlushed) await onFlushed([data])
        return Promise.resolve([data])
      }

      return new Promise((resolve, reject) => {
        resolves.push(resolve)

        if (queue.push(data) === 1) {
          timerId = setTimeout(() => {
            try {
              flush()
            } catch (error) {
              reject(error)
            }
          }, batchingDelay)
        }
      })
    }

    /**
     * 立即清空并执行当前的队列
     */
    async function flush() {
      if (!queue.length) return

      // 先快照一份，防止后续 push 污染当前批次，消除异步重入（Re-entrancy）
      const currentQueue = [...queue]
      const currentResolves = [...resolves]
      queue = []
      resolves = []
      if (timerId) {
        clearTimeout(timerId)
        timerId = null
      }

      if (onFlushed) await onFlushed(currentQueue)

      let fn: Resolve<S> | undefined
      while ((fn = currentResolves.shift())) {
        fn(currentQueue)
      }
    }

    return { batchEmit, flush }
  })
}
