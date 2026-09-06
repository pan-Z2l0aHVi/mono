import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'

import { defineHistoryNav, type HistoryNav } from '..'

const NS = 'history-nav-test'

function waitPopstate() {
  return new Promise<void>(resolve => {
    window.addEventListener('popstate', () => resolve(), { once: true })
  })
}

describe('history-nav 测试', () => {
  let nav: HistoryNav

  beforeEach(() => {
    nav?.dispose()
    // 回到无 hash 的基准 URL，避免上一个用例的历史残留影响断言。
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    sessionStorage.clear()
    nav = defineHistoryNav({ namespace: NS })
  })

  afterEach(() => {
    nav?.dispose()
  })

  it('初始栈：仅当前 URL，双禁用，entry 形状对齐', () => {
    expect(nav.canGoBack).toBe(false)
    expect(nav.canGoForward).toBe(false)
    expect(nav.entries()).toHaveLength(1)
    expect(nav.currentEntry?.url).toBe(window.location.href)
    expect(nav.currentEntry?.sameDocument).toBe(true)
    expect(nav.currentEntry?.index).toBe(0)
    expect(nav.currentEntry?.id).toBeTruthy()
    expect(nav.currentEntry?.key).toBeTruthy()
  })

  it('pushState 后可后退，back/forward 同步可用性', async () => {
    window.history.pushState({}, '', '#/a')
    expect(nav.canGoBack).toBe(true)
    expect(nav.canGoForward).toBe(false)
    expect(nav.currentEntry?.url).toContain('#/a')

    window.history.pushState({}, '', '#/b')
    expect(nav.entries()).toHaveLength(3)

    const back1 = waitPopstate()
    window.history.back()
    await back1
    expect(nav.currentEntry?.url).toContain('#/a')
    expect(nav.canGoBack).toBe(true)
    expect(nav.canGoForward).toBe(true)

    const back2 = waitPopstate()
    window.history.back()
    await back2
    expect(nav.currentEntry?.url).toBe(window.location.href)
    expect(nav.canGoBack).toBe(false)
    expect(nav.canGoForward).toBe(true)
  })

  it('相同 URL 连续 push 仍产生独立 entry（id/key 区分）', () => {
    window.history.pushState({}, '', '#/dup')
    window.history.pushState({}, '', '#/dup')
    const entries = nav.entries()
    expect(entries).toHaveLength(3)
    expect(entries[1].url).toBe(entries[2].url)
    expect(entries[1].id).not.toBe(entries[2].id)
    expect(entries[1].key).not.toBe(entries[2].key)
    expect(nav.canGoBack).toBe(true)
  })

  it('replaceState 不新增 entry，key 保持，url 更新', () => {
    window.history.pushState({ v: 1 }, '', '#/r1')
    const before = nav.currentEntry
    window.history.replaceState({ v: 2 }, '', '#/r2')
    expect(nav.entries()).toHaveLength(2)
    expect(nav.currentEntry?.url).toContain('#/r2')
    expect(nav.currentEntry?.id).toBe(before?.id)
    expect(nav.currentEntry?.key).toBe(before?.key)
    expect(nav.currentEntry?.getState()).toEqual({ v: 2 })
  })

  it('currententrychange 事件携带 from 与 navigationType', async () => {
    const events: Array<{ type: string; fromUrl: string | null }> = []
    nav.onCurrentEntryChange(e => {
      events.push({ type: e.navigationType, fromUrl: e.from?.url ?? null })
    })

    window.history.pushState({}, '', '#/e1')
    expect(events[0]).toEqual({ type: 'push', fromUrl: nav.entries()[0].url })

    window.history.replaceState({}, '', '#/e2')
    expect(events[1].type).toBe('replace')
    expect(events[1].fromUrl).toContain('#/e1')

    const popped = waitPopstate()
    window.history.back()
    await popped
    expect(events[2].type).toBe('traverse')
    expect(events[2].fromUrl).toContain('#/e2')
  })

  it('hash 直接赋值（地址栏等价）识别为新条目', async () => {
    const popped = waitPopstate()
    window.location.hash = '#/typed'
    await popped
    expect(nav.entries()).toHaveLength(2)
    expect(nav.currentEntry?.url).toContain('#/typed')
    expect(nav.canGoBack).toBe(true)
  })

  it('dispose 后重新 defineHistoryNav 从 sessionStorage 恢复', () => {
    window.history.pushState({}, '', '#/p1')
    window.history.pushState({}, '', '#/p2')
    expect(nav.canGoBack).toBe(true)

    nav.dispose()
    const nav2 = defineHistoryNav({ namespace: NS })
    expect(nav2.entries()).toHaveLength(3)
    expect(nav2.currentEntry?.url).toContain('#/p2')
    expect(nav2.canGoBack).toBe(true)
    expect(nav2.canGoForward).toBe(false)
    nav2.dispose()
  })

  it('dispose 还原原生 history 方法', () => {
    nav.dispose()
    const originalPush = window.history.pushState
    const originalReplace = window.history.replaceState

    nav = defineHistoryNav({ namespace: NS })
    expect(window.history.pushState).not.toBe(originalPush)
    expect(window.history.replaceState).not.toBe(originalReplace)

    nav.dispose()
    expect(window.history.pushState).toBe(originalPush)
    expect(window.history.replaceState).toBe(originalReplace)
  })

  it('单例：相同 namespace 与不同 namespace 均返回同一实例', () => {
    expect(defineHistoryNav({ namespace: 'other' })).toBe(nav)
    expect(defineHistoryNav()).toBe(nav)
  })
})
