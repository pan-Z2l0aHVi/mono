/** 获取当前视口尺寸 */
export function getViewportSize(): { width: number; height: number } {
  // SSR 下无 window，返回 0 尺寸让调用方降级
  if (typeof window === 'undefined') return { width: 0, height: 0 }
  return {
    width: window.innerWidth,
    height: window.innerHeight
  }
}

export function getRootScrollTop(): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0
  return window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop
}

export function getRootScrollLeft(): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0
  return window.scrollX ?? window.pageXOffset ?? document.documentElement.scrollLeft
}
