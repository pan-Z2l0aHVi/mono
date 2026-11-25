import { createHead } from '@unhead/vue/client'
import { describe, expect, it } from 'vite-plus/test'
import { createApp } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

import App from '@/app/index.vue'
import { loadShellLocale } from '@/i18n/locale'

async function mountAppAt(initialPath: string) {
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

  it('侧边栏一级菜单 js-kit 与 browser-kit 支持折叠展开，并在进入子路由时自动展开', async () => {
    const { host, router, cleanup } = await mountAppAt('/home')
    try {
      const jsTrigger = await waitFor(() => host.querySelector<HTMLButtonElement>('[data-nav-group="js-kit"]'))
      const browserTrigger = await waitFor(() =>
        host.querySelector<HTMLButtonElement>('[data-nav-group="browser-kit"]')
      )

      expect(jsTrigger.getAttribute('aria-expanded')).toBe('true')
      expect(browserTrigger.getAttribute('aria-expanded')).toBe('true')

      jsTrigger.click()
      await waitFor(() => (jsTrigger.getAttribute('aria-expanded') === 'false' ? true : null))

      // 导航至子路由后自动重新展开对应一级菜单并标记激活态
      await router.push('/js-kit/number')
      await waitFor(() => (jsTrigger.getAttribute('aria-expanded') === 'true' ? true : null))
      expect(jsTrigger.getAttribute('data-group-active')).toBe('true')
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
