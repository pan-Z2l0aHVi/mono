import { definePlugin } from '@greypan/js-kit'

let lockCount = 0
let savedOverflow = ''
let savedOverscroll = ''

export interface ScrollLockLease {
  readonly isLocked: boolean
  sync(shouldLock: boolean): void
  release(): void
}

/**
 * 锁定页面滚动。支持嵌套调用（引用计数），仅在最后一个锁释放时恢复。
 *
 * 只改 `documentElement` 的 `overflow` 和 `overscroll-behavior`，body 始终留在文档流内。
 * 改用 `body { position: fixed }` + `top: -scrollY` 会让 body 脱离文档流：
 * `documentElement.scrollHeight` 随之塌缩、`window.scrollY` 被归零，
 * 按窗口偏移定位的虚拟列表因此渲染出第 0 行却仍带旧的 `top` 偏移，表现为整屏空白。
 *
 * 阻止滚动本身（`overflow`）与抑制橡皮筋/下拉刷新（`overscroll-behavior`）是两件事：
 * 旧实现用 fixed body 同时覆盖两者，现在拆成两个根元素属性。macOS 已实测
 * `overscroll-behavior: none` 有效；iOS 侧尚无真机证据，属待验收项。
 */
export function lockScroll() {
  if (lockCount === 0) {
    savedOverflow = document.documentElement.style.overflow
    savedOverscroll = document.documentElement.style.overscrollBehavior
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.overscrollBehavior = 'none'
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
    document.documentElement.style.overscrollBehavior = savedOverscroll
  }
}

/**
 * 构建组件实例持有的滚动锁租约。每个租约仅释放自身获得的那一次锁，
 * 因此卸载、属性切换和嵌套浮层不会互相影响。
 */
export const defineScrollLockLease = () =>
  definePlugin<ScrollLockLease, Record<never, never>>(() => {
    let isLocked = false

    const sync = (shouldLock: boolean) => {
      if (shouldLock === isLocked) return
      if (shouldLock) lockScroll()
      else unlockScroll()
      isLocked = shouldLock
    }

    return {
      get isLocked() {
        return isLocked
      },

      sync,

      release() {
        sync(false)
      }
    }
  })
