import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'

import { defineHistoryNav, type HistoryNav } from '..'

const NS = 'history-nav-test'

function waitPopstate() {
  return new Promise<void>(resolve => {
    window.addEventListener('popstate', () => resolve(), { once: true })
  })
}

function waitHashchange() {
  return new Promise<void>(resolve => {
    window.addEventListener('hashchange', () => resolve(), { once: true })
  })
}

describe('history-nav 测试', () => {
  let nav: HistoryNav

  beforeEach(() => {
    nav?.dispose()
    // 回到无 hash 的基准 URL，否则上一个用例的历史残留会污染下一个用例的条目数
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    sessionStorage.clear()
    nav = defineHistoryNav({ namespace: NS })
  })

  afterEach(() => {
    nav?.dispose()
  })

  it('初始栈只有一个当前条目且双向都不可走', () => {
    expect(nav.canGoBack).toBe(false)
    expect(nav.canGoForward).toBe(false)
    expect(nav.entries()).toHaveLength(1)
    expect(nav.currentEntry?.url).toBe(window.location.href)
    expect(nav.currentEntry?.index).toBe(0)
  })

  it('push 后可后退，back 到栈底后 canGoBack 归零、canGoForward 置起', async () => {
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

  it('forward 回到前进方向', async () => {
    window.history.pushState({}, '', '#/f1')

    const back = waitPopstate()
    window.history.back()
    await back
    expect(nav.canGoForward).toBe(true)

    const forward = waitPopstate()
    window.history.forward()
    await forward
    expect(nav.currentEntry?.url).toContain('#/f1')
    expect(nav.canGoForward).toBe(false)
  })

  it('重复 push 同一 URL 仍产生独立 entry', () => {
    // 真实场景是「连点两次同一个 tab」：按 URL 判重会让第二次点击无法后退回去
    window.history.pushState({}, '', '#/dup')
    window.history.pushState({}, '', '#/dup')
    const entries = nav.entries()

    expect(entries).toHaveLength(3)
    expect(entries[1].url).toBe(entries[2].url)
    expect(nav.canGoBack).toBe(true)
  })

  it('replaceState 不新增条目，state 被替换', () => {
    window.history.pushState({ v: 1 }, '', '#/r1')
    const before = nav.currentEntry

    window.history.replaceState({ v: 2 }, '', '#/r2')

    expect(nav.entries()).toHaveLength(2)
    expect(nav.currentEntry?.url).toContain('#/r2')
    expect(nav.currentEntry?.getState()).toEqual({ v: 2 })
    expect(nav.currentEntry?.id).toBe(before?.id)
  })

  it('currententrychange 携带来源与导航类型', async () => {
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

  it('地址栏直接改 hash 同样被识别为新条目', async () => {
    const popped = waitPopstate()
    window.location.hash = '#/typed'
    await popped

    // 用户从外部链接跳进来时走的就是这条路径，不该与程序化 push 有差别
    expect(nav.entries()).toHaveLength(2)
    expect(nav.currentEntry?.url).toContain('#/typed')
    expect(nav.canGoBack).toBe(true)
  })

  it('一次 fragment 导航只派发一条 currententrychange', async () => {
    // 规范引擎一次跳转同时派发 popstate 与 hashchange：不去重就会重复上报两次
    const changes: string[] = []
    nav.onCurrentEntryChange(e => changes.push(e.navigationType))

    const first = waitHashchange()
    window.location.hash = '#/h1'
    await first
    expect(nav.currentEntry?.url).toContain('#/h1')

    const second = waitHashchange()
    window.location.hash = '#/h2'
    await second

    expect(nav.entries()).toHaveLength(3)
    expect(changes).toEqual(['push', 'push'])
  })

  it('dispose 后重新实例化从 sessionStorage 恢复整条栈', () => {
    window.history.pushState({}, '', '#/p1')
    window.history.pushState({}, '', '#/p2')

    nav.dispose()
    const nav2 = defineHistoryNav({ namespace: NS })

    // 刷新页面后用户仍要能后退回原页面；恢复失败等于刷新即丢历史
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

    // 不还原就会在多次挂载后叠一层层包装，事件重复派发且无法卸载
    nav.dispose()
    expect(window.history.pushState).toBe(originalPush)
    expect(window.history.replaceState).toBe(originalReplace)
  })

  it('单例：忽略 namespace，重复定义返回同一实例', () => {
    expect(defineHistoryNav({ namespace: 'other' })).toBe(nav)
    expect(defineHistoryNav()).toBe(nav)
  })
})
