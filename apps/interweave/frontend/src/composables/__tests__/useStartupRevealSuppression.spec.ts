// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { effectScope, nextTick, ref } from 'vue'

import { dismissStartupLayer, STARTUP_TIMEOUT_MS } from '../startupLayer'
import { SUPPRESSION_DEADLINE_MS, useStartupRevealSuppression } from '../useStartupRevealSuppression'

function mountLayer() {
  const layer = document.createElement('div')
  layer.id = 'startup-layer'
  document.body.append(layer)
  return layer
}

/*
 * composable 的撤层与摘压制都在 rAF 里执行（真实语义：等 appearance attr 落 DOM 的
 * 一帧）。jsdom 下用可手动 flush 的桩替代，把「rAF 前压制仍生效、rAF 后解除」变成
 * 确定性的两步操作，不依赖定时器对齐。
 */
function stubRaf() {
  const queue: Array<() => void> = []
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      queue.push(() => callback(0))
      return queue.length
    })
  )
  return {
    flush: () => {
      for (const run of queue.splice(0)) run()
    }
  }
}

describe('useStartupRevealSuppression', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    document.getElementById('startup-layer')?.remove()
  })

  it('成功路径：loaded 后下一帧撤层并解除压制，首次快照仍被压制', async () => {
    const layer = mountLayer()
    const { flush } = stubRaf()
    const loaded = ref(false)
    const scope = effectScope()
    const { suppressed } = scope.run(() => useStartupRevealSuppression(() => loaded.value))!
    expect(suppressed.value).toBe(true)

    loaded.value = true
    await nextTick()
    // rAF 之前：appearance attr 已在本次 flush 落 DOM，压制仍生效。
    expect(suppressed.value).toBe(true)

    flush()
    expect(suppressed.value).toBe(false)
    expect(layer.dataset.leaving).toBe('true')
    scope.stop()
  })

  it('失败路径：超时撤层后经截止解除，压制不常驻', async () => {
    const layer = mountLayer()
    stubRaf()
    const loaded = ref(false)
    const scope = effectScope()
    const { suppressed } = scope.run(() => useStartupRevealSuppression(() => loaded.value))!

    vi.advanceTimersByTime(STARTUP_TIMEOUT_MS)
    expect(layer.dataset.leaving).toBe('true')
    expect(suppressed.value).toBe(true)

    vi.advanceTimersByTime(SUPPRESSION_DEADLINE_MS)
    expect(suppressed.value).toBe(false)
    scope.stop()
  })

  it('撤层后窗口内事件快照：压制保持并提前走撤层路径解除', async () => {
    const layer = mountLayer()
    const { flush } = stubRaf()
    const loaded = ref(false)
    const scope = effectScope()
    const { suppressed } = scope.run(() => useStartupRevealSuppression(() => loaded.value))!

    vi.advanceTimersByTime(STARTUP_TIMEOUT_MS)
    expect(layer.dataset.leaving).toBe('true')
    expect(suppressed.value).toBe(true)

    loaded.value = true
    await nextTick()
    flush()
    expect(suppressed.value).toBe(false)
    // 截止定时器已随解除一并清掉：继续推进不再有副作用。
    vi.advanceTimersByTime(SUPPRESSION_DEADLINE_MS)
    expect(suppressed.value).toBe(false)
    scope.stop()
  })

  it('慢成功（快照晚于撤层、早于截止）：首次提交仍被压制', async () => {
    mountLayer()
    const { flush } = stubRaf()
    const loaded = ref(false)
    const scope = effectScope()
    const { suppressed } = scope.run(() => useStartupRevealSuppression(() => loaded.value))!

    vi.advanceTimersByTime(STARTUP_TIMEOUT_MS + 100)
    expect(suppressed.value).toBe(true)

    loaded.value = true
    await nextTick()
    expect(suppressed.value).toBe(true)
    flush()
    expect(suppressed.value).toBe(false)
    scope.stop()
  })

  it('截止后快照：压制已解除（显式接受的残余风险的预期行为）', async () => {
    mountLayer()
    const { flush } = stubRaf()
    const loaded = ref(false)
    const scope = effectScope()
    const { suppressed } = scope.run(() => useStartupRevealSuppression(() => loaded.value))!

    vi.advanceTimersByTime(STARTUP_TIMEOUT_MS + SUPPRESSION_DEADLINE_MS)
    expect(suppressed.value).toBe(false)

    loaded.value = true
    await nextTick()
    flush()
    expect(suppressed.value).toBe(false)
    scope.stop()
  })

  it('连接时启动层已不存在则不布防；淡出中重挂载仍布防并依赖截止兜底', async () => {
    stubRaf()
    // 层不存在：无首帧可遮，压制无意义，后续 loaded 也不该把它拉回来。
    const absent = ref(false)
    const absentScope = effectScope()
    const absentSuppression = absentScope.run(() => useStartupRevealSuppression(() => absent.value))!
    expect(absentSuppression.suppressed.value).toBe(false)

    absent.value = true
    await nextTick()
    vi.advanceTimersByTime(STARTUP_TIMEOUT_MS + SUPPRESSION_DEADLINE_MS)
    expect(absentSuppression.suppressed.value).toBe(false)
    absentScope.stop()

    // 淡出中重挂载（data-leaving，节点仍在 DOM）：防呆不命中，照常布防，
    // loaded 已 true、watch 永不触发——依赖 3s 撤层 + 2s 截止兜底解除。
    const layer = mountLayer()
    expect(dismissStartupLayer()).toBe(true)
    const leaving = ref(false)
    const leavingScope = effectScope()
    const leavingSuppression = leavingScope.run(() => useStartupRevealSuppression(() => leaving.value))!
    expect(leavingSuppression.suppressed.value).toBe(true)

    vi.advanceTimersByTime(STARTUP_TIMEOUT_MS + SUPPRESSION_DEADLINE_MS)
    expect(leavingSuppression.suppressed.value).toBe(false)
    expect(layer.isConnected).toBe(false)
    leavingScope.stop()
  })
})
