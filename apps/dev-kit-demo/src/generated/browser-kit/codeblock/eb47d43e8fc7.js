import {
  defineBatchTrack,
  defineLastWords,
  defineOfflineRestore,
  definePageErrors,
  defineTracker
} from '@greypan/browser-kit'

const sent = []

const tracker = defineTracker({
  url: '/api/track',
  persistenceKey: 'demo-session',
  transport: async payload => {
    sent.push(payload)
  }
})
  .use(defineBatchTrack({ defaultBatchDelay: 500, maxBatchKB: 64 }))
  .use(defineOfflineRestore())
  .use(defineLastWords())
  .use(definePageErrors({ maxErrors: 10, dedupeWindowMs: 5_000 }))
  .make()

// Batched by default (500ms window)
tracker.track({ event: 'page_view', path: '/docs' })

// Pass batchDelay <= 0 to bypass the batch timer for an urgent event
tracker.track({ event: 'checkout_start' }, 0)

// Pause during offline periods and resume when back online
tracker.pause()
tracker.track({ event: 'click', target: 'cta' })
await tracker.resume()
await tracker.flush()

// Detach all window and document listeners registered by plugins
tracker.stop()

console.log(sent.length)
