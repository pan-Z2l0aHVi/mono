import { vi } from 'vite-plus/test'

// jsdom does not implement scrolling; tests assert the surrounding lock state.
vi.stubGlobal('scrollTo', vi.fn())

// jsdom omits Element#scrollTo; BackTop only needs the public scrolling call.
Object.defineProperty(Element.prototype, 'scrollTo', {
  configurable: true,
  value: vi.fn()
})
