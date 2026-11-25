import {
  defineBatchTrack,
  defineLastWords,
  defineOfflineRestore,
  definePageErrors,
  defineTracker
} from '@greypan/browser-kit/tracker'

const tracker = defineTracker({
  url: '/api/track',
  persistenceKey: 'main-app'
})
  .use(defineBatchTrack({ defaultBatchDelay: 500, maxBatchKB: 64 }))
  .use(defineOfflineRestore())
  .use(defineLastWords())
  .use(definePageErrors({ maxErrors: 20, dedupeWindowMs: 5_000 }))
  .make()

tracker.track({ event: 'page_view', path: '/' })

// 实例销毁时移除全局监听（不会清空 outbox）
tracker.stop()
