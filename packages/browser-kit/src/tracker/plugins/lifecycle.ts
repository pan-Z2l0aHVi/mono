/** 插件按组合顺序捕获上游 stop，使浅合并后的出口仍能释放全部监听器。 */
export function composeStop(previous: (() => void) | undefined, dispose: () => void): () => void {
  let stopped = false
  return () => {
    if (stopped) return
    stopped = true
    try {
      dispose()
    } finally {
      previous?.()
    }
  }
}

export interface StopCapability {
  /** 释放已经组合的插件监听器，不清空或冲刷 outbox。 */
  stop(): void
}
