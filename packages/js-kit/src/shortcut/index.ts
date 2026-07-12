// 安全调用：捕获同步异常和异步 rejection，fire-and-forget
export function safeCall<T extends (...args: never[]) => unknown>(fn: T, ...args: Parameters<T>) {
  new Promise(resolve => resolve(fn(...args))).catch(() => {})
}
