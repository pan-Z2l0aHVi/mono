import { defineLocal } from '@greypan/browser-kit'

const storage = defineLocal('my-app')

storage.set('user', { name: 'Alice' })
storage.get('user') // { name: 'Alice' }

// Expire after one hour
storage.set('token', 'abc123', 3600_000)

// Listen for changes from other tabs
const unwatch = storage.watch('user', (newValue, oldValue) => {
  console.log('user changed', newValue, oldValue)
})
