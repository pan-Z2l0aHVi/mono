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
    routes
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
  it('首页展示工具库与构建插件入口卡片（无 Hero 快捷按钮）及全部 16 个模块卡片', async () => {
    const { host, cleanup } = await mountAppAt('/home')
    try {
      const header = await waitFor(() => host.querySelector<HTMLElement>('header'))
      expect(header.querySelectorAll('web-ui-button')).toHaveLength(0)

      const entrySection = await waitFor(() => host.querySelector<HTMLElement>('section[aria-label="工具包入口"]'))
      expect(entrySection.textContent).toContain('工具库')
      expect(entrySection.textContent).toContain('构建插件')
      expect(entrySection.textContent).toContain('@greypan/js-kit')
      expect(entrySection.textContent).toContain('@greypan/browser-kit')
      expect(entrySection.textContent).toContain('@greypan/deps-reload')
      expect(entrySection.textContent).toContain('@greypan/unplugin-web-components')

      const moduleSection = await waitFor(() => host.querySelector<HTMLElement>('section[aria-label="模块清单"]'))
      const expectedPaths = [
        '/js-kit/plugin-system',
        '/js-kit/url',
        '/js-kit/number',
        '/js-kit/string',
        '/js-kit/timer',
        '/js-kit/paradigm',
        '/js-kit/shortcut',
        '/js-kit/utility-types',
        '/browser-kit/storage',
        '/browser-kit/tracker',
        '/browser-kit/env',
        '/browser-kit/dom',
        '/browser-kit/file',
        '/browser-kit/copy',
        '/browser-kit/history-nav',
        '/browser-kit/shortcut'
      ]
      const cards = Array.from(moduleSection.querySelectorAll<HTMLAnchorElement>('a.demo-quick-link-card'))
      expect(moduleSection.textContent).toContain('@greypan/js-kit')
      expect(moduleSection.textContent).toContain('@greypan/browser-kit')
      expect(cards).toHaveLength(expectedPaths.length)
      const cardPaths = cards.map(card => new URL(card.href, window.location.origin).pathname)
      for (const expectedPath of expectedPaths) {
        expect(cardPaths).toContain(expectedPath)
      }
    } finally {
      cleanup()
    }
  })

  it('侧边栏一级菜单通过 web-ui-collapse 折叠展开、无参考线，120px 窄宽与收起态均仅由 click 触发且无横向溢出', async () => {
    const { host, router, cleanup } = await mountAppAt('/home')
    try {
      const jsCollapse = await waitFor(() => host.querySelector<WebUiCollapse>('[data-nav-collapse="js-kit"]'))
      const browserCollapse = await waitFor(() =>
        host.querySelector<WebUiCollapse>('[data-nav-collapse="browser-kit"]')
      )
      const depsReloadCollapse = await waitFor(() =>
        host.querySelector<WebUiCollapse>('[data-nav-collapse="deps-reload"]')
      )
      const unpluginCollapse = await waitFor(() =>
        host.querySelector<WebUiCollapse>('[data-nav-collapse="unplugin-web-components"]')
      )
      const jsTrigger = await waitFor(() => host.querySelector<HTMLButtonElement>('[data-nav-group="js-kit"]'))
      const jsContent = jsCollapse.querySelector<HTMLElement>('[slot="content"]')!

      await jsCollapse.updateComplete
      await browserCollapse.updateComplete
      await depsReloadCollapse.updateComplete
      await unpluginCollapse.updateComplete

      // 一级菜单沿用圆角胶囊样式，子菜单无左侧参考线
      expect(jsTrigger.classList.contains('rounded-full')).toBe(true)
      expect(jsContent.querySelector('.border-l')).toBeNull()

      expect(jsCollapse.open).toBe(true)
      expect(browserCollapse.open).toBe(true)
      expect(depsReloadCollapse.open).toBe(true)
      expect(unpluginCollapse.open).toBe(true)
      await waitFor(() => (jsContent.getBoundingClientRect().height > 0 ? true : null))

      // 点击收起：open 变为 false，动画落稳态后内容高度归 0
      jsTrigger.click()
      await waitFor(() => (!jsCollapse.open ? true : null))
      await waitFor(() => (jsContent.getBoundingClientRect().height === 0 ? true : null))
      expect(browserCollapse.open).toBe(true)

      // 导航至子路由后自动重新展开对应一级菜单并标记激活态；再收起时一级菜单呈现 selected 灰底
      await router.push('/js-kit/number')
      await waitFor(() => (jsCollapse.open ? true : null))
      await waitFor(() => (jsContent.getBoundingClientRect().height > 0 ? true : null))
      expect(jsTrigger.getAttribute('data-group-active')).toBe('true')
      expect(jsTrigger.getAttribute('data-active')).toBeNull()

      jsTrigger.click()
      await waitFor(() => (!jsCollapse.open ? true : null))
      await waitFor(() => (jsTrigger.getAttribute('data-active') === 'true' ? true : null))
      jsTrigger.click()
      await waitFor(() => (jsCollapse.open ? true : null))

      // 模拟最小侧栏宽度 120px：检查导航区域无横向溢出
      const layout = host.querySelector<WebUiLayout>('web-ui-layout')!
      layout.sidebarWidth = '120px'
      const nav = host.querySelector<HTMLElement>('nav[aria-label="主导航"]')!
      await waitFor(() => (nav.clientWidth <= 120 ? true : null))
      expect(nav.scrollWidth).toBeLessThanOrEqual(nav.clientWidth)

      // 模拟侧边栏收起态：一级菜单渲染为带 tooltip 的圆形箭头按钮，无横向溢出
      layout.sidebarCollapsed = true
      layout.dispatchEvent(new CustomEvent('sidebar-collapsed-change', { detail: { collapsed: true } }))
      const collapsedTrigger = await waitFor(() => {
        const btn = host.querySelector<HTMLButtonElement>('[data-nav-group="js-kit"]')
        const tip = btn?.closest('web-ui-tooltip') as (HTMLElement & { content?: string }) | null
        return tip && (tip.content === 'js-kit' || tip.getAttribute('content') === 'js-kit') ? btn : null
      })
      expect(collapsedTrigger.classList.contains('rounded-full')).toBe(true)
      expect(collapsedTrigger.getBoundingClientRect().width).toBeLessThanOrEqual(40)
      await waitFor(() => (nav.clientWidth <= 60 ? true : null))
      expect(nav.scrollWidth).toBeLessThanOrEqual(nav.clientWidth)

      // 收起态下 tooltip 的 open-change 冒泡不得改变子菜单展开状态，仅 click 可切换
      const tooltip = collapsedTrigger.closest('web-ui-tooltip')!
      tooltip.dispatchEvent(new CustomEvent('open-change', { detail: { open: false }, bubbles: true, composed: true }))
      await new Promise(r => setTimeout(r, 50))
      expect(jsCollapse.open).toBe(true)

      collapsedTrigger.click()
      await waitFor(() => (!jsCollapse.open ? true : null))

      tooltip.dispatchEvent(new CustomEvent('open-change', { detail: { open: true }, bubbles: true, composed: true }))
      await new Promise(r => setTimeout(r, 50))
      expect(jsCollapse.open).toBe(false)

      collapsedTrigger.click()
      await waitFor(() => (jsCollapse.open ? true : null))
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

  it('构建插件文档路由可正常渲染且未知插件子路径展示 404', async () => {
    const { host, router, cleanup } = await mountAppAt('/deps-reload/vite')
    try {
      const depsDoc = await waitFor(() => host.querySelector('[data-example-doc="deps-reload/vite"]'))
      expect(depsDoc.textContent).toContain('Vite')

      await router.push('/unplugin-web-components/html-injection')
      const unpluginDoc = await waitFor(() =>
        host.querySelector('[data-example-doc="unplugin-web-components/html-injection"]')
      )
      expect(unpluginDoc.textContent).toContain('HTML')

      await router.push('/deps-reload/not-a-real-doc')
      await waitFor(() => (host.textContent?.includes('404') ? true : null))
      expect(host.textContent).toContain('404')
    } finally {
      cleanup()
    }
  })

  it('访问非叶子的一级分组路由自动重定向至首个子路由（getting-started）', async () => {
    const { host, router, cleanup } = await mountAppAt('/deps-reload')
    try {
      expect(router.currentRoute.value.path).toBe('/deps-reload/getting-started')
      await router.push('/')
      expect(router.currentRoute.value.path).toBe('/home')
      await router.push('/deps-reload')
      await waitFor(() => host.querySelector('[data-example-doc="deps-reload/README"]'))

      for (const pkg of ['js-kit', 'browser-kit', 'unplugin-web-components']) {
        await router.push(`/${pkg}`)
        expect(router.currentRoute.value.path).toBe(`/${pkg}/getting-started`)
      }
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
