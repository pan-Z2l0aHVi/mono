import { definePlugin } from '@greypan/js-kit'

import type { RouteClock } from './clock'

export type DelayedVisibilityPhase = 'idle' | 'pending' | 'done' | 'error'

export interface DelayedVisibilitySnapshot {
  readonly phase: DelayedVisibilityPhase
  readonly visible: boolean
}

export interface DelayedVisibilityOptions {
  /** start 之后超过该时长仍未完成才显示（默认 250ms，250ms 内无感完成不展示任何 loading）。 */
  showDelay?: number
  /** 一旦显示后至少停留的时长（默认 300ms，防止闪一下即消失）。 */
  minVisible?: number
}

export interface DelayedVisibilityCore {
  start: (taskId?: number | string) => void
  done: (taskId?: number | string) => void
  fail: (taskId?: number | string, error?: unknown) => void
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => DelayedVisibilitySnapshot
}

const IDLE_VISIBILITY: DelayedVisibilitySnapshot = Object.freeze({ phase: 'idle', visible: false })

/**
 * 通用延迟显隐状态机（供局部 loading / 异步渲染组件 / 骨架屏复用）：
 * - `< showDelay`（默认 250ms）内完成：永不变为 `visible: true`；
 * - 一旦进入 `visible: true`：至少维持 `minVisible`（默认 300ms）才隐藏，且停留期内重入立即复用可见态。
 */
export function defineDelayedVisibility(options: DelayedVisibilityOptions = {}) {
  const { showDelay = 250, minVisible = 300 } = options

  return definePlugin<{ visibility: DelayedVisibilityCore }, { clock: RouteClock }>(({ clock }) => {
    let snapshot = IDLE_VISIBILITY
    let currentId: number | string | undefined
    let autoSeq = 0
    let shownAt = 0
    let showTimer: unknown
    let hideTimer: unknown
    const listeners = new Set<() => void>()

    const set = (next: DelayedVisibilitySnapshot) => {
      if (next.phase === snapshot.phase && next.visible === snapshot.visible) return
      snapshot = Object.freeze(next)
      for (const listener of listeners) listener()
    }

    const clearShow = () => {
      if (showTimer !== undefined) clock.clearTimeout(showTimer)
      showTimer = undefined
    }

    const clearHide = () => {
      if (hideTimer !== undefined) clock.clearTimeout(hideTimer)
      hideTimer = undefined
    }

    const reveal = () => {
      shownAt = clock.now()
      set({ phase: 'pending', visible: true })
    }

    return {
      visibility: {
        start(taskId) {
          currentId = taskId ?? ++autoSeq
          clearShow()
          if (snapshot.visible) {
            clearHide()
            reveal()
            return
          }
          set({ phase: 'pending', visible: false })
          showTimer = clock.setTimeout(() => {
            showTimer = undefined
            reveal()
          }, showDelay)
        },
        done(taskId) {
          if (taskId !== undefined && taskId !== currentId) return
          clearShow()
          if (!snapshot.visible) {
            set(IDLE_VISIBILITY)
            return
          }
          set({ phase: 'done', visible: true })
          clearHide()
          const wait = Math.max(0, minVisible - (clock.now() - shownAt))
          hideTimer = clock.setTimeout(() => {
            hideTimer = undefined
            set(IDLE_VISIBILITY)
          }, wait)
        },
        fail(taskId) {
          if (taskId !== undefined && taskId !== currentId) return
          clearShow()
          clearHide()
          set({ phase: 'error', visible: false })
        },
        subscribe(listener) {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
        getSnapshot: () => snapshot
      }
    }
  })
}
