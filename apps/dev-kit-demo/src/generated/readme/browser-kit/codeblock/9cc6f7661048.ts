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

// Detach global listeners on teardown (does not clear the outbox)
tracker.stop()
