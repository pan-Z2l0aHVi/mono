import { definePlugin } from '@greypan/js-kit'
import type { RequestHandler } from 'msw'
import { setupWorker } from 'msw/browser'

export interface MswContext {
  worker: ReturnType<typeof setupWorker>
  startMsw: () => Promise<unknown>
  stopMsw: () => Promise<void>
  resetMsw: () => void
}

/**
 * MSW service worker 生命周期管理插件
 * 提供 start/stop/reset 方法
 */
export function defineMsw(handlers: RequestHandler[]) {
  return definePlugin<MswContext, object>(() => {
    const worker = setupWorker(...handlers)

    return {
      worker,
      startMsw: () => worker.start({ quiet: true }),
      stopMsw: () => Promise.resolve(worker.stop()),
      resetMsw: () => worker.resetHandlers()
    }
  })
}
