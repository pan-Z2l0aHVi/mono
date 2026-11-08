import type { WebUiLayout } from '@greypan/web-ui'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, render, waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { loadShellLocale } from '@/i18n/locale'

import { Root } from '..'

// collapsed 的过滤、派生与持久化判据在 kit 的 shell 用例里；跨视口行为由 browser 套件用真实
// 视口验证。这里只留一条 jsdom smoke：宿主的事件接线与受控回写确实落到了 layout 上。
// collapsed 接线与文档初始化无关。真实 Provider 留在 browser 集成；本 fixture 固定 locale，
// 避免每次挂载额外启动 catalog/docs 请求，并在测试结束后继续更新 React。
vi.mock('@/i18n/locale', async importOriginal => {
  const actual = await importOriginal<typeof import('@/i18n/locale')>()
  return {
    ...actual,
    useLocale: () => ({ locale: 'zh-CN', pending: false, setLocale: async () => {} })
  }
})

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

async function mountAppShell() {
  // 固定到中文源语种，避免 Provider 挂载后再异步换一次壳文案。
  localStorage.setItem('locale', 'zh-CN')
  await loadShellLocale('zh-CN')
  const router = buildRouter()
  render(<RouterProvider router={router} />)
  await waitFor(() => {
    if (!document.querySelector('web-ui-layout')) throw new Error('layout not mounted')
    if (!navRoot().querySelector('a')) throw new Error('sidebar nav not rendered')
  })
}

/** 复刻 layout 侧边栏 Toggle 的请求链路：layout 只派发请求，宿主回写受控属性。 */
async function requestCollapse(collapsed: boolean) {
  await act(async () => {
    layoutRoot().dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: { collapsed } }))
  })
}

// 挂载要渲染完整导航与 layout 交互；本地实测 0.2–0.4s，CI 并发下实测 5.3–8.6s。
// 只在 CI 放宽，本地保留 Vitest 默认 5s。
const SHELL_TIMEOUT = process.env.CI ? 15_000 : undefined

describe('应用外壳接线 smoke', () => {
  afterEach(() => {
    cleanup()
    // locale 是本应用的持久化输入；留在 origin 上会污染同 origin 的其他 spec。
    localStorage.removeItem('locale')
    vi.restoreAllMocks()
  })

  it('layout 的 collapse 请求经 shell 状态机回写为受控属性', { timeout: SHELL_TIMEOUT }, async () => {
    await mountAppShell()

    await requestCollapse(true)

    expect(layoutRoot().sidebarCollapsed).toBe(true)
  })
})
