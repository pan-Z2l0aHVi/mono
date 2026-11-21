import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import {
  createDelayedVisibility,
  createRouteProgressStarter,
  defineRouteClock,
  defineRouteProgressCore,
  defineRouteTrickle
} from '..'

describe('route progress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('250ms 内完成永不显示（用户无感知）', () => {
    const p = createRouteProgressStarter()
    const seen: boolean[] = []
    p.subscribe(() => seen.push(p.getSnapshot().visible))
    p.start(1)
    vi.advanceTimersByTime(249)
    p.done(1)
    vi.advanceTimersByTime(1000)
    expect(seen.every(v => !v)).toBe(true)
    expect(p.getSnapshot().visible).toBe(false)
  })

  it('刚满 250ms 显示后立即结束，平滑推到 100% 并至少停留 minVisible(300ms)', () => {
    const p = createRouteProgressStarter()
    p.start(1)
    vi.advanceTimersByTime(250)
    expect(p.getSnapshot()).toMatchObject({ phase: 'pending', visible: true })
    vi.advanceTimersByTime(50)
    p.done(1)
    expect(p.getSnapshot()).toMatchObject({ phase: 'done', visible: true, value: 100 })
    vi.advanceTimersByTime(249)
    expect(p.getSnapshot().visible).toBe(true)
    vi.advanceTimersByTime(1)
    expect(p.getSnapshot()).toMatchObject({ phase: 'idle', visible: false })
  })

  it('已显示超过 minVisible 后才完成：仍保留 completeHold(220ms) 让 100% 冲刺动画播完再消失', () => {
    const p = createRouteProgressStarter()
    p.start(1)
    vi.advanceTimersByTime(250 + 800)
    expect(p.getSnapshot().visible).toBe(true)
    p.done(1)
    expect(p.getSnapshot()).toMatchObject({ phase: 'done', visible: true, value: 100 })
    vi.advanceTimersByTime(219)
    expect(p.getSnapshot().visible).toBe(true)
    vi.advanceTimersByTime(1)
    expect(p.getSnapshot()).toMatchObject({ phase: 'idle', visible: false })
  })

  it('停留期内新 start 保持可见、重置进度并跳过 showDelay', () => {
    const p = createRouteProgressStarter()
    p.start(1)
    vi.advanceTimersByTime(250)
    vi.advanceTimersByTime(600)
    p.done(1)
    p.start(2)
    expect(p.getSnapshot()).toMatchObject({ phase: 'pending', visible: true, value: 12 })
    vi.advanceTimersByTime(1000)
    // 旧的隐藏定时器已取消
    expect(p.getSnapshot().visible).toBe(true)
  })

  it('fail 在 showDelay(250ms) 内：不显示，相位为 error，下次 start 复位', () => {
    const p = createRouteProgressStarter()
    p.start(1)
    vi.advanceTimersByTime(100)
    p.fail(1, new Error('x'))
    vi.advanceTimersByTime(1000)
    expect(p.getSnapshot()).toEqual({ phase: 'error', visible: false, value: 0 })
    p.start(2)
    expect(p.getSnapshot().phase).toBe('pending')
  })

  it('fail 在显示后：立即隐藏并停止 trickle', () => {
    const p = createRouteProgressStarter()
    p.start(1)
    vi.advanceTimersByTime(500)
    p.fail(1, new Error('x'))
    expect(p.getSnapshot()).toEqual({ phase: 'error', visible: false, value: 0 })
    const ref = p.getSnapshot()
    vi.advanceTimersByTime(2000)
    expect(p.getSnapshot()).toBe(ref)
  })

  it('trickle 采用先快后慢的非匀速渐近线算法且不超过 ceiling(90%)', () => {
    const p = createRouteProgressStarter()
    p.start(1)
    vi.advanceTimersByTime(250)
    const v0 = p.getSnapshot().value
    vi.advanceTimersByTime(200)
    const v1 = p.getSnapshot().value
    vi.advanceTimersByTime(200)
    const v2 = p.getSnapshot().value
    // 前段步幅大于后段步幅（先快后慢）
    expect(v1 - v0).toBeGreaterThan(v2 - v1)
    vi.advanceTimersByTime(200 * 200)
    const { value } = p.getSnapshot()
    expect(value).toBeGreaterThan(75)
    expect(value).toBeLessThanOrEqual(90)
  })

  it('旧导航的 done/fail 在新 start 之后失效', () => {
    const p = createRouteProgressStarter()
    p.start(1)
    p.start(2)
    vi.advanceTimersByTime(250)
    p.done(1)
    p.fail(1, new Error('stale'))
    expect(p.getSnapshot()).toMatchObject({ phase: 'pending', visible: true })
    p.done(2)
    expect(p.getSnapshot().phase).toBe('done')
  })

  it('getSnapshot 仅在状态变更时替换引用', () => {
    const p = createRouteProgressStarter()
    const a = p.getSnapshot()
    expect(p.getSnapshot()).toBe(a)
    p.start(1)
    const b = p.getSnapshot()
    expect(b).not.toBe(a)
    expect(p.getSnapshot()).toBe(b)
  })

  it('取消订阅后不再通知', () => {
    const p = createRouteProgressStarter()
    const fn = vi.fn<() => void>()
    const off = p.subscribe(fn)
    p.start(1)
    const calls = fn.mock.calls.length
    off()
    vi.advanceTimersByTime(1000)
    p.done(1)
    expect(fn.mock.calls.length).toBe(calls)
  })

  it('define* 插件可组合扩展：注入自定义时钟与阈值', () => {
    let t = 0
    const timers = new Map<number, { at: number; fn: () => void }>()
    let id = 0
    const clock = {
      now: () => t,
      setTimeout: (fn: () => void, ms: number) => {
        timers.set(++id, { at: t + ms, fn })
        return id
      },
      clearTimeout: (h: unknown) => void timers.delete(h as number)
    }
    const { progress } = defineRouteClock(clock)
      .use(defineRouteTrickle({ initial: 20 }))
      .use(defineRouteProgressCore({ showDelay: 10, minVisible: 0, completeHold: 0 }))
      .make()
    progress.start('a')
    t = 10
    for (const [k, v] of Array.from(timers)) {
      if (v.at > t) continue
      timers.delete(k)
      v.fn()
    }
    expect(progress.getSnapshot()).toMatchObject({ visible: true, value: 20 })
  })

  it('createDelayedVisibility 通用延迟显隐：250ms 内不显示，显示后至少停留 300ms', () => {
    const v = createDelayedVisibility()
    v.start('req-1')
    vi.advanceTimersByTime(249)
    expect(v.getSnapshot().visible).toBe(false)
    v.done('req-1')
    vi.advanceTimersByTime(500)
    expect(v.getSnapshot().visible).toBe(false)

    v.start('req-2')
    vi.advanceTimersByTime(250)
    expect(v.getSnapshot().visible).toBe(true)
    v.done('req-2')
    vi.advanceTimersByTime(299)
    expect(v.getSnapshot().visible).toBe(true)
    vi.advanceTimersByTime(1)
    expect(v.getSnapshot().visible).toBe(false)
  })
})
