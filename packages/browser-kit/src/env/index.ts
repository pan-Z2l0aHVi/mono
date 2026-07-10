const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'
const ua = typeof window !== 'undefined' ? window.navigator.userAgent : ''
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)

export const env = {
  // --- 基础操作系统 ---
  get isAndroid() {
    return /Android/i.test(ua)
  },
  get isIos() {
    return /iPad|iPhone|iPod/i.test(ua)
  },
  get isIpadOs() {
    return /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  },

  // --- 平台/宿主环境 ---
  get isWeChat() {
    return /MicroMessenger/i.test(ua)
  },
  get isAlipay() {
    return /AlipayClient/i.test(ua)
  },
  get isDingTalk() {
    return /DingTalk/i.test(ua)
  },
  get isIframe() {
    return isBrowser && window.self !== window.top
  },
  get isPWA() {
    return isBrowser && window.matchMedia('(display-mode: standalone)').matches
  },
  get isWebview() {
    return /WebView|wv|u7/i.test(ua) || (isMobile && /AppleWebKit/i.test(ua) && !/Safari/i.test(ua))
  },
  get isSsr() {
    return !isBrowser
  },
  get isBrowser() {
    return isBrowser
  },

  // --- 交互设备 ---
  get isMobile() {
    return isMobile
  },
  get isDesktop() {
    return !isMobile
  },
  get isTouchSupported() {
    return isBrowser && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  },

  // --- 浏览器内核/引擎 ---
  get isChrome() {
    return /Chrome/i.test(ua) && /Google Inc/.test(navigator.vendor)
  },
  get isSafari() {
    return /Safari/i.test(ua) && /Apple Computer/.test(navigator.vendor)
  },
  get isFirefox() {
    return /Firefox/i.test(ua)
  }
}
