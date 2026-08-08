export const sleep = (ms?: number) => new Promise(resolve => setTimeout(resolve, ms))

export const sleepSync = (ms: number) => {
  const start = Date.now()
  while (Date.now() - start < ms) {
    /* empty */
  }
}

// 直接解绑 Promise.prototype.then 在严格模式（ESM）下调用会因 this 为 undefined 抛
// TypeError，这里用箭头函数绑定到新的 resolved Promise，保持 defer(fn) 的调用方式
export const defer = <T>(fn: () => T | PromiseLike<T>): Promise<T> => Promise.resolve().then(fn)
