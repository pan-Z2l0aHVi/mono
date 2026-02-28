import { createPlugin } from '@mono/utils-core'

import { on } from '@/shortcut'

import type { TrackerApi } from './tracker'

export interface LeaveSendApi {
  destroy: () => void
}

export function createLeaveSend() {
  return createPlugin<'leaveSend', LeaveSendApi, { tracker: TrackerApi }>('leaveSend', ctx => {
    const controller = new AbortController()
    const { signal } = controller

    const flushHandler = () => {
      ctx.tracker.flush()
    }
    on(window, 'beforeunload', flushHandler, { signal })
    on(window, 'pagehide', flushHandler, { signal })
    on(
      document,
      'visibilitychange',
      () => {
        if (document.visibilityState === 'hidden') flushHandler()
      },
      { signal }
    )

    return {
      destroy: () => controller.abort()
    }
  })
}
