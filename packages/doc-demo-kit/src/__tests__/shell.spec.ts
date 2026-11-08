// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { MOBILE_SIDEBAR_WIDTH, createShellState, isOwnLayoutEvent, type ShellStateSnapshot } from '../shell'
import {
  DEFAULT_SIDEBAR_WIDTH_PX,
  SIDEBAR_WIDTH_STORAGE_KEY,
  THEME_APPEARANCE_STORAGE_KEY,
  THEME_MOTION_STORAGE_KEY
} from '../theme'

function layoutHost() {
  const host = document.createElement('web-ui-layout')
  document.body.append(host)
  return host
}

beforeEach(() => {
  // 落盘键在本文件内共享一份 jsdom Storage；每个用例从干净状态起算。
  localStorage.clear()
})

/**
 * 复刻真实接线：宿主挂 handler，事件由宿主（own）或示例子树（bubbled）派发，
 * `applyLayoutEvent` 在 dispatch 过程中被调——那时 `currentTarget` 才有值。
 */
function dispatchLayoutEvent(state: ReturnType<typeof createShellState>, event: Event, from?: Element) {
  const host = layoutHost()
  host.append(document.createElement('div'))
  host.addEventListener(event.type, e => state.applyLayoutEvent(e))
  ;(from ?? host).dispatchEvent(event)
}

function collapsedEvent(detail: { collapsed: boolean }) {
  return new CustomEvent('sidebar-collapsed-change', { detail, bubbles: true })
}

function openEvent(detail: { open: boolean }) {
  return new CustomEvent('sidebar-open-change', { detail, bubbles: true })
}

function widthEvent(detail: { width: string }) {
  return new CustomEvent('sidebar-width-change', { detail, bubbles: true })
}

describe('shell 状态机：持久化', () => {
  it('appearance / motion / width 提交时经 browser-kit 的 local 落盘，重建后读回', () => {
    const first = createShellState()
    first.setAppearance('dark')
    first.setMotion('reduced')
    first.setSidebarWidth('320px')
    expect(first.getSnapshot()).toMatchObject({ appearance: 'dark', motion: 'reduced', sidebarWidth: '320px' })

    const second = createShellState()
    expect(second.getSnapshot()).toMatchObject({ appearance: 'dark', motion: 'reduced', sidebarWidth: '320px' })
  })

  it('读取兼容 React 旧版的 JSON 字串编码，提交后改写为统一编码', () => {
    localStorage.setItem(THEME_APPEARANCE_STORAGE_KEY, JSON.stringify('dark'))
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, JSON.stringify('280px'))
    const state = createShellState()
    expect(state.getSnapshot()).toMatchObject({ appearance: 'dark', sidebarWidth: '280px' })

    state.setAppearance('light')
    expect(state.getSnapshot().appearance).toBe('light')
    expect(createShellState().getSnapshot().appearance).toBe('light')
  })

  it('损坏的落盘数据退回默认值', () => {
    localStorage.setItem(THEME_APPEARANCE_STORAGE_KEY, 'not-json{{')
    expect(createShellState().getSnapshot().appearance).toBe('light')
    expect(createShellState().getSnapshot().sidebarWidth).toBe(DEFAULT_SIDEBAR_WIDTH_PX)
  })

  it('collapsed / open / mobile 是会话态，不落盘', () => {
    const state = createShellState()
    state.setSidebarCollapsed(true)
    state.setSidebarOpen(true)
    state.setMobile(true)
    expect(createShellState().getSnapshot()).toMatchObject({ sidebarCollapsed: false, sidebarOpen: false })
  })
})

describe('shell 状态机：校验', () => {
  it('非法 appearance / motion / width 静默忽略，不落盘', () => {
    const state = createShellState()
    state.setAppearance('Light')
    state.setMotion('none')
    state.setSidebarWidth('240')
    expect(state.getSnapshot()).toMatchObject({
      appearance: 'light',
      motion: 'system',
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH_PX
    })
    expect(localStorage.getItem(THEME_APPEARANCE_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(THEME_MOTION_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY)).toBeNull()
  })
})

describe('shell 状态机：layout 事件过滤与分发', () => {
  it('只采信自己这一层的冒泡：示例子树冒上来的事件被忽略', () => {
    const state = createShellState()
    const host = layoutHost()
    const demoElement = document.createElement('div')
    host.append(demoElement)

    // 冒泡事件：target 是示例元素，过滤掉了。
    let seenOwn = false
    host.addEventListener('sidebar-collapsed-change', event => {
      seenOwn = isOwnLayoutEvent(event)
    })
    demoElement.dispatchEvent(collapsedEvent({ collapsed: true }))
    expect(seenOwn).toBe(false)

    dispatchLayoutEvent(state, collapsedEvent({ collapsed: true }), demoElement)
    expect(state.getSnapshot().sidebarCollapsed).toBe(false)

    // 自己这一层派发：采信。
    dispatchLayoutEvent(state, collapsedEvent({ collapsed: true }))
    expect(state.getSnapshot().sidebarCollapsed).toBe(true)
  })

  it('三个 sidebar 事件分别提交 collapsed / open / width，width 落盘', () => {
    const state = createShellState()
    dispatchLayoutEvent(state, collapsedEvent({ collapsed: true }))
    dispatchLayoutEvent(state, openEvent({ open: true }))
    dispatchLayoutEvent(state, widthEvent({ width: '360px' }))
    expect(state.getSnapshot()).toMatchObject({ sidebarCollapsed: true, sidebarOpen: true, sidebarWidth: '360px' })
    expect(createShellState().getSnapshot().sidebarWidth).toBe('360px')
  })
})

describe('shell 状态机：mobile 派生', () => {
  it('navCollapsed = collapsed && !mobile；移动端宽度换 drawer 档', () => {
    const state = createShellState()
    state.setSidebarCollapsed(true)
    expect(state.getSnapshot().navCollapsed).toBe(true)
    expect(state.getSnapshot().sidebarWidth).toBe(DEFAULT_SIDEBAR_WIDTH_PX)

    state.setMobile(true)
    expect(state.getSnapshot()).toMatchObject({ navCollapsed: false, sidebarWidth: MOBILE_SIDEBAR_WIDTH })

    state.setMobile(false)
    expect(state.getSnapshot()).toMatchObject({ navCollapsed: true, sidebarWidth: DEFAULT_SIDEBAR_WIDTH_PX })
  })
})

describe('shell 状态机：订阅', () => {
  it('仅在状态真的变化时发布，快照引用随之更换', () => {
    const state = createShellState()
    const listener = vi.fn<(snapshot: ShellStateSnapshot) => void>()
    const unsubscribe = state.subscribe(() => listener(state.getSnapshot()))

    state.setSidebarOpen(false)
    expect(listener).not.toHaveBeenCalled()

    state.setSidebarOpen(true)
    expect(listener).toHaveBeenCalledTimes(1)
    const first = state.getSnapshot()
    state.setAppearance('dark')
    expect(listener).toHaveBeenCalledTimes(2)
    expect(state.getSnapshot()).not.toBe(first)

    unsubscribe()
    state.setAppearance('light')
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
