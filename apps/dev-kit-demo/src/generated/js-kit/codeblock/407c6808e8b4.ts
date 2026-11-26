import { safeCall } from '@greypan/js-kit'

safeCall(
  () => {
    throw new Error('sync boom')
  },
  {
    onError: error => console.warn('Captured:', error)
  }
)

safeCall(async () => Promise.reject(new Error('async boom')), {
  onError: error => console.warn('Captured async:', error)
})
