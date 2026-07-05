// 兼容性最佳的写法
/** 获取当前视口尺寸 */
export function getViewportSize(): { width: number; height: number } {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  }
}

export function getRootScrollTop(): number {
  return window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop
}

export function getRootScrollLeft(): number {
  return window.scrollX ?? window.pageXOffset ?? document.documentElement.scrollLeft
}
