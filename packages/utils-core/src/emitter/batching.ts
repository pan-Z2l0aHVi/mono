type Resolve<T> = (queue: T[]) => void

export class BatchingEmitter<T = number | string> {
  private resolves: Resolve<T>[] = []
  private queue: T[] = []

  batchingEmit(id: T, batchingDelay = 0): Promise<T[]> {
    if (batchingDelay <= 0) return Promise.resolve([id])

    return new Promise(resolve => {
      this.resolves.push(resolve)

      if (this.queue.push(id) === 1) {
        setTimeout(() => {
          this.flush()
        }, batchingDelay)
      }
    })
  }

  /**
   * 清空并执行当前的队列
   * @param callback 同步回调，用于在页面销毁等需要“同步执行”的场景下，立即处理数据
   */
  flush(callback?: (queueId: T[]) => void) {
    if (!this.queue.length) return

    // 先快照一份，防止后续 push 污染当前批次，消除异步重入（Re-entrancy）
    const currentQueue = [...this.queue]
    const currentResolves = [...this.resolves]
    this.queue = []
    this.resolves = []

    let fn: Resolve<T> | undefined
    while ((fn = currentResolves.shift())) {
      fn(currentQueue)
    }

    callback?.(currentQueue)
  }
}
