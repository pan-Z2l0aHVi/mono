import { describe, expect, it } from 'vite-plus/test'

import { defineOverlayLifecycle } from '../lifecycle'

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))

describe('overlay lifecycle transaction', () => {
  it('回调在当前 generation、连接和期望 open 状态下执行', async () => {
    const connected = true
    const open = true
    const lifecycle = defineOverlayLifecycle().make({
      isConnected: () => connected,
      isOpen: () => open
    })
    const received: number[] = []

    lifecycle.scheduleFrame(generation => received.push(generation), { expectedOpen: true })
    await nextFrame()

    expect(received).toEqual([lifecycle.getGeneration()])
  })

  it('cancel 立即移除 frame，多次 invalidate 保持 generation 单调', async () => {
    const lifecycle = defineOverlayLifecycle().make({
      isConnected: () => true,
      isOpen: () => true
    })
    const canceledRuns: number[] = []
    const activeRuns: number[] = []

    const canceled = lifecycle.scheduleFrame(generation => canceledRuns.push(generation))
    canceled.cancel()
    canceled.cancel()
    await nextFrame()

    const firstGeneration = lifecycle.getGeneration()
    lifecycle.scheduleFrame(generation => activeRuns.push(generation))
    lifecycle.invalidate()
    expect(lifecycle.getGeneration()).toBe(firstGeneration + 1)

    const secondGeneration = lifecycle.getGeneration()
    lifecycle.scheduleFrame(generation => activeRuns.push(generation))
    lifecycle.invalidate()
    expect(lifecycle.getGeneration()).toBe(secondGeneration + 1)

    const finalGeneration = lifecycle.getGeneration()
    lifecycle.scheduleFrame(generation => activeRuns.push(generation))
    await nextFrame()

    expect(canceledRuns).toEqual([])
    expect(activeRuns).toEqual([finalGeneration])
    expect(lifecycle.getGeneration()).toBe(finalGeneration)
  })

  it('generation 失效、断连和 open 状态不符时不执行回调', async () => {
    let connected = true
    let open = true
    const lifecycle = defineOverlayLifecycle().make({
      isConnected: () => connected,
      isOpen: () => open
    })
    let runs = 0

    lifecycle.scheduleFrame(
      () => {
        runs += 1
      },
      { expectedOpen: true }
    )
    lifecycle.invalidate()
    await nextFrame()
    expect(runs).toBe(0)

    lifecycle.scheduleFrame(
      () => {
        runs += 1
      },
      { expectedOpen: true }
    )
    connected = false
    await nextFrame()
    expect(runs).toBe(0)

    connected = true
    open = false
    lifecycle.scheduleFrame(
      () => {
        runs += 1
      },
      { expectedOpen: true }
    )
    await nextFrame()
    expect(runs).toBe(0)
  })

  it('dispose 取消未执行回调并拒绝后续调度', async () => {
    const lifecycle = defineOverlayLifecycle().make({
      isConnected: () => true,
      isOpen: () => true
    })
    let runs = 0

    lifecycle.scheduleFrame(
      () => {
        runs += 1
      },
      { expectedOpen: true }
    )
    lifecycle.dispose()
    await nextFrame()
    lifecycle.scheduleFrame(
      () => {
        runs += 1
      },
      { expectedOpen: true }
    )
    await nextFrame()

    expect(runs).toBe(0)
  })

  it('dispose 后 resume 可恢复 temporary disconnect 的组件调度', async () => {
    let connected = true
    const lifecycle = defineOverlayLifecycle().make({
      isConnected: () => connected,
      isOpen: () => true
    })
    let runs = 0
    const generationBeforeDispose = lifecycle.getGeneration()

    lifecycle.dispose()
    lifecycle.scheduleFrame(() => {
      runs += 1
    })
    connected = true
    await nextFrame()
    expect(runs).toBe(0)

    lifecycle.resume()
    const generationAfterResume = lifecycle.getGeneration()
    lifecycle.scheduleFrame(generation => {
      runs += 1
      expect(generation).toBe(generationAfterResume)
    })
    await nextFrame()

    expect(runs).toBe(1)
    expect(generationAfterResume).toBeGreaterThan(generationBeforeDispose)
  })
})
