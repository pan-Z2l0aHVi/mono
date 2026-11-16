// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { dismissStartupLayer, STARTUP_TIMEOUT_MS } from '../startupLayer'

function mountLayer() {
  const layer = document.createElement('div')
  layer.id = 'startup-layer'
  document.body.append(layer)
  return layer
}

describe('startup layer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    document.getElementById('startup-layer')?.remove()
  })

  it('先标记 data-leaving 再移除节点', () => {
    const layer = mountLayer()

    expect(dismissStartupLayer()).toBe(true)
    expect(layer.dataset.leaving).toBe('true')
    // 过渡期间节点仍在，否则淡出会被跳过、直接闪没。
    expect(document.getElementById('startup-layer')).not.toBeNull()

    vi.advanceTimersByTime(1000)
    expect(document.getElementById('startup-layer')).toBeNull()
  })

  // 幂等：设置就绪与超时兜底两条路都会调用，先到的生效，后到的不该重复操作 DOM。
  it('重复调用只生效一次', () => {
    mountLayer()
    expect(dismissStartupLayer()).toBe(true)
    expect(dismissStartupLayer()).toBe(false)
  })

  it('没有启动层时安全返回 false', () => {
    expect(dismissStartupLayer()).toBe(false)
  })

  // 超时上限是「读不到设置也不能把人永远挡在 logo 后面」的那条线，不能悄悄变短。
  it('超时上限为 3s', () => {
    expect(STARTUP_TIMEOUT_MS).toBe(3000)
  })
})
