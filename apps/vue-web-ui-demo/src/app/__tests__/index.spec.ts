import type { WebUiLayout } from '@greypan/web-ui'
import { createHead } from '@unhead/vue/client'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { defineComponent, nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import AppShell from '../index.vue'

// 必须与 `web-ui-layout` 的 `MOBILE_VIEWPORT_QUERY`（`components/layout/index.ts`）逐字相同：
// 断点判定自 ADR-0023 起由 layout 独占、app 不再自持媒体查询，所以这个替身要驱动的是 layout 那条。
const MOBILE_QUERY = '(width <= 640px)'
const DESKTOP_WIDTH = 1280
const MOBILE_WIDTH = 568

const PageStub = defineComponent({ template: '<div data-testid="page" />' })

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
    // demo 侧只读 `mediaQuery.matches`、不看事件载荷，但两处一起改才不会留下只对一半的替身。
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
  const element = document.querySelector('[aria-label="应用导航"]')
  if (!element) throw new Error('sidebar nav not found')
  return element
}

/**
 * 折叠态在这个 demo 里只体现为排版——桌面折叠与移动抽屉渲染的是同一份 slot 内容，
 * 「导航项最终带上哪一套工具类」就是它唯一的观察点，jsdom 里也没有布局可读。
 * 判据因此不写死类名：由同一个组件在两种状态下的渲染互相比较得出。
 */
function navItemClasses() {
  const link = navRoot().querySelector('a')
  if (!link) throw new Error('nav link not found')
  return [...link.classList].sort()
}

/** 移动端抽屉是否真的接管了 sidebar slot（不接管就谈不上「抽屉里的导航」）。 */
function isDrawerMode() {
  return !!layoutRoot().shadowRoot?.querySelector('web-ui-drawer')
}

/**
 * layout 的 mobile 判定挂在一条去抖的 resize 上，所以等的是「布局真的换了形态」而不是一段
 * 固定时长：既不赌去抖的毫秒数，也不去读 layout 的内部实现。
 */
async function settleViewport(drawerMode: boolean) {
  await vi.waitFor(() => {
    if (isDrawerMode() !== drawerMode) throw new Error(`抽屉形态没有变成 ${drawerMode}`)
  })
  await nextTick()
  await layoutRoot().updateComplete
}

function buildRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', redirect: '/home' },
      { path: '/home', component: PageStub },
      { path: '/:pathMatch(.*)*', component: PageStub }
    ]
  })
}

let innerWidthSpy: { mockReturnValue: (value: number) => unknown } | null = null

function setViewportWidth(width: number) {
  innerWidthSpy ??= vi.spyOn(window, 'innerWidth', 'get')
  innerWidthSpy.mockReturnValue(width)
  window.dispatchEvent(new Event('resize'))
}

let wrapper: VueWrapper | null = null

async function mountAppShell() {
  const router = buildRouter()
  wrapper = mount(AppShell, {
    attachTo: document.body,
    global: { plugins: [router, createHead()] }
  })
  // memory history 的首次导航由 mount 触发，`isReady()` 只能在挂载之后等。
  await router.isReady()
  await nextTick()
  await layoutRoot().updateComplete
}

/** 复刻 layout 侧边栏 Toggle 的请求链路：layout 只派发请求，宿主回写受控属性。 */
async function requestCollapse(collapsed: boolean) {
  layoutRoot().dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: { collapsed } }))
  await nextTick()
  await layoutRoot().updateComplete
}

let setMediaMatches: (query: string, matches: boolean) => void

describe('应用外壳：导航折叠态不跨视口泄漏', () => {
  beforeEach(() => {
    setMediaMatches = createMatchMediaStub()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    innerWidthSpy = null
  })

  it('桌面端折叠侧边栏后导航进入折叠态', async () => {
    setViewportWidth(DESKTOP_WIDTH)
    await mountAppShell()
    const expanded = navItemClasses()

    await requestCollapse(true)

    expect(isDrawerMode()).toBe(false)
    expect(layoutRoot().sidebarCollapsed).toBe(true)
    expect(navItemClasses()).not.toEqual(expanded)
  })

  it('移动端断点下同一个折叠偏好不把抽屉导航压成折叠态', async () => {
    setViewportWidth(DESKTOP_WIDTH)
    await mountAppShell()
    const expanded = navItemClasses()

    await requestCollapse(true)
    // 对照：折叠偏好确实改变了导航项的渲染，否则下面那条「与展开态一致」可能只是因为
    // 折叠从未生效。
    expect(navItemClasses()).not.toEqual(expanded)

    setViewportWidth(MOBILE_WIDTH)
    setMediaMatches(MOBILE_QUERY, true)
    await settleViewport(true)

    // 前提：折叠偏好仍写在 layout 上。不成立的话下面那条「与展开态一致」只是没折叠过的假绿
    // （抽屉形态由 settleViewport 保证，不另设断言）。
    expect(layoutRoot().sidebarCollapsed).toBe(true)
    expect(navItemClasses()).toEqual(expanded)
  })

  it('跨断点往返后折叠态在桌面端恢复生效', async () => {
    setViewportWidth(DESKTOP_WIDTH)
    await mountAppShell()
    const expanded = navItemClasses()

    await requestCollapse(true)
    const collapsed = navItemClasses()

    setViewportWidth(MOBILE_WIDTH)
    setMediaMatches(MOBILE_QUERY, true)
    await settleViewport(true)
    expect(navItemClasses()).toEqual(expanded)

    setViewportWidth(DESKTOP_WIDTH)
    setMediaMatches(MOBILE_QUERY, false)
    await settleViewport(false)

    expect(navItemClasses()).toEqual(collapsed)
  })
})
