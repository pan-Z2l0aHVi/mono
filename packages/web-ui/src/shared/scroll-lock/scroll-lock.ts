let lockCount = 0
let savedOverflow = ''
let savedScrollY = 0

export interface ScrollLockLease {
  readonly isLocked: boolean
  sync(shouldLock: boolean): void
  release(): void
}

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

/**
 * 组件实例持有的滚动锁租约。它只会释放自身已获取的那一次锁，
 * 避免卸载、属性切换和嵌套浮层互相影响。
 */
export function createScrollLockLease(): ScrollLockLease {
  let isLocked = false

  return {
    get isLocked() {
      return isLocked
    },

    sync(shouldLock) {
      if (shouldLock === isLocked) return
      if (shouldLock) lockScroll()
      else unlockScroll()
      isLocked = shouldLock
    },

    release() {
      this.sync(false)
    }
  }
}
