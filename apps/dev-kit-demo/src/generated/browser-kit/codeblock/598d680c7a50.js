import { defineLocal } from '@greypan/browser-kit'

const store = defineLocal('my-app')

store.set('profile', { name: 'Alice', role: 'admin' })
const profile = store.get('profile')

// Expires in 5 seconds
store.set('otp', '482910', 5_000)

// Cross-tab updates only (native storage event does not fire in the same tab)
const unwatch = store.watch('otp', (next, prev) => {
  console.log('otp changed across tabs', { next, prev })
})

unwatch()
console.log(profile)
