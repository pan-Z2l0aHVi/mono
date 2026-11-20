import { afterEach, vi } from 'vite-plus/test'

afterEach(() => {
  document.body.replaceChildren()
  vi.useRealTimers()
})
