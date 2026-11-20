export interface ProgressToken {
  /** Finish this task. Repeated calls are ignored. */
  end: () => void
}

export type LoadingMetricEvent =
  | { type: 'progress_shown' }
  | { type: 'progress_done'; durationMs: number }
  | { type: 'progress_failsafe_triggered'; activeCount: number }

export interface GlobalProgressConfig {
  /** Delay before showing the bar. Avoids flashing on cache hits. */
  delayMs?: number
  /** Minimum time the bar stays visible once shown. */
  minVisibleMs?: number
  /** Failsafe timeout for a single or chained navigation. */
  maxDurationMs?: number
  /** Optional RUM hook. */
  onMetric?: (event: LoadingMetricEvent) => void
}

const FADE_OUT_MS = 120
const TRICKLE_MS = 200

/**
 * Framework-agnostic progress state machine.
 *
 * It owns the DOM node it creates and every timer it starts. A token represents
 * one in-flight task; the bar hides only after the last token ends. Starting a
 * new token during the fade-out window resets the old bar and restarts the
 * delay, so a cached navigation neither flashes nor freezes at 100%.
 */
export class GlobalProgressController {
  private readonly activeTokens = new Set<symbol>()
  private isVisible = false
  private shownAt = 0
  private value = 0
  private delayTimer: number | null = null
  private hideTimer: number | null = null
  private fadeOutTimer: number | null = null
  private trickleTimer: number | null = null
  private failsafeTimer: number | null = null
  private rootEl: HTMLDivElement | null = null
  private barEl: HTMLDivElement | null = null

  private config: Required<Omit<GlobalProgressConfig, 'onMetric'>> & {
    onMetric?: GlobalProgressConfig['onMetric']
  } = {
    delayMs: 150,
    minVisibleMs: 250,
    maxDurationMs: 20_000,
    onMetric: undefined
  }

  /** Merge new configuration into the current one. */
  configure(options: GlobalProgressConfig = {}): void {
    this.config = { ...this.config, ...options }
  }

  /** Whether a task is active; used to tell real navigation from background prefetch. */
  isNavigating(): boolean {
    return this.activeTokens.size > 0
  }

  /**
   * Start a task.
   *
   * The caller must call `end()` on the returned token. Multiple tokens may be
   * active at once; the bar stays visible until all of them end.
   */
  begin(): ProgressToken {
    const isFirstToken = this.activeTokens.size === 0
    const token = Symbol('progress-task')
    this.activeTokens.add(token)

    if (isFirstToken) this.resetFailsafe()

    if (this.hideTimer !== null) {
      window.clearTimeout(this.hideTimer)
      this.hideTimer = null
    }

    // A new navigation during fade-out must hide and reset the old bar before
    // restarting the delay. Otherwise the bar stays at 100% until the new task
    // finishes, or the new task flashes because it reuses the old delay.
    if (this.fadeOutTimer !== null) {
      window.clearTimeout(this.fadeOutTimer)
      this.fadeOutTimer = null
      this.isVisible = false
      this.rootEl?.classList.remove('is-active')
      this.setProgress(0)
    }

    if (this.isVisible) {
      this.resetFailsafe()
    } else if (this.delayTimer === null) {
      this.delayTimer = window.setTimeout(() => {
        this.delayTimer = null
        if (this.activeTokens.size > 0) this.show()
      }, this.config.delayMs)
    }

    let ended = false
    return {
      end: () => {
        if (ended) return
        ended = true
        this.activeTokens.delete(token)
        if (this.activeTokens.size === 0) this.scheduleHide()
      }
    }
  }

  /** Abort every active task and reset the bar to zero without reaching 100%. */
  forceReset(): void {
    this.activeTokens.clear()
    this.clearTimers()
    this.isVisible = false
    if (this.rootEl) {
      this.rootEl.classList.remove('is-active')
      this.rootEl.setAttribute('aria-valuenow', '0')
    }
    if (this.barEl) {
      this.barEl.style.transition = 'none'
      this.barEl.style.transform = 'scaleX(0)'
    }
    this.value = 0
  }

  private ensureDom(): boolean {
    if (typeof document === 'undefined') return false
    if (this.rootEl?.isConnected && this.barEl?.isConnected) return true

    const root = document.createElement('div')
    root.className = 'app-top-progress'
    root.setAttribute('role', 'progressbar')
    root.setAttribute('aria-label', '页面加载进度')
    root.setAttribute('aria-valuemin', '0')
    root.setAttribute('aria-valuemax', '100')
    root.setAttribute('aria-valuenow', '0')

    const bar = document.createElement('div')
    bar.className = 'app-top-progress-bar'
    root.appendChild(bar)
    document.body.appendChild(root)

    this.rootEl = root
    this.barEl = bar
    return true
  }

  private show(): void {
    if (!this.ensureDom()) return
    const root = this.rootEl
    const bar = this.barEl
    if (!root || !bar) return

    this.isVisible = true
    this.shownAt = performance.now()

    // Disable the transition while forcing the bar back to zero. Without the
    // reflow the browser animates 100% -> 12%, which looks like the second
    // navigation moving backwards.
    bar.style.transition = 'none'
    this.setProgress(0)
    void bar.getBoundingClientRect()
    bar.style.transition = ''

    root.classList.add('is-active')
    this.setProgress(0.12)
    this.config.onMetric?.({ type: 'progress_shown' })

    this.trickleTimer = window.setInterval(() => {
      const step = (1 - this.value) * (this.value < 0.5 ? 0.18 : 0.08)
      this.setProgress(Math.min(0.92, this.value + Math.max(step, 0.01)))
    }, TRICKLE_MS)

    this.resetFailsafe()
  }

  private scheduleHide(): void {
    if (this.delayTimer !== null) {
      window.clearTimeout(this.delayTimer)
      this.delayTimer = null
      if (this.failsafeTimer !== null) {
        window.clearTimeout(this.failsafeTimer)
        this.failsafeTimer = null
      }
      return
    }
    if (!this.isVisible || this.hideTimer !== null) return

    const elapsed = performance.now() - this.shownAt
    const remaining = Math.max(0, this.config.minVisibleMs - elapsed)

    this.hideTimer = window.setTimeout(() => {
      this.hideTimer = null
      if (this.trickleTimer !== null) {
        window.clearInterval(this.trickleTimer)
        this.trickleTimer = null
      }
      if (this.failsafeTimer !== null) {
        window.clearTimeout(this.failsafeTimer)
        this.failsafeTimer = null
      }

      this.setProgress(1)
      this.fadeOutTimer = window.setTimeout(() => {
        this.fadeOutTimer = null
        this.isVisible = false
        this.rootEl?.classList.remove('is-active')
        this.config.onMetric?.({
          type: 'progress_done',
          durationMs: performance.now() - this.shownAt
        })
      }, FADE_OUT_MS)
    }, remaining)
  }

  private setProgress(next: number): void {
    this.value = next
    if (this.barEl) this.barEl.style.transform = `scaleX(${next})`
    if (this.rootEl) this.rootEl.setAttribute('aria-valuenow', String(Math.round(next * 100)))
  }

  private resetFailsafe(): void {
    if (this.failsafeTimer !== null) window.clearTimeout(this.failsafeTimer)
    this.failsafeTimer = window.setTimeout(() => {
      this.config.onMetric?.({
        type: 'progress_failsafe_triggered',
        activeCount: this.activeTokens.size
      })
      this.forceReset()
    }, this.config.maxDurationMs)
  }

  private clearTimers(): void {
    if (this.delayTimer !== null) window.clearTimeout(this.delayTimer)
    if (this.hideTimer !== null) window.clearTimeout(this.hideTimer)
    if (this.fadeOutTimer !== null) window.clearTimeout(this.fadeOutTimer)
    if (this.trickleTimer !== null) window.clearInterval(this.trickleTimer)
    if (this.failsafeTimer !== null) window.clearTimeout(this.failsafeTimer)
    this.delayTimer = null
    this.hideTimer = null
    this.fadeOutTimer = null
    this.trickleTimer = null
    this.failsafeTimer = null
  }
}

/** Application-wide progress bar instance. */
export const globalProgress = new GlobalProgressController()

/** Convenience alias for `globalProgress.isNavigating()`. */
export function isNavigating(): boolean {
  return globalProgress.isNavigating()
}
