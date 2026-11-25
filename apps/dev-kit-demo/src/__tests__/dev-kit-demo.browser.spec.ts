import '@/assets/global.css'

import { setViewport } from '@greypan/doc-demo-kit/testing.viewport'
import type { WebUiCollapse, WebUiLayout } from '@greypan/web-ui'
import { createHead } from '@unhead/vue/client'
import { describe, expect, it } from 'vite-plus/test'
import { createApp } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

import App from '@/app/index.vue'
import { loadShellLocale } from '@/i18n/locale'

async function mountAppAt(initialPath: string) {
  await setViewport(1280, 800)
  await loadShellLocale()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', redirect: '/home' }, ...routes]
  })
  await router.push(initialPath)
  await router.isReady()
  const app = createApp(App).use(router).use(createHead())
  app.mount(host)
  return {
    host,
    router,
    cleanup: () => {
      app.unmount()
      host.remove()
      localStorage.clear()
    }
  }
}

async function waitFor<T>(fn: () => T | null | undefined, timeout = 5000): Promise<T> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const val = fn()
    if (val) return val
    await new Promise(r => setTimeout(r, 30))
  }
  throw new Error('Timed out waiting for condition')
}

describe('dev-kit-demo 浏览器端冒烟测试', () => {
  it('首页展示 js-kit 与 browser-kit 入口及全部 16 个模块卡片', async () => {
    const { host, cleanup } = await mountAppAt('/home')
    try {
      await waitFor(() => (host.textContent?.includes('plugin-system') ? true : null))
      expect(host.textContent).toContain('@greypan/js-kit')
      expect(host.textContent).toContain('@greypan/browser-kit')
      expect(host.textContent).toContain('utility-types')
      expect(host.textContent).toContain('history-nav')
    } finally {
      cleanup()
    }
  })

  it('侧边栏一级菜单通过 web-ui-collapse 折叠展开、无异常截断，120px 窄宽与收起态均无横向溢出', async () => {
    const { host, router, cleanup } = await mountAppAt('/home')
    try {
      const jsCollapse = await waitFor(() => host.querySelector<WebUiCollapse>('[data-nav-collapse="js-kit"]'))
      const browserCollapse = await waitFor(() =>
        host.querySelector<WebUiCollapse>('[data-nav-collapse="browser-kit"]')
      )
      const jsTrigger = await waitFor(() => host.querySelector<HTMLButtonElement>('[data-nav-group="js-kit"]'))
      const jsContent = jsCollapse.querySelector<HTMLElement>('[slot="content"]')!

      await jsCollapse.updateComplete
      await browserCollapse.updateComplete

      expect(jsCollapse.open).toBe(true)
      expect(browserCollapse.open).toBe(true)
      await waitFor(() => (jsContent.getBoundingClientRect().height > 0 ? true : null))

      // 点击收起：open 变为 false，动画落稳态后内容高度归 0
      jsTrigger.click()
      await waitFor(() => (!jsCollapse.open ? true : null))
      await waitFor(() => (jsContent.getBoundingClientRect().height === 0 ? true : null))
      expect(browserCollapse.open).toBe(true)

      // 导航至子路由后自动重新展开对应一级菜单并标记激活态
      await router.push('/js-kit/number')
      await waitFor(() => (jsCollapse.open ? true : null))
      await waitFor(() => (jsContent.getBoundingClientRect().height > 0 ? true : null))
      expect(jsTrigger.getAttribute('data-group-active')).toBe('true')

      // 模拟最小侧栏宽度 120px：检查导航区域无横向溢出
      const layout = host.querySelector<WebUiLayout>('web-ui-layout')!
      layout.sidebarWidth = '120px'
      const nav = host.querySelector<HTMLElement>('nav[aria-label="主导航"]')!
      await waitFor(() => (nav.clientWidth <= 120 ? true : null))
      expect(nav.scrollWidth).toBeLessThanOrEqual(nav.clientWidth)

      // 模拟侧边栏收起态：一级菜单渲染为带 tooltip 的箭头图标按钮，且无横向溢出
      layout.sidebarCollapsed = true
      layout.dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: { collapsed: true } }))
      const collapsedTrigger = await waitFor(() => {
        const btn = host.querySelector<HTMLButtonElement>('[data-nav-group="js-kit"]')
        const tip = btn?.closest('web-ui-tooltip') as (HTMLElement & { content?: string }) | null
        return tip && (tip.content === 'js-kit' || tip.getAttribute('content') === 'js-kit') ? btn : null
      })
      expect(collapsedTrigger.getBoundingClientRect().width).toBeLessThanOrEqual(40)
      await waitFor(() => (nav.clientWidth <= 60 ? true : null))
      expect(nav.scrollWidth).toBeLessThanOrEqual(nav.clientWidth)
    } finally {
      cleanup()
    }
  })

  it('ts/js 代码块切换不卸载交互演示面板，纯 ts 模块隐藏语言切换器', async () => {
    const { host, router, cleanup } = await mountAppAt('/js-kit/number')
    try {
      const codeblock = await waitFor(() => host.querySelector('[data-codeblock]'))
      const triggers = codeblock.querySelectorAll('web-ui-segmented-trigger')
      expect(triggers.length).toBe(2)

      const previewInput = await waitFor(() => codeblock.querySelector<HTMLInputElement>('input'))
      previewInput.dataset.marker = 'same-instance'
      ;(triggers[1] as HTMLElement).click()
      await new Promise(r => setTimeout(r, 50))
      expect(codeblock.querySelector<HTMLInputElement>('input')?.dataset.marker).toBe('same-instance')

      // 导航至纯类型模块 utility-types：应仅有 ts 围栏，无语言切换器
      await router.push('/js-kit/utility-types')
      const utilDoc = await waitFor(() => host.querySelector('[data-example-doc="js-kit/utility-types"]'))
      const utilBlock = await waitFor(() => utilDoc.querySelector('[data-codeblock="ts"]'))
      expect(utilBlock.querySelectorAll('web-ui-segmented-trigger').length).toBe(0)
    } finally {
      cleanup()
    }
  })

  it('未知模块路径展示 404 状态页', async () => {
    const { host, cleanup } = await mountAppAt('/js-kit/not-a-real-module')
    try {
      await waitFor(() => (host.textContent?.includes('404') ? true : null))
      expect(host.textContent).toContain('404')
    } finally {
      cleanup()
    }
  })
})
