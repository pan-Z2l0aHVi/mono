import { definePlugin } from '@greypan/js-kit'
import type { ReactiveController, ReactiveControllerHost } from 'lit'

export interface VisibleArea {
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
  readonly width: number
  readonly height: number
}

export interface VisibleAreaTracker {
  setTarget(target: Element | null): void
  refresh(): void
  connect(): void
  disconnect(): void
}

const emptyVisibleArea: VisibleArea = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: 0,
  height: 0
}

function getVisibleArea(target: Element | null): VisibleArea {
  if (!target) return emptyVisibleArea

  const rect = target.getBoundingClientRect()
  const left = Math.max(0, rect.left)
  const top = Math.max(0, rect.top)
  const right = Math.min(window.innerWidth, rect.right)
  const bottom = Math.min(window.innerHeight, rect.bottom)

  if (right <= left || bottom <= top) return emptyVisibleArea

  return {
    top,
    right,
    bottom,
    left,
    width: right - left,
    height: bottom - top
  }
}

function visibleAreasEqual(a: VisibleArea | undefined, b: VisibleArea): boolean {
  return (
    a?.top === b.top &&
    a.right === b.right &&
    a.bottom === b.bottom &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
  )
}

/**
 * 追踪单个元素与浏览器 viewport 的交集区域。
 *
 * 模块统一持有 ResizeObserver、viewport 监听器和 rAF 合帧；
 * 使用方只需管理 target 并响应可见区域变化。
 */
export function defineVisibleAreaTracker(options: { readonly onVisibleAreaChange: (area: VisibleArea) => void }) {
  return definePlugin<VisibleAreaTracker, Record<never, never>>(() => {
    let target: Element | null = null
    let observer: ResizeObserver | undefined
    let frame: number | undefined
    let connected = false
    let previousArea: VisibleArea | undefined

    const report = () => {
      frame = undefined
      if (!connected) return

      const nextArea = getVisibleArea(target)
      if (visibleAreasEqual(previousArea, nextArea)) return

      previousArea = nextArea
      options.onVisibleAreaChange(nextArea)
    }

    const refresh = () => {
      if (!connected || frame !== undefined) return
      frame = requestAnimationFrame(report)
    }

    const observeTarget = () => {
      observer?.disconnect()
      observer = undefined

      if (!target || typeof ResizeObserver === 'undefined') return

      observer = new ResizeObserver(refresh)
      observer.observe(target)
    }

    return {
      setTarget(nextTarget) {
        if (target === nextTarget) {
          refresh()
          return
        }

        target = nextTarget
        previousArea = undefined
        if (!connected) return

        observeTarget()
        refresh()
      },

      refresh,

      connect() {
        if (connected) return

        connected = true
        window.addEventListener('scroll', refresh, { passive: true })
        window.addEventListener('resize', refresh, { passive: true })
        observeTarget()
        refresh()
      },

      disconnect() {
        if (!connected) return

        connected = false
        window.removeEventListener('scroll', refresh)
        window.removeEventListener('resize', refresh)
        observer?.disconnect()
        observer = undefined
        previousArea = undefined

        if (frame !== undefined) cancelAnimationFrame(frame)
        frame = undefined
      }
    }
  })
}

/** 将内部可见区域追踪器接入 Lit host 生命周期。 */
export class VisibleAreaController implements ReactiveController {
  constructor(
    host: ReactiveControllerHost,
    private readonly tracker: VisibleAreaTracker
  ) {
    host.addController(this)
  }

  hostConnected() {
    this.tracker.connect()
  }

  hostDisconnected() {
    this.tracker.disconnect()
  }
}
