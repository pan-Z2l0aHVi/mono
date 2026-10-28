import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { drainResizeObserver, pollUntil, waitForAnimationsToFinish, waitForSettledLayout } from '..'

let frames: Map<number, FrameRequestCallback>
let deliverResize: (() => void) | undefined
let disconnect: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
  frames = new Map()
  deliverResize = undefined
  let frameId = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback)
    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  disconnect = vi.fn<() => void>()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        deliverResize = callback
      }
      observe() {}
      disconnect = disconnect
    }
  )
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

async function render() {
  const ready = frames
  frames = new Map()
  for (const callback of ready.values()) {
    callback(performance.now())
  }
  await vi.advanceTimersByTimeAsync(1)
}

function box(animations: Animation[] = []) {
  const element = document.createElement('div')
  Object.assign(element, { getAnimations: () => animations })
  document.body.append(element)
  return element
}

describe('settle 的失败预算与清理', () => {
  it('RO 没有投递时失败，不能把 deadline 当作完成', async () => {
    let outcome = 'pending'
    void drainResizeObserver([box()]).then(
      () => {
        outcome = 'success'
      },
      error => {
        outcome = error.message
      }
    )
    await vi.advanceTimersByTimeAsync(5001)
    expect(outcome).toContain('ResizeObserver')
    expect(disconnect).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
    expect(frames.size).toBe(0)
  })

  it('RO 成功后释放 watchdog 与帧回调', async () => {
    const waiting = drainResizeObserver([box()])
    deliverResize!()
    // RO promise 的 continuation 排下一渲染步进后，由测试显式投递该帧。
    await Promise.resolve()
    await render()
    await waiting
    expect(disconnect).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
    expect(frames.size).toBe(0)
  })

  it('渲染帧缺失时动画等待返回 false，并取消未投递的帧', async () => {
    let outcome: boolean | 'pending' = 'pending'
    void waitForAnimationsToFinish(box()).then(value => {
      outcome = value
    })
    await vi.advanceTimersByTimeAsync(5001)
    expect(outcome).toBe(false)
    expect(frames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('渲染帧缺失时 poll 带最后读数失败', async () => {
    let outcome = 'pending'
    void pollUntil(
      () => false,
      () => 'target remains closed'
    ).catch(error => {
      outcome = error.message
    })
    await vi.advanceTimersByTimeAsync(5001)
    expect(outcome).toContain('target remains closed')
    expect(frames.size).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('期待阶段消耗的时间不会在 RO 阶段重新发放', async () => {
    let ready = false
    let outcome = 'pending'
    void waitForSettledLayout([box()], { expect: { check: () => ready } }).catch(error => {
      outcome = error.message
    })
    await vi.advanceTimersByTimeAsync(4800)
    ready = true
    await render()
    await render()
    await render()
    expect(deliverResize).toBeTypeOf('function')
    await vi.advanceTimersByTimeAsync(200)
    expect(outcome).toContain('stage=resize-observer')
    expect(vi.getTimerCount()).toBe(0)
    expect(frames.size).toBe(0)
  })

  it('等待期间断连不能把零矩形当作已定版', async () => {
    const target = box()
    let outcome = 'pending'
    void waitForSettledLayout([target], { expect: { check: () => target.isConnected } }).catch(error => {
      outcome = error.message
    })
    target.remove()
    await render()
    expect(outcome).toContain('disconnected')
    expect(vi.getTimerCount()).toBe(0)
    expect(frames.size).toBe(0)
  })

  it('收尾期间期待值失效时继续等待，不能只凭矩形稳定成功', async () => {
    let ready = true
    let settled = false
    const waiting = waitForSettledLayout([box()], { expect: { check: () => ready } }).then(() => {
      settled = true
    })
    await render()
    await render()
    expect(deliverResize).toBeTypeOf('function')
    deliverResize!()
    ready = false
    await render()
    await render()
    await render()
    expect(settled).toBe(false)
    ready = true
    await render()
    await render()
    await render()
    await waiting
    expect(settled).toBe(true)
  })

  it('已 finished 但仍保留填充效果的动画不阻塞完成', async () => {
    const finished = { playState: 'finished', finished: Promise.resolve() } as unknown as Animation
    let outcome: boolean | 'pending' = 'pending'
    void waitForAnimationsToFinish(box([finished])).then(value => {
      outcome = value
    })
    await render()
    await render()
    expect(outcome).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    expect(frames.size).toBe(0)
  })
})
