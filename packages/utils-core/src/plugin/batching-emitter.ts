import { createPlugin } from './create'

type Resolve<T> = (queue: T[]) => void

export interface BatchingEmitterApi {
  batchingEmit: <S = number | string>(id: S, batchingDelay?: number) => Promise<S[]>
  flush: <S = number | string>(callback?: (queueId: S[]) => void) => void
}

export function createBatchingEmitter<S = number | string>() {
  return createPlugin('batchingEmitter', () => {
    let queue: S[] = []
    let resolves: Resolve<S>[] = []

    function batchingEmit(id: S, batchingDelay = 0): Promise<S[]> {
      if (batchingDelay <= 0) return Promise.resolve([id])

      return new Promise((resolve, reject) => {
        resolves.push(resolve)

        if (queue.push(id) === 1) {
          setTimeout(() => {
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
     * 清空并执行当前的队列
     * @param callback 同步回调，用于在页面销毁等需要“同步执行”的场景下，立即处理数据
     */
    function flush(callback?: (queueId: S[]) => void) {
      if (!queue.length) return

      // 先快照一份，防止后续 push 污染当前批次，消除异步重入（Re-entrancy）
      const currentQueue = [...queue]
      const currentResolves = [...resolves]
      queue = []
      resolves = []

      let fn: Resolve<S> | undefined
      while ((fn = currentResolves.shift())) {
        fn(currentQueue)
      }
      callback?.(currentQueue)
    }

    return { batchingEmit, flush }
  })
}
