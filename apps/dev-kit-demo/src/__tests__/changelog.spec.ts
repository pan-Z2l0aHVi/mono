import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'
import { createMemoryHistory, createRouter } from 'vue-router'

import { ensureExampleDoc } from '@/i18n/locale'

import BrowserKitChangelog from '../pages/browser-kit/changelog.vue'
import DepsReloadChangelog from '../pages/deps-reload/changelog.vue'
import JsKitChangelog from '../pages/js-kit/changelog.vue'
import UnpluginWebComponentsChangelog from '../pages/unplugin-web-components/changelog.vue'

describe('更新日志页', () => {
  it('从 js-kit CHANGELOG.md 原样渲染文档', async () => {
    await ensureExampleDoc('js-kit/CHANGELOG')
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: JsKitChangelog }]
    })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(JsKitChangelog, { global: { plugins: [router] } })
    await flushPromises()

    const markup = wrapper.html()
    expect(markup).toMatch(/<h1[^>]*>@greypan\/js-kit<\/h1>/)
    expect(markup).toMatch(/<h2[^>]*>\d+\.\d+\.\d+<\/h2>/)
    expect(markup).toContain('mdm-heading')
    wrapper.unmount()
  })

  it('从 browser-kit CHANGELOG.md 原样渲染文档', async () => {
    await ensureExampleDoc('browser-kit/CHANGELOG')
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: BrowserKitChangelog }]
    })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(BrowserKitChangelog, { global: { plugins: [router] } })
    await flushPromises()

    const markup = wrapper.html()
    expect(markup).toMatch(/<h1[^>]*>@greypan\/browser-kit<\/h1>/)
    expect(markup).toMatch(/<h2[^>]*>\d+\.\d+\.\d+<\/h2>/)
    expect(markup).toContain('mdm-heading')
    wrapper.unmount()
  })

  it('从 deps-reload CHANGELOG.md 原样渲染文档', async () => {
    await ensureExampleDoc('deps-reload/CHANGELOG')
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: DepsReloadChangelog }]
    })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(DepsReloadChangelog, { global: { plugins: [router] } })
    await flushPromises()

    const markup = wrapper.html()
    expect(markup).toMatch(/<h1[^>]*>@greypan\/deps-reload<\/h1>/)
    expect(markup).toMatch(/<h2[^>]*>\d+\.\d+\.\d+<\/h2>/)
    expect(markup).toContain('mdm-heading')
    wrapper.unmount()
  })

  it('从 unplugin-web-components CHANGELOG.md 原样渲染文档', async () => {
    await ensureExampleDoc('unplugin-web-components/CHANGELOG')
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: UnpluginWebComponentsChangelog }]
    })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(UnpluginWebComponentsChangelog, { global: { plugins: [router] } })
    await flushPromises()

    const markup = wrapper.html()
    expect(markup).toMatch(/<h1[^>]*>@greypan\/unplugin-web-components<\/h1>/)
    expect(markup).toMatch(/<h2[^>]*>\d+\.\d+\.\d+<\/h2>/)
    expect(markup).toContain('mdm-heading')
    wrapper.unmount()
  })
})
