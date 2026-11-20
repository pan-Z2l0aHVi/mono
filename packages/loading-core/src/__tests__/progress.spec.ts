import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { GlobalProgressController, globalProgress, isNavigating, type LoadingMetricEvent } from '..'

function root(): HTMLDivElement {
  const el = document.querySelector<HTMLDivElement>('.app-top-progress')
  if (!el) throw new Error('progress root is not mounted')
  return el
}

function bar(): HTMLDivElement {
  const el = document.querySelector<HTMLDivElement>('.app-top-progress-bar')
  if (!el) throw new Error('progress bar is not mounted')
  return el
}

describe('GlobalProgressController', () => {
  let controller: GlobalProgressController
  let metrics: LoadingMetricEvent[]
  let now: number

  beforeEach(() => {
    vi.useFakeTimers()
    document.body.replaceChildren()
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    metrics = []
    controller = new GlobalProgressController()
    controller.configure({
      delayMs: 150,
      minVisibleMs: 250,
      maxDurationMs: 20_000,
      onMetric: event => metrics.push(event)
    })
  })

  afterEach(() => {
    controller.forceReset()
    globalProgress.forceReset()
    vi.restoreAllMocks()
    vi.useRealTimers()
    document.body.replaceChildren()
  })

  const advance = (ms: number) => {
    now += ms
    vi.advanceTimersByTime(ms)
  }

  it('never shows when begin and end both happen inside the delay window', () => {
    const token = controller.begin()
    advance(100)
    token.end()
    advance(100)

    expect(document.querySelector('.app-top-progress')).toBeNull()
    expect(metrics).toEqual([])
  })

  it('shows after the delay and keeps the minimum visible time', () => {
    const token = controller.begin()
    advance(150)
    expect(root().classList.contains('is-active')).toBe(true)
    expect(metrics).toEqual([{ type: 'progress_shown' }])

    advance(50)
    token.end()
    advance(49)
    expect(root().classList.contains('is-active')).toBe(true)

    advance(151)
    expect(root().getAttribute('aria-valuenow')).toBe('100')
    advance(119)
    expect(metrics.some(event => event.type === 'progress_done')).toBe(false)
    advance(1)
    expect(metrics.filter(event => event.type === 'progress_done')).toHaveLength(1)
    expect(root().classList.contains('is-active')).toBe(false)
  })

  it('resets a 100% bar when a new navigation starts during fade-out', () => {
    const first = controller.begin()
    advance(150)
    first.end()
    advance(250)
    expect(root().getAttribute('aria-valuenow')).toBe('100')

    advance(60)
    const second = controller.begin()
    expect(root().getAttribute('aria-valuenow')).toBe('0')
    expect(root().classList.contains('is-active')).toBe(false)

    advance(149)
    expect(root().classList.contains('is-active')).toBe(false)
    advance(1)
    expect(root().classList.contains('is-active')).toBe(true)
    expect(root().getAttribute('aria-valuenow')).toBe('12')

    second.end()
  })

  it('resets to zero before reflow so the second run never animates backwards', () => {
    const first = controller.begin()
    advance(150)
    first.end()
    advance(250 + 60)

    const progressBar = bar()
    let transformAtReflow = ''
    vi.spyOn(progressBar, 'getBoundingClientRect').mockImplementation(() => {
      transformAtReflow = progressBar.style.transform
      return new DOMRect(0, 0, 0, 0)
    })

    const second = controller.begin()
    advance(150)

    expect(transformAtReflow).toBe('scaleX(0)')
    expect(progressBar.style.transform).toBe('scaleX(0.12)')
    expect(root().getAttribute('aria-valuenow')).toBe('12')

    second.end()
  })

  it('forceReset clears the bar and reports zero, never 100%', () => {
    controller.begin()
    advance(150)
    expect(root().classList.contains('is-active')).toBe(true)

    controller.forceReset()

    expect(controller.isNavigating()).toBe(false)
    expect(root().classList.contains('is-active')).toBe(false)
    expect(root().getAttribute('aria-valuenow')).toBe('0')
    expect(bar().style.transform).toBe('scaleX(0)')
  })

  it('keeps the bar until every concurrent token has ended', () => {
    const first = controller.begin()
    const second = controller.begin()
    advance(150)

    first.end()
    advance(500)
    expect(root().classList.contains('is-active')).toBe(true)
    expect(metrics.some(event => event.type === 'progress_done')).toBe(false)

    second.end()
    advance(250)
    expect(root().getAttribute('aria-valuenow')).toBe('100')
    advance(120)
    expect(root().classList.contains('is-active')).toBe(false)
  })

  it('reports the failsafe and force-resets an unfinished navigation', () => {
    controller.configure({ maxDurationMs: 1_000 })
    controller.begin()
    advance(150 + 1_000)

    expect(metrics).toContainEqual({ type: 'progress_failsafe_triggered', activeCount: 1 })
    expect(controller.isNavigating()).toBe(false)
    expect(root().getAttribute('aria-valuenow')).toBe('0')
  })

  it('arms the failsafe when navigation begins, not when the bar shows', () => {
    controller.configure({ delayMs: 30_000, maxDurationMs: 1_000 })
    controller.begin()
    advance(1_000)

    expect(metrics).toContainEqual({ type: 'progress_failsafe_triggered', activeCount: 1 })
    expect(controller.isNavigating()).toBe(false)
    expect(metrics.some(event => event.type === 'progress_shown')).toBe(false)
  })

  it('makes end idempotent so only one hide is scheduled', () => {
    const token = controller.begin()
    advance(150)
    token.end()
    token.end()
    advance(250 + 120)

    expect(metrics.filter(event => event.type === 'progress_done')).toHaveLength(1)
  })

  it('reports navigation state while a token is active', () => {
    expect(controller.isNavigating()).toBe(false)
    const token = controller.begin()
    expect(controller.isNavigating()).toBe(true)
    token.end()
    expect(controller.isNavigating()).toBe(false)
  })

  it('exposes the shared singleton through isNavigating()', () => {
    const token = globalProgress.begin()
    expect(isNavigating()).toBe(true)
    token.end()
    expect(isNavigating()).toBe(false)
  })
})
