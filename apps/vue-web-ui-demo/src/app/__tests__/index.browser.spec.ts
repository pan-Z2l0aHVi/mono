import '@/assets/global.css'

import type { WebUiLayout } from '@greypan/web-ui'
import { createHead } from '@unhead/vue/client'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import { defineComponent, nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import { setViewport } from '@/__tests__/viewport'

import AppShell from '../index.vue'

/*
 * 应用自己的全局样式必须真的进页面：这一档量的是渲染后的结果，样式没到就只剩一串不生效的
 * 类名，和 jsdom 层没有区别。走与 `main.ts` 相同的普通 `import`，browser mode 会把样式注入
 * 测试页；`import` 失败曾经看起来是「CSS 进不去」，实际是下面 vite.config 里那条
 * `optimizeDeps.include` 清单不全导致的 mid-run reload（连带把测试模块自己那次 fetch 打掉）。
 */

const DESKTOP_VIEWPORT = { width: 1280, height: 900 }
const MOBILE_VIEWPORT = { width: 568, height: 900 }

const PageStub = defineComponent({ template: '<div data-testid="page" />' })

function layoutRoot() {
  const element = document.querySelector('web-ui-layout') as
    | (HTMLElement & WebUiLayout & { updateComplete: Promise<unknown> })
    | null
  if (!element) throw new Error('web-ui-layout not found')
  return element
}

function navRoot() {
  const element = document.querySelector('[aria-label="App navigation"]')
  if (!element) throw new Error('sidebar nav not found')
  return element
}

function isDrawerMode() {
  return !!layoutRoot().shadowRoot?.querySelector('web-ui-drawer')
}

/**
 * 导航项的渲染形态。collapsed state 在 demo 里只体现为排版，所以判据是真实渲染出来的对齐方式与
 * 文字在整行里的落点；`centered` 把「文字贴着整行中间」说成一个几何事实，而不是某个
 * 具体的 CSS 值。
 *
 * 容差按行宽缩放（取四分之一）而不是给绝对值：同一个 collapsed state 会以两种行宽渲染——刚回写 collapse
 * 偏好时侧边栏还没真正收窄，行宽 216px、文字严格居中（两侧差 0）；真正重新布局之后行宽变成
 * 44px，被截断的 label 带来约 3.8px 的不对称。展开态与 drawer 态的两侧差是行宽的 0.78～0.83，两类
 * 之间隔着一个数量级，所以四分之一行宽落在中间、两侧都留有余量。
 */
function navItemShape() {
  const link = navRoot().querySelector('a')
  if (!link) throw new Error('nav link not found')
  const label = link.querySelector('span')
  if (!label) throw new Error('nav label not found')

  const linkRect = link.getBoundingClientRect()
  const range = document.createRange()
  range.selectNodeContents(label)
  const textRect = range.getBoundingClientRect()

  const leftInset = textRect.left - linkRect.left
  const rightInset = linkRect.right - textRect.right
  return {
    rowJustify: getComputedStyle(link).justifyContent,
    labelAlign: getComputedStyle(label).textAlign,
    centered: linkRect.width > 0 && Math.abs(leftInset - rightInset) < linkRect.width / 4
  }
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
/** 等侧边栏真正收窄到 collapsed width 再取形状：collapsed width 有过渡，宽态下量到的是过渡中的形状。 */
async function waitForCollapsedNav() {
  await vi.waitFor(() => {
    const link = navRoot().querySelector('a')
    const width = link ? link.getBoundingClientRect().width : Number.POSITIVE_INFINITY
    if (width > 48) throw new Error('侧边栏还没有收窄到位')
  })
  await nextTick()
}

async function requestCollapse(collapsed: boolean) {
  layoutRoot().dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: { collapsed } }))
  await nextTick()
  await layoutRoot().updateComplete
}

/**
 * 换的是真实视口（`setViewport`），app 的 media query 与 layout 的 `innerWidth` 判定都
 * 由引擎自己给出结论；等的是 drawer 形态真的换了，而不是一段固定时长。
 */
async function settleViewport(drawerMode: boolean) {
  await vi.waitFor(() => {
    if (isDrawerMode() !== drawerMode) throw new Error(`drawer 形态没有变成 ${drawerMode}`)
  })
  await nextTick()
  await layoutRoot().updateComplete
}

/** 点 layout 自己的移动端入口 button 打开 drawer（真实点击，不是直接写 props）。 */
async function openDrawer() {
  const toggle = layoutRoot().shadowRoot?.querySelector<HTMLElement>('.mobile-toggle')
  if (!toggle) throw new Error('mobile toggle not found')

  await userEvent.click(toggle)
  await vi.waitFor(() => {
    if (navRoot().getBoundingClientRect().width === 0) throw new Error('drawer 没有打开')
  })
  await nextTick()
  await layoutRoot().updateComplete
}

describe('应用外壳（浏览器）：导航 collapsed state 不跨视口泄漏', () => {
  beforeEach(async () => {
    await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
  })

  afterEach(async () => {
    wrapper?.unmount()
    wrapper = null
    await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
  })

  it('桌面端 collapse 后导航文字居中，展开态左对齐', async () => {
    await mountAppShell()
    const expanded = navItemShape()
    expect(expanded.centered).toBe(false)

    await requestCollapse(true)
    const collapsed = navItemShape()

    expect(isDrawerMode()).toBe(false)
    expect(layoutRoot().sidebarCollapsed).toBe(true)
    // collapse 换了一套渲染，且换成的就是「文字居中」那一套。
    expect(collapsed).not.toEqual(expanded)
    expect(collapsed.centered).toBe(true)
  })

  it('移动端断点下 drawer 里的导航回到展开态，而不是桌面 collapsed state', async () => {
    await mountAppShell()
    const expanded = navItemShape()

    await requestCollapse(true)
    const collapsed = navItemShape()
    // 对照：collapse 确实换了一套渲染，否则下面那条「与展开态一致」可能只是因为 collapse 从未生效。
    expect(collapsed).not.toEqual(expanded)

    await setViewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
    await settleViewport(true)
    await openDrawer()

    // 前提：collapse preference 仍写在 layout 上，且 drawer 此刻真的是当前形态。
    expect(layoutRoot().sidebarCollapsed).toBe(true)
    expect(navItemShape()).toEqual(expanded)
  })

  it('跨断点往返后桌面 collapsed state 恢复', async () => {
    await mountAppShell()
    const expanded = navItemShape()

    await requestCollapse(true)
    await waitForCollapsedNav()
    const collapsed = navItemShape()

    await setViewport(MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height)
    await settleViewport(true)
    await openDrawer()
    expect(navItemShape()).toEqual(expanded)

    await setViewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
    await settleViewport(false)
    await waitForCollapsedNav()

    expect(navItemShape()).toEqual(collapsed)
  })
})
