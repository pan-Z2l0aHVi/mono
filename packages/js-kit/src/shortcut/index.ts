// 安全调用：捕获同步异常和异步 rejection，fire-and-forget。
// 默认静默吞掉错误；需要观察失败时传入 onError，"吞还是报"的策略因此集中在这里，
// 调用方不必在每个 fire-and-forget 现场重新决定。
export interface SafeCallOptions {
  onError?: (error: unknown) => void
}

export function safeCall(fn: () => unknown, options?: SafeCallOptions): void {
  new Promise(resolve => resolve(fn())).catch(error => {
    if (!options?.onError) return
    try {
      options.onError(error)
    } catch {
      // 上报通道自身的失败也保持 fire-and-forget，避免 unhandled rejection。
    }
  })
}
