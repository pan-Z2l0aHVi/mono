import '@/assets/global.css'
import '@/generated/examples.css'

import { mount, type VueWrapper } from '@vue/test-utils'
import { OverlayScrollbars } from 'overlayscrollbars'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import ExampleDoc from '@/components/example-doc/index.vue'
import { loadDemoLocale } from '@/i18n/locale'

import { setViewport } from './viewport'

let wrapper: VueWrapper | null = null

afterEach(async () => {
  wrapper?.unmount()
  wrapper = null
  await setViewport(1280, 900)
})

describe('示例 API 表（浏览器）', () => {
  it('窄视口在表格自身横向滚动，不把整页撑宽', async () => {
    await setViewport(320, 700)
    await loadDemoLocale('en', false)
    wrapper = mount(ExampleDoc, { props: { component: 'progress' }, attachTo: document.body })

    await vi.waitFor(() => {
      if (!wrapper?.find('table').exists()) throw new Error('API table did not render')
    })

    const table = wrapper.find('table').element as HTMLTableElement
    const scroller = wrapper.find('[data-api-table-scroll]').element as HTMLElement
    const instance = OverlayScrollbars(scroller)
    if (!instance) throw new Error('API table did not initialize OverlayScrollbars')
    const viewport = instance.elements().viewport
    const heading = document.getElementById(viewport.getAttribute('aria-labelledby') ?? '')
    if (!heading) throw new Error('API table heading is missing')

    expect(instance.options().scrollbars.theme).toBe('os-theme-macos')
    expect(scroller.getAttribute('data-overlayscrollbars')).toBe('host')
    expect(viewport.hasAttribute('data-overlayscrollbars-viewport')).toBe(true)
    expect(viewport.tabIndex).toBe(0)
    expect(viewport.getAttribute('role')).toBe('region')
    expect(heading.textContent?.trim()).toBe('Props')
    expect(viewport.clientWidth).toBeGreaterThan(0)
    expect(viewport.scrollWidth).toBeGreaterThan(viewport.clientWidth)
    expect(table.scrollWidth).toBeGreaterThan(viewport.clientWidth)
    expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth)
  })
})
