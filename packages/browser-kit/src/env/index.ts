const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'
const getUA = () => (typeof window !== 'undefined' ? window.navigator.userAgent : '')

export const env = {
  // --- 基础操作系统 ---
  get isAndroid() {
    return /Android/i.test(getUA())
  },
  get isIos() {
    return /iPad|iPhone|iPod/i.test(getUA())
  },
  get isIpadOs() {
    return /iPad/i.test(getUA()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  },

  // --- 平台/宿主环境 ---
  get isWeChat() {
    return /MicroMessenger/i.test(getUA())
  },
  get isAlipay() {
    return /AlipayClient/i.test(getUA())
  },
  get isDingTalk() {
    return /DingTalk/i.test(getUA())
  },
  get isIframe() {
    return isBrowser && window.self !== window.top
  },
  get isPWA() {
    return isBrowser && window.matchMedia('(display-mode: standalone)').matches
  },
  get isWebview() {
    const ua = getUA()
    return /WebView|wv|u7/i.test(ua) || (this.isMobile && /AppleWebKit/i.test(ua) && !/Safari/i.test(ua))
  },
  get isSsr() {
    return !isBrowser
  },
  get isBrowser() {
    return isBrowser
  },

  // --- 交互设备 ---
  get isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(getUA())
  },
  get isDesktop() {
    return !this.isMobile
  },
  get isTouchSupported() {
    return isBrowser && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  },

  // --- 浏览器内核/引擎 ---
  get isChrome() {
    return /Chrome/i.test(getUA()) && /Google Inc/.test(navigator.vendor)
  },
  get isSafari() {
    return /Safari/i.test(getUA()) && /Apple Computer/.test(navigator.vendor)
  },
  get isFirefox() {
    return /Firefox/i.test(getUA())
  }
}
