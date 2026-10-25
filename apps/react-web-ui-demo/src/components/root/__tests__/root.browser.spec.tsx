import '@/assets/global.css'

import type { WebUiLayout } from '@greypan/web-ui'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { setViewport } from '@/__tests__/viewport'
import { loadShellLocale, LocaleProvider } from '@/i18n/locale'

import { Root } from '..'

/*
 * 应用自己的全局样式必须真的进页面：这一档量的是渲染后的结果，样式没到就只剩一串不生效的
 * 类名，和 jsdom 层没有区别。走与 `main.tsx` 相同的普通 `import`，browser mode 会把样式注入
 * 测试页；`import` 失败曾经看起来是「CSS 进不去」，实际是下面 vite.config 里那条
 * `optimizeDeps.include` 清单不全导致的 mid-run reload（连带把测试模块自己那次 fetch 打掉）。
 */

const DESKTOP_VIEWPORT = { width: 1280, height: 900 }
const MOBILE_VIEWPORT = { width: 568, height: 900 }

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

function isDrawerMode() {
  return !!layoutRoot().shadowRoot?.querySelector('web-ui-drawer')
}

/**
 * 导航项的对齐方式。collapsed state 在 demo 里只体现为排布，所以判据是渲染出来的对齐方式本身：
 * collapsed state 那一行把内容居中、label 自身也居中；expanded state 两者都靠左。
 *
 * 不量像素：collapsed 导轨只有 44px，label 放不下会被截断，截断后的文字落点既不是设计契约，也会随字体
 * 与文案变化——用例守的是「collapsed state 换成居中排布、expanded state 保持左对齐」这个结构，不是某个具体像素值。
 */
function navItemAlignment() {
  const link = navRoot().querySelector('a')
  if (!link) throw new Error('nav link not found')
  const label = link.querySelector('span')
  if (!label) throw new Error('nav label not found')

  return {
    rowJustify: getComputedStyle(link).justifyContent,
    labelAlign: getComputedStyle(label).textAlign
  }
}

function buildRouter() {
  const rootRoute = createRootRoute({ component: Root })
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => null })
  return createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] })
  })
}

async function mountAppShell() {
  localStorage.setItem('locale', 'zh-CN')
  await loadShellLocale('zh-CN')
  render(
    <LocaleProvider>
      <RouterProvider router={buildRouter()} />
    </LocaleProvider>
  )
  await waitFor(() => {
    if (!document.querySelector('web-ui-layout')) throw new Error('layout not mounted')
  })
  await act(async () => {
    await layoutRoot().updateComplete
  })
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

/**
 * 换的是真实视口（`setViewport`），app 的 media query 与 layout 的 `innerWidth` 判定都
 * 由引擎自己给出结论；等的是 drawer 形态真的换了，而不是一段固定时长。
 *
 * 等待必须用 testing-library 的 `waitFor` 而不是 `vi.waitFor`：跨断点时 React 的回写有两条
 * 异步链路（Root 的 `matchMedia` change 监听、layout 那 100ms 去抖的 resize 处理），实测有
 * 一部分落在「换视口」这个动作返回之后。`vi.waitFor` 的轮询期间 act 记账照开，那段回写会
 * 触发 `not wrapped in act`；testing-library 的 `waitFor` 则在这段等待里把
 * `IS_REACT_ACT_ENVIRONMENT` 置为 `false`（RTL `asyncWrapper` 原话：「We just want to run
 * `waitFor` without IS_REACT_ACT_ENVIRONMENT」），即**暂停** act 记账——落在轮询窗口里的异步
 * 回写因此不再被记账、告警消失。它靠的是「临时关掉记账」，不是「把轮询包进 act」；这与
 * `changeViewport` / `openDrawer` 用真 `act()` 包住触发动作是两回事。
 */
async function settleViewport(drawerMode: boolean) {
  await waitFor(() => {
    if (isDrawerMode() !== drawerMode) throw new Error(`drawer 形态没有变成 ${drawerMode}`)
  })
  await act(async () => {
    await layoutRoot().updateComplete
  })
}

/**
 * 换真实视口的触发动作本身包进 act：跨断点时同步落下的那次回写靠它覆盖（实测是切回桌面那
 * 一跳）；异步落下的那次在动作返回后才写，恰好落在 `settleViewport` 的 `waitFor` 窗口里
 * （那段时间 act 记账被 RTL 暂停，所以不会报 `not wrapped in act`）。两者缺一都会复现告警。
 */
async function changeViewport(size: { width: number; height: number }) {
  await act(async () => {
    await setViewport(size.width, size.height)
  })
}

/** 点 layout 自己的移动端入口 button 打开 drawer（真实点击，不是直接写 props）。 */
async function openDrawer() {
  const toggle = layoutRoot().shadowRoot?.querySelector<HTMLElement>('.mobile-toggle')
  if (!toggle) throw new Error('mobile toggle not found')

  // 触发动作是「点击」本身：Lit 的 mobile-toggle 同步派发 `sidebar-open-change`，Root 的
  // onsidebar-open-change 就地 `setSidebarOpen(...)`，所以 act 边界要落在点击上；事后补一个
  // waitFor 只是让 React 闭嘴，回写已经在边界外发生过了。
  await act(async () => {
    await userEvent.click(toggle)
  })
  await vi.waitFor(() => {
    if (navRoot().getBoundingClientRect().width === 0) throw new Error('drawer 没有打开')
  })
  await act(async () => {
    await layoutRoot().updateComplete
  })
}

describe('应用外壳（浏览器）：导航 collapsed state 不跨视口泄漏', () => {
  beforeEach(async () => {
    await changeViewport(DESKTOP_VIEWPORT)
  })

  afterEach(async () => {
    cleanup()
    await changeViewport(DESKTOP_VIEWPORT)
  })

  it('桌面端 collapse 后导航文字居中，expanded state 左对齐', async () => {
    await mountAppShell()
    const expanded = navItemAlignment()
    expect(expanded.rowJustify).not.toBe('center')
    expect(expanded.labelAlign).not.toBe('center')

    await requestCollapse(true)
    const collapsed = navItemAlignment()

    expect(isDrawerMode()).toBe(false)
    expect(layoutRoot().sidebarCollapsed).toBe(true)
    // collapse 换了一套渲染，且换成的就是「文字居中」那一套。
    expect(collapsed).not.toEqual(expanded)
    expect(collapsed.rowJustify).toBe('center')
    expect(collapsed.labelAlign).toBe('center')
  })

  it('1440px 桌面折叠态显示唯一短标签和全名提示，展开态显示完整名称', async () => {
    await changeViewport({ width: 1440, height: 900 })
    await mountAppShell()

    const expandedLinks = [...navRoot().querySelectorAll<HTMLAnchorElement>('a')]
    const fullLabels = expandedLinks.map(link => link.getAttribute('aria-label'))
    expect(expandedLinks).toHaveLength(32)
    expect(expandedLinks.map(link => link.querySelector('span')?.textContent?.trim())).toEqual(fullLabels)
    expect(expandedLinks.every(link => link.title === '')).toBe(true)

    await requestCollapse(true)

    const collapsedLinks = [...navRoot().querySelectorAll<HTMLAnchorElement>('a')]
    const shortLabels = collapsedLinks.map(link => link.querySelector('span')?.textContent?.trim() ?? '')
    expect(new Set(shortLabels).size).toBe(32)
    expect(shortLabels.every(label => label.length > 0 && label.length <= 2)).toBe(true)
    expect(collapsedLinks.map(link => link.title)).toEqual(fullLabels)
    expect(
      collapsedLinks.every(link => {
        const label = link.querySelector('span')
        return !!label && label.scrollWidth <= label.clientWidth
      })
    ).toBe(true)

    await requestCollapse(false)
    expect([...navRoot().querySelectorAll('a span')].map(label => label.textContent?.trim())).toEqual(fullLabels)
  })

  it('375px 移动视口内全局语言选择器可见', async () => {
    await mountAppShell()
    await changeViewport({ width: 375, height: 812 })
    await settleViewport(true)

    const controls = ['全局动效', '全局主题', '全局语言'].map(label => {
      const control = document.querySelector<HTMLElement>(`[aria-label="${label}"]`)
      if (!control) throw new Error(`missing global control: ${label}`)
      return control.getBoundingClientRect()
    })

    expect(controls.every(bounds => bounds.width > 0 && bounds.left >= 0 && bounds.right <= window.innerWidth)).toBe(
      true
    )
  })

  it('移动端断点下 drawer 里的导航回到 expanded state，而不是桌面 collapsed state', async () => {
    await mountAppShell()
    const expanded = navItemAlignment()

    await requestCollapse(true)
    const collapsed = navItemAlignment()
    // 对照：collapse 确实换了一套渲染，否则下面那条「与 expanded state 一致」可能只是因为 collapse 从未生效。
    expect(collapsed).not.toEqual(expanded)

    await changeViewport(MOBILE_VIEWPORT)
    await settleViewport(true)
    await openDrawer()

    // 前提：collapse preference 仍写在 layout 上，且 drawer 此刻真的是当前形态。
    expect(layoutRoot().sidebarCollapsed).toBe(true)
    expect(navItemAlignment()).toEqual(expanded)
  })

  it('跨断点往返后桌面 collapsed state 恢复', async () => {
    await mountAppShell()
    const expanded = navItemAlignment()

    await requestCollapse(true)
    const collapsed = navItemAlignment()

    await changeViewport(MOBILE_VIEWPORT)
    await settleViewport(true)
    await openDrawer()
    expect(navItemAlignment()).toEqual(expanded)

    await changeViewport(DESKTOP_VIEWPORT)
    await settleViewport(false)

    expect(navItemAlignment()).toEqual(collapsed)
  })
})
