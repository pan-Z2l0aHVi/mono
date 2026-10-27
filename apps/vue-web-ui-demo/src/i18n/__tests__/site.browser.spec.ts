import '@/assets/global.css'

import type { WebUiSelect, WebUiTheme } from '@greypan/web-ui'
import { createHead } from '@unhead/vue/client'
import { flushPromises, mount } from '@vue/test-utils'
import { expect, it, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import AppShell from '@/app/index.vue'
import { exampleDocs as englishDocs } from '@/generated/en/examples'
import { exampleDocs as chineseDocs } from '@/generated/examples'
import ButtonPage from '@/pages/components/button.vue'
import Home from '@/pages/home/index.vue'

import { prepareExamples } from '../examples'
import { loadDemoLocale } from '../locale'

// 保留真实双语数据与示例模块，只缩小此交互回归的语料；覆盖同文档多例和跨文档准备。
vi.mock('@/generated/examples', async importOriginal => {
  const module = await importOriginal<typeof import('@/generated/examples')>()
  return {
    ...module,
    exampleDocs: module.exampleDocs.map(doc => ({
      ...doc,
      samples: doc.samples.slice(0, doc.component === 'button' ? 2 : 1)
    }))
  }
})
vi.mock('@/generated/en/examples', async importOriginal => {
  const module = await importOriginal<typeof import('@/generated/en/examples')>()
  return {
    ...module,
    exampleDocs: module.exampleDocs.map(doc => ({
      ...doc,
      samples: doc.samples.slice(0, doc.component === 'button' ? 2 : 1)
    }))
  }
})

it('通过全局选择器切换壳、文档、API、运行示例与双框架源码，并保留路由和主题', async () => {
  await loadDemoLocale('zh-CN', false)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: Home },
      { path: '/components/button', component: ButtonPage },
      { path: '/:pathMatch(.*)*', component: Home }
    ]
  })
  await router.push('/home')
  const wrapper = mount(AppShell, { attachTo: document.body, global: { plugins: [router, createHead()] } })
  async function select(label: string, value: string) {
    const host = document.querySelector<WebUiSelect>(`web-ui-select[aria-label="${label}"]`)!
    await host.updateComplete
    const trigger = host.shadowRoot!.querySelector<HTMLElement>('[role="combobox"]')!
    await userEvent.click(trigger)
    await vi.waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('true'))
    await userEvent.click(host.querySelector<HTMLElement>(`web-ui-option[value="${value}"]`)!)
    await vi.waitFor(() => expect(host.value).toBe(value))
    await nextTick()
  }
  const textOf = (html: string) => {
    const el = document.createElement('div')
    el.innerHTML = html
    return el.textContent
  }
  try {
    await select('全局主题', 'dark')
    await select('全局语言', 'en')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Variants, sizes, icons and loading states'))
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem('locale')).toBe('en')
    expect(router.currentRoute.value.path).toBe('/home')
    expect(wrapper.find('web-ui-theme').element as WebUiTheme).toHaveProperty('appearance', 'dark')
    await router.push('/components/button')
    const en = englishDocs.find(doc => doc.component === 'button')!
    await vi.waitFor(() => expect(wrapper.find('[data-example-intro]').element.textContent).toBe(textOf(en.introHtml)))
    expect(wrapper.text()).toContain('Samples')
    expect(wrapper.find('web-ui-button[aria-label="Copy code"]').exists()).toBe(true)
    const buttonDoc = wrapper.find('[data-example-doc="button"]')
    const first = buttonDoc.find('[data-sample-preview]')
    await prepareExamples('en', englishDocs, ['button', 'button-group'])
    await flushPromises()
    expect(first.find('web-ui-button').exists()).toBe(true)
    const oldPreview = first.element.firstElementChild
    expect(buttonDoc.text()).toContain('Name')
    expect(first.text()).toContain('No variant (also glass)')
    expect(wrapper.find('[data-example-doc="button-group"] [data-sample-preview]').text()).toContain('Left')
    const sizes = buttonDoc.findAll('[data-sample]')[1]!
    const source = () => sizes.find('[data-code] pre').element.textContent
    expect(sizes.find('[data-sample-preview]').text()).toContain('Default 36')
    expect(source()).toContain('Default 36')
    expect(source()).toContain('<template>')
    await userEvent.click(
      sizes.findAll('web-ui-segmented-trigger').find(trigger => trigger.text() === 'React')!.element
    )
    await vi.waitFor(() => expect(source()).toContain('export default function Demo()'))
    await select('Global language', 'zh-CN')
    const zh = chineseDocs.find(doc => doc.component === 'button')!
    await vi.waitFor(() => expect(wrapper.find('[data-example-intro]').element.textContent).toBe(textOf(zh.introHtml)))
    await vi.waitFor(() => expect(first.find('web-ui-button').exists()).toBe(true))
    await vi.waitFor(() => expect(first.element.firstElementChild).not.toBe(oldPreview))
    expect(first.text()).toContain('没写 variant（同样是 glass）')
    expect(wrapper.find('[data-example-doc="button-group"] [data-sample-preview]').text()).toContain('左')
    expect(sizes.find('[data-sample-preview]').text()).toContain('默认 36')
    expect(source()).toContain('默认 36')
    expect(source()).toContain('export default function Demo()')
    await userEvent.click(sizes.findAll('web-ui-segmented-trigger').find(trigger => trigger.text() === 'Vue')!.element)
    await vi.waitFor(() => expect(source()).toContain('<template>'))
    expect(source()).toContain('默认 36')
    expect(buttonDoc.text()).toContain('名称')
    expect(router.currentRoute.value.path).toBe('/components/button')
    expect(wrapper.find('web-ui-theme').element as WebUiTheme).toHaveProperty('appearance', 'dark')
  } finally {
    wrapper.unmount()
    document.body.innerHTML = ''
    localStorage.clear()
  }
})
