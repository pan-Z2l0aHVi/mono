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
  it.each([
    { renderSteps: 0, animationCount: 1, expectedEnumeration: null },
    {
      renderSteps: 1,
      animationCount: 14,
      expectedEnumeration: {
        enumeratedAt: expect.any(Number),
        diagnosticsCapturedAt: expect.any(Number),
        total: 14,
        included: 12,
        truncated: 2,
        animations: Array.from({ length: 12 }, (_, index) => ({
          playState: 'running',
          currentTime: String(index),
          startTime: '0',
          timelineTime: 'undefined',
          duration: 'undefined',
          endTime: 'undefined'
        }))
      }
    }
  ])(
    '已投递 $renderSteps 次渲染后缺帧，失败保留最近动画枚举',
    async ({ renderSteps, animationCount, expectedEnumeration }) => {
      const animations = Array.from(
        { length: animationCount },
        (_, index) =>
          ({
            playState: 'running',
            finished: new Promise<void>(() => {}),
            currentTime: index,
            startTime: 0,
            effect: null,
            timeline: null
          }) as unknown as Animation
      )
      let failure: unknown
      const waiting = waitForSettledLayout([box(animations)]).catch(error => {
        failure = error
      })
      if (renderSteps) await render()
      await vi.advanceTimersByTimeAsync(5001)
      await waiting
      expect(failure).toBeInstanceOf(Error)
      if (!(failure instanceof Error) || !('cause' in failure) || !(failure.cause instanceof Error)) {
        throw new Error('expected animation deadline failure with cause')
      }
      const diagnosticPrefix = 'animations did not settle: '
      expect(failure.cause.message).toContain(diagnosticPrefix)
      const diagnostic = JSON.parse(failure.cause.message.slice(diagnosticPrefix.length)) as unknown
      expect(diagnostic).toMatchObject({
        waitingFor: 'render-step',
        renderSteps,
        lastAnimationEnumeration: expectedEnumeration
      })
      expect(vi.getTimerCount()).toBe(0)
      expect(frames.size).toBe(0)
    }
  )

  it('诊断描述抛错时仍保留原始 RO 失败与 cause', async () => {
    const original = new Error('ResizeObserver observe failed')
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {
          throw original
        }
        disconnect = disconnect
      }
    )
    let failure: unknown
    const waiting = waitForSettledLayout([box()], {
      expect: {
        check: () => true,
        describe: () => {
          throw new Error('diagnostic unavailable')
        }
      }
    }).catch(error => {
      failure = error
    })
    await render()
    await render()
    await waiting
    expect(failure).toBeInstanceOf(Error)
    if (!(failure instanceof Error) || !('cause' in failure)) throw new Error('expected the RO failure with cause')
    expect(failure.message).toContain('ResizeObserver observe failed')
    expect(failure.message).toContain('stage=resize-observer')
    expect(failure.message).toContain('<describe failed>')
    expect(failure.cause).toBe(original)
    expect(disconnect).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
    expect(frames.size).toBe(0)
  })

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

  it('动画进入 finished 后不被尚未投递的完成 Promise 阻塞', async () => {
    let complete!: () => void
    const animation = {
      playState: 'running',
      finished: new Promise<void>(resolve => {
        complete = resolve
      })
    }
    let outcome: boolean | 'pending' = 'pending'
    const waiting = waitForAnimationsToFinish(box([animation as unknown as Animation])).then(value => {
      outcome = value
    })
    try {
      await render()
      animation.playState = 'finished'
      await render()
      await render()
      expect(outcome).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
      expect(frames.size).toBe(0)
    } finally {
      complete()
      await vi.advanceTimersByTimeAsync(5001)
      await waiting
    }
  })
})
