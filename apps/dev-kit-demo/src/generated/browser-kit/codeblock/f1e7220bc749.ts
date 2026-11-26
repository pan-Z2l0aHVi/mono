import { definePageErrors, defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({
  url: '/api/events',
  persistenceKey: 'error-only',
  transform: data => ({ ...data, appVersion: '1.4.0' }),
  transport: async item => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(item)
    })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  }
})
  .use(
    definePageErrors({
      maxErrors: 20,
      dedupeWindowMs: 5_000,
      metadata: () => ({ route: location.pathname })
    })
  )
  .make()

tracker.track({ event: 'boot' })
tracker.stop()
