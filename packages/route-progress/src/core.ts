import { definePlugin } from '@greypan/js-kit'

import type { RouteClock } from './clock'
import type { RouteTrickle } from './trickle'

export type RouteProgressPhase = 'idle' | 'pending' | 'done' | 'error'

export interface RouteProgressSnapshot {
  readonly phase: RouteProgressPhase
  readonly visible: boolean
  readonly value: number
}

export interface RouteProgressOptions {
  /** start 之后超过该时长仍未完成才显示（默认 250ms，250ms 内无感完成永不展示）。 */
  showDelay?: number
  /** 一旦显示后至少停留的总时长（默认 300ms）。 */
  minVisible?: number
  /**
   * 平滑收尾：一旦进度条已显示，`done` 推到 100% 后至少停留的时长（默认 220ms，覆盖 200ms 的
   * `transform` 冲刺过渡），确保哪怕刚显示就结束或长耗时结束，都顺滑走完 100% 动画再淡出。
   */
  completeHold?: number
}

export interface RouteProgressCore {
  start: (navId: number | string) => void
  done: (navId: number | string) => void
  fail: (navId: number | string, error: unknown) => void
  subscribe: (listener: () => void) => () => void
  onFailure: (listener: (error: unknown) => void) => () => void
  getSnapshot: () => RouteProgressSnapshot
}

const IDLE: RouteProgressSnapshot = Object.freeze({ phase: 'idle', visible: false, value: 0 })

export function defineRouteProgressCore(options: RouteProgressOptions = {}) {
  const { showDelay = 250, minVisible = 300, completeHold = 220 } = options
  const resetHold = 200

  return definePlugin<{ progress: RouteProgressCore }, { clock: RouteClock; trickle: RouteTrickle }>(
    ({ clock, trickle }) => {
      let snapshot = IDLE
      let currentId: number | string | undefined
      let shownAt = 0
      let showTimer: unknown
      let hideTimer: unknown
      let resetTimer: unknown
      let trickleTimer: unknown
      const listeners = new Set<() => void>()
      const failureListeners = new Set<(error: unknown) => void>()

      const set = (next: RouteProgressSnapshot) => {
        if (next.phase === snapshot.phase && next.visible === snapshot.visible && next.value === snapshot.value) {
          return
        }
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
      const clearReset = () => {
        if (resetTimer !== undefined) clock.clearTimeout(resetTimer)
        resetTimer = undefined
      }
      const clearTrickle = () => {
        if (trickleTimer !== undefined) clock.clearTimeout(trickleTimer)
        trickleTimer = undefined
      }

      const scheduleTrickle = () => {
        trickleTimer = clock.setTimeout(() => {
          trickleTimer = undefined
          if (snapshot.phase !== 'pending' || !snapshot.visible) return
          set({ ...snapshot, value: trickle.next(snapshot.value) })
          scheduleTrickle()
        }, trickle.intervalMs)
      }

      const reveal = () => {
        shownAt = clock.now()
        set({ phase: 'pending', visible: true, value: trickle.initial })
        clearTrickle()
        scheduleTrickle()
      }

      return {
        progress: {
          start(navId) {
            currentId = navId
            clearShow()
            clearReset()
            clearTrickle()
            // 停留期内的重入：保持可见并跳过 showDelay；不把 value 往回拉到 12%，仅保持单调向前推进
            // （若之前已完成到 100%，才重开一轮）。
            if (snapshot.visible) {
              clearHide()
              if (snapshot.phase === 'done' || snapshot.value >= 100) {
                reveal()
              } else {
                shownAt = clock.now()
                set({ phase: 'pending', visible: true, value: Math.max(snapshot.value, trickle.initial) })
                scheduleTrickle()
              }
              return
            }
            set({ phase: 'pending', visible: false, value: 0 })
            showTimer = clock.setTimeout(() => {
              showTimer = undefined
              reveal()
            }, showDelay)
          },
          done(navId) {
            if (navId !== currentId) return
            clearShow()
            clearReset()
            clearTrickle()
            if (!snapshot.visible) {
              set(IDLE)
              return
            }
            set({ phase: 'done', visible: true, value: 100 })
            clearHide()
            // 平滑收尾：同时满足「总可见时长 >= minVisible」与「100% 冲刺动画停留 >= completeHold」。
            const remainingVisible = minVisible - (clock.now() - shownAt)
            const wait = Math.max(0, remainingVisible, completeHold)
            hideTimer = clock.setTimeout(() => {
              hideTimer = undefined
              // 第一步：在 value: 100 满格状态下做 opacity 淡出（避免淡出过程中看到进度条往左退回 0%）
              set({ phase: 'idle', visible: false, value: 100 })
              // 第二步：等 opacity 淡出过渡（200ms）彻底不可见后，静默归零 value: 0
              resetTimer = clock.setTimeout(() => {
                resetTimer = undefined
                set(IDLE)
              }, resetHold)
            }, wait)
          },
          fail(navId, error) {
            if (navId !== currentId) return
            clearShow()
            clearReset()
            clearTrickle()
            clearHide()
            // 错误反馈由 toast 承担，顶部条立即隐藏；error 相位保留到下一次 start。
            set({ phase: 'error', visible: false, value: 0 })
            for (const listener of failureListeners) listener(error)
          },
          onFailure(listener) {
            failureListeners.add(listener)
            return () => {
              failureListeners.delete(listener)
            }
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
    }
  )
}
