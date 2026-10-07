import { vi } from 'vite-plus/test'

// RTL 只在它自己的 act 包装里读这个开关；spec 直接 import react 的 `act` 时，
// 不置位就会让每次状态回写都走「未配置 act 环境」的告警分支。
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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
