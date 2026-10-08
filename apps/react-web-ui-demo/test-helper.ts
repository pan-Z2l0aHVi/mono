import { vi } from 'vite-plus/test'

import './act-setup'

// jsdom 不实现 window.scrollTo（调用会打印 “Not implemented”）与 Element#scrollIntoView
// （整个方法不存在，调用直接抛 TypeError）。页面级滚动条接管层在初始化时会调用前者，
// 外壳在路由就绪后用它把当前导航项滚进视野。这里只把它们换成可观察的空实现，
// 真实滚动行为仍由浏览器验证覆盖。
Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  value: vi.fn()
})
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn()
})
