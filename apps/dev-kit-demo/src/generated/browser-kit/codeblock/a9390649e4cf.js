import { env } from '@greypan/browser-kit'

const snapshot = {
  isBrowser: env.isBrowser,
  isSsr: env.isSsr,
  isMobile: env.isMobile,
  isDesktop: env.isDesktop,
  isTouchSupported: env.isTouchSupported,
  isChrome: env.isChrome,
  isSafari: env.isSafari,
  isFirefox: env.isFirefox,
  isIframe: env.isIframe,
  isPWA: env.isPWA
}

console.log(snapshot)
