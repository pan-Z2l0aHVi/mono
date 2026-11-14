import './act-setup'

import { vi } from 'vite-plus/test'

// Node ≥22 exposes an experimental global localStorage that returns undefined unless
// --localstorage-file is set. Vitest's jsdom setup skips copying a same-named global,
// so specs would see Node's empty implementation instead of the window Storage.
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  get() {
    const win = (globalThis as { jsdom?: { window?: { localStorage?: Storage } } }).jsdom?.window
    return win?.localStorage
  }
})

// jsdom 不实现 window.scrollTo（调用会打印 “Not implemented”）与 Element#scrollIntoView
// （整个方法不存在，调用直接抛 TypeError）。页面级 scrollbar 接管层在初始化时会调用前者，
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

// jsdom 不提供媒体查询和 Web Animations；真实动画由浏览器测试覆盖。
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((media: string) => ({
    media,
    matches: false,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(true)
  }))
}
if (!Element.prototype.animate) {
  Element.prototype.animate = () => ({ cancel() {} }) as Animation
}
