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
  /** start 之后超过该时长仍未完成才显示。 */
  showDelay?: number
  /** 显示后至少停留的时长。 */
  minVisible?: number
}

export interface RouteProgressCore {
  start: (navId: number | string) => void
  done: (navId: number | string) => void
  fail: (navId: number | string, error: unknown) => void
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => RouteProgressSnapshot
}

const IDLE: RouteProgressSnapshot = Object.freeze({ phase: 'idle', visible: false, value: 0 })

export function defineRouteProgressCore(options: RouteProgressOptions = {}) {
  const { showDelay = 120, minVisible = 300 } = options

  return definePlugin<{ progress: RouteProgressCore }, { clock: RouteClock; trickle: RouteTrickle }>(
    ({ clock, trickle }) => {
      let snapshot = IDLE
      let currentId: number | string | undefined
      let shownAt = 0
      let showTimer: unknown
      let hideTimer: unknown
      let trickleTimer: unknown
      const listeners = new Set<() => void>()

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
            clearTrickle()
            // 停留期内的重入：保持可见并跳过 showDelay，只重置进度。
            if (snapshot.visible) {
              clearHide()
              reveal()
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
            clearTrickle()
            if (!snapshot.visible) {
              set(IDLE)
              return
            }
            set({ phase: 'done', visible: true, value: 100 })
            clearHide()
            const wait = Math.max(0, minVisible - (clock.now() - shownAt))
            hideTimer = clock.setTimeout(() => {
              hideTimer = undefined
              set(IDLE)
            }, wait)
          },
          fail(navId) {
            if (navId !== currentId) return
            clearShow()
            clearTrickle()
            clearHide()
            // 错误反馈由 toast 承担，顶部条立即隐藏；error 相位保留到下一次 start。
            set({ phase: 'error', visible: false, value: 0 })
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
