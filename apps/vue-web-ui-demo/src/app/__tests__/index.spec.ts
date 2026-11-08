import type { WebUiLayout } from '@greypan/web-ui'
import { createHead } from '@unhead/vue/client'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { defineComponent, nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import { loadDemoLocale } from '@/i18n/locale'

import AppShell from '../index.vue'

// collapsed 的过滤、派生与持久化判据在 kit 的 shell 用例里；跨视口行为由 browser 套件用真实
// 视口验证。这里只留一条 jsdom smoke：宿主的事件接线与受控回写确实落到了 layout 上。
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

/**
 * 这个 jsdom 层不模拟真实布局；折叠态的文字省略、tooltip 与文本布局由 browser spec 验证。
 * 折叠态的公开出口是 `web-ui-tooltip` 的 `content`：可见文字与可访问名都保持完整名称，
 * 折叠时由 tooltip 提供完整名称。两者一起比较，确认 collapse 请求真的改了导航渲染。
 */
function navItemState() {
  const link = navRoot().querySelector('a[aria-label="Button"]')
  if (!link) throw new Error('nav link not found')
  const tooltip = link.closest('web-ui-tooltip') as (HTMLElement & { content?: string }) | null
  return { text: link.textContent?.trim() ?? '', tooltip: tooltip?.content ?? null }
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
}

/** 复刻 layout 侧边栏 Toggle 的请求链路：layout 只派发请求，宿主回写受控属性。 */
async function requestCollapse(collapsed: boolean) {
  layoutRoot().dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: { collapsed } }))
  await nextTick()
}

// 挂载要渲染完整导航与 layout 交互；本地实测 0.2–0.4s，CI 并发下实测 5.3–8.6s。
// 只在 CI 放宽，本地保留 Vitest 默认 5s。
const SHELL_TIMEOUT = process.env.CI ? 15_000 : undefined

describe('应用外壳接线 smoke', () => {
  beforeEach(async () => {
    await loadDemoLocale('en', false)
    // jsdom 没有布局与 ResizeObserver；toast 尺寸变化由 browser spec 验证。
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
  })

  it('layout 的 collapse 请求经 shell 状态机回写为受控属性', { timeout: SHELL_TIMEOUT }, async () => {
    await mountAppShell()
    const expanded = navItemState()

    await requestCollapse(true)

    expect(layoutRoot().sidebarCollapsed).toBe(true)
    expect(navItemState()).not.toEqual(expanded)
  })
})
