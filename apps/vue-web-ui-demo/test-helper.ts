import { vi } from 'vite-plus/test'

// jsdom 不实现 Element#scrollIntoView；外壳在路由就绪后用它把当前导航项滚进视野。
// 这里只让它成为可观察的空实现，真实滚动行为仍由浏览器验证覆盖。
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
