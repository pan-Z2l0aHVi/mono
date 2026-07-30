let lockCount = 0
let savedOverflow = ''
let savedScrollY = 0

/**
 * 锁定页面滚动。支持嵌套调用（引用计数），仅在最后一个锁释放时恢复。
 */
export function lockScroll() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY
    savedOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    // 固定 body 防止 iOS 弹性滚动
    document.body.style.position = 'fixed'
    document.body.style.top = `-${savedScrollY}px`
    document.body.style.width = '100%'
  }
  lockCount++
}

/**
 * 解锁页面滚动。与 lockScroll 配对，引用归零时恢复。
 */
export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.documentElement.style.overflow = savedOverflow
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
    window.scrollTo(0, savedScrollY)
  }
}
