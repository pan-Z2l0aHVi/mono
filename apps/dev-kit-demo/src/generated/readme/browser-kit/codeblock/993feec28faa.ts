import { defineLocal } from '@greypan/browser-kit/storage'

const storage = defineLocal('my-app')

storage.set('user', { name: 'Alice' })
storage.get<{ name: string }>('user') // { name: 'Alice' }

// Expire after one hour (ms)
storage.set('token', 'abc123', 3_600_000)

// Listen for changes made in other tabs on the same origin
const unwatch = storage.watch<{ name: string }>('user', (next, prev) => {
  console.log('user changed in another tab', next, prev)
})
unwatch()
