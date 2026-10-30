import type { WebUiLayout } from '@greypan/web-ui'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { loadShellLocale } from '@/i18n/locale'

import { Root } from '..'

// collapsed 接线与文档初始化无关。真实 Provider 留在 browser 集成；本 fixture 固定 locale，
// 避免每次挂载额外启动 catalog/docs 请求，并在测试结束后继续更新 React。
vi.mock('@/i18n/locale', async importOriginal => {
  const actual = await importOriginal<typeof import('@/i18n/locale')>()
  return {
    ...actual,
    useLocale: () => ({ locale: 'zh-CN', pending: false, setLocale: async () => {} })
  }
})

// 必须与 `web-ui-layout` 的 `MOBILE_VIEWPORT_QUERY`（`components/layout/index.ts`）逐字相同：
// 断点判定由 layout 独占（ADR-0011）、app 不自持媒体查询，所以这个替身要驱动的是 layout 那条。
const MOBILE_QUERY = '(width <= 640px)'
const DESKTOP_WIDTH = 1280
const MOBILE_WIDTH = 568

function createMatchMediaStub() {
  const lists = new Map<string, { matches: boolean; listeners: Set<EventListener> }>()

  vi.stubGlobal('matchMedia', (query: string) => {
    const state = lists.get(query) ?? { matches: false, listeners: new Set<EventListener>() }
    lists.set(query, state)

    return {
      media: query,
      onchange: null,
      get matches() {
        return state.matches
      },
      addEventListener(type: string, listener: EventListener) {
        if (type === 'change') state.listeners.add(listener)
      },
      removeEventListener(type: string, listener: EventListener) {
        if (type === 'change') state.listeners.delete(listener)
      },
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false
    }
  })

  return (query: string, matches: boolean) => {
    const state = lists.get(query)
    if (!state) throw new Error(`matchMedia(${query}) was never queried`)

    state.matches = matches
    // 宿主的 change 处理器读的是事件载荷上的 `matches`，两个来源一起改。
    const event = new Event('change')
    Object.defineProperty(event, 'matches', { value: matches })
    for (const listener of state.listeners) listener(event)
  }
}

function layoutRoot() {
  const element = document.querySelector('web-ui-layout') as
    | (HTMLElement & WebUiLayout & { updateComplete: Promise<unknown> })
    | null
  if (!element) throw new Error('web-ui-layout not found')
  return element
}

function navRoot() {
  const element = document.querySelector('[slot="sidebar"]')
  if (!element) throw new Error('sidebar nav not found')
  return element
}

/**
 * collapsed state 在这个 demo 里只体现为排版——桌面 collapse 与移动 drawer 渲染的是同一份 slot 内容，
 * 「导航项最终带上哪一套工具类」就是它唯一的观察点，jsdom 里也没有布局可读。
 * 判据因此不写死类名：由同一个组件在两种状态下的渲染互相比较得出。
 */
function navItemClasses() {
  const link = navRoot().querySelector('a')
  if (!link) throw new Error('nav link not found')
  return [...link.classList].sort()
}

/** 移动端 drawer 是否真的接管了 sidebar slot（不接管就谈不上「drawer 里的导航」）。 */
function isDrawerMode() {
  return layoutRoot().mobile
}

/**
 * layout 的 mobile 判定挂在一条去抖的 resize 上，所以等的是「布局真的换了形态」而不是一段
 * 固定时长：既不赌去抖的毫秒数，也不去读 layout 的内部实现。
 */
async function settleViewport(drawerMode: boolean) {
  await waitFor(() => {
    if (isDrawerMode() !== drawerMode) throw new Error(`drawer 形态没有变成 ${drawerMode}`)
  })
  await act(async () => {
    await layoutRoot().updateComplete
  })
}

async function changeViewport(width: number, mobile: boolean) {
  await act(async () => {
    setViewportWidth(width)
    setMediaMatches(MOBILE_QUERY, mobile)
    await layoutRoot().updateComplete
  })
  await settleViewport(mobile)
}

function buildRouter() {
  const rootRoute = createRootRoute({ component: Root })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null
  })

  return createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] })
  })
}

let innerWidthSpy: { mockReturnValue: (value: number) => unknown } | null = null

function setViewportWidth(width: number) {
  innerWidthSpy ??= vi.spyOn(window, 'innerWidth', 'get')
  innerWidthSpy.mockReturnValue(width)
  window.dispatchEvent(new Event('resize'))
}

async function mountAppShell(mark: (stage: string) => void = () => {}) {
  // 固定到中文源语种，避免 Provider 挂载后再异步换一次壳文案。
  localStorage.setItem('locale', 'zh-CN')
  mark('load locale')
  await loadShellLocale('zh-CN')
  mark('render shell')
  const router = buildRouter()
  render(<RouterProvider router={router} />)
  mark('wait for layout')
  await waitFor(() => {
    if (!document.querySelector('web-ui-layout')) throw new Error('layout not mounted')
  })
  mark('wait for layout update')
  await act(async () => {
    await layoutRoot().updateComplete
  })
  mark('layout ready')
}

/** 复刻 layout 侧边栏 Toggle 的请求链路：layout 只派发请求，宿主回写受控属性。 */
async function requestCollapse(collapsed: boolean) {
  await act(async () => {
    layoutRoot().dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: { collapsed } }))
  })
  await act(async () => {
    await layoutRoot().updateComplete
  })
}

let setMediaMatches: (query: string, matches: boolean) => void

describe('应用外壳：导航 collapsed state 不跨视口泄漏', () => {
  beforeEach(() => {
    setMediaMatches = createMatchMediaStub()
  })

  afterEach(() => {
    cleanup()
    // locale 是本应用的持久化输入；留在 origin 上会污染同 origin 的其他 spec。
    localStorage.removeItem('locale')
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    innerWidthSpy = null
  })

  it('桌面端 collapsible sidebar 后导航进入 collapsed state', async ({ onTestFailed }) => {
    const started = performance.now()
    const stages: string[] = []
    const mark = (stage: string) => stages.push(`${stage}: ${Math.round(performance.now() - started)}ms`)
    onTestFailed(() => console.error(`sidebar test stages: ${stages.join(', ')}`))
    setViewportWidth(DESKTOP_WIDTH)
    await mountAppShell(mark)
    const expanded = navItemClasses()

    mark('request collapse')
    await requestCollapse(true)
    mark('collapse complete')

    expect(isDrawerMode()).toBe(false)
    expect(layoutRoot().sidebarCollapsed).toBe(true)
    expect(navItemClasses()).not.toEqual(expanded)
  })

  it('移动端断点下同一个 collapse preference 不把 drawer 导航压成 collapsed state', async () => {
    setViewportWidth(DESKTOP_WIDTH)
    await mountAppShell()
    const expanded = navItemClasses()

    await requestCollapse(true)
    // 对照：collapse preference 确实改变了导航项的渲染，否则下面那条「与展开态一致」可能只是因为
    // collapse 从未生效。
    expect(navItemClasses()).not.toEqual(expanded)

    await changeViewport(MOBILE_WIDTH, true)

    // 前提：collapse preference 仍写在 layout 上。不成立的话下面那条「与展开态一致」只是没 collapse 过的假绿
    // （drawer 形态由 settleViewport 保证，不另设断言）。
    expect(layoutRoot().sidebarCollapsed).toBe(true)
    expect(navItemClasses()).toEqual(expanded)
  })

  it('跨断点往返后 collapsed state 在桌面端恢复生效', async () => {
    setViewportWidth(DESKTOP_WIDTH)
    await mountAppShell()
    const expanded = navItemClasses()

    await requestCollapse(true)
    const collapsed = navItemClasses()

    await changeViewport(MOBILE_WIDTH, true)
    expect(navItemClasses()).toEqual(expanded)

    await changeViewport(DESKTOP_WIDTH, false)

    expect(navItemClasses()).toEqual(collapsed)
  })
})
