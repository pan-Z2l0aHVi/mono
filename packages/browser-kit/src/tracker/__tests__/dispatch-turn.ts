import { expect } from 'vite-plus/test'

/**
 * 当前 fake transport 只派生 microtask；跨 task 观察其本轮调度，不依赖 Promise 链深度。
 * MessageChannel 不推进 fake timer。未释放的 consumer gate 仍须由用例释放并等待完成信号。
 */
export function afterDispatchTurn(): Promise<void> {
  return new Promise(resolve => {
    const { port1, port2 } = new MessageChannel()
    port1.onmessage = () => {
      port1.close()
      port2.close()
      resolve()
    }
    port2.postMessage(null)
  })
}

export async function expectAfterDispatch(predicate: () => boolean): Promise<void> {
  await afterDispatchTurn()
  expect(predicate(), '本轮 fixture 调度结束后条件应已成立').toBe(true)
}
