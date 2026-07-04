// 兼容性最佳的写法
export function getRootScrollTop(): number {
  return window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop
}

export function getRootScrollLeft(): number {
  return window.scrollX ?? window.pageXOffset ?? document.documentElement.scrollLeft
}
