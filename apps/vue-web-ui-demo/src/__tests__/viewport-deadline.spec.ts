import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { setViewport } from './viewport'

const viewport = vi.hoisted(() => vi.fn<(width: number, height: number) => Promise<void>>())
vi.mock('vite-plus/test/browser', () => ({ page: { viewport } }))
let frames: Map<number, FrameRequestCallback>
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
  frames = new Map()
  let id = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (frame: number) => frames.delete(frame))
  viewport.mockResolvedValue(undefined)
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1280)
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800)
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('viewport budget after RPC', () => {
  it.each([1280, 390])('missing frame fails and cleans resources, width=%s', async width => {
    let outcome = 'pending'
    void setViewport(width, 800).then(
      () => {
        outcome = 'success'
      },
      error => {
        outcome = error.message
      }
    )
    await vi.advanceTimersByTimeAsync(5001)
    expect(outcome).toContain('viewport')
    expect(outcome).toContain('5000')
    expect(frames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('returns after the actual final rendering step', async () => {
    let done = false
    const waiting = setViewport(1280, 800).then(() => {
      done = true
    })
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toBe(false)
    const ready = frames
    frames = new Map()
    for (const callback of ready.values()) callback(performance.now())
    await vi.advanceTimersByTimeAsync(1)
    await waiting
    expect(done).toBe(true)
    expect(frames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})
