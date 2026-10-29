import '@/assets/global.css'

import { local } from '@greypan/browser-kit'
import type { WebUiSelect, WebUiTheme } from '@greypan/web-ui'
import { createHead } from '@unhead/vue/client'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, expect, it, vi } from 'vite-plus/test'
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

async function mountShell(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: Home },
      { path: '/components/button', component: ButtonPage },
      { path: '/:pathMatch(.*)*', component: Home }
    ]
  })
  await router.push(path)
  const wrapper = mount(AppShell, { attachTo: document.body, global: { plugins: [router, createHead()] } })
  return { router, wrapper }
}

async function select(label: string, value: string) {
  const host = document.querySelector<WebUiSelect>(`web-ui-select[aria-label="${label}"]`)!
  await host.updateComplete
  const trigger = host.shadowRoot!.querySelector<HTMLElement>('[role="combobox"]')!
  await userEvent.click(trigger)
  await vi.waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('true'))
  const options = Array.from(host.querySelectorAll<HTMLElement>('web-ui-option'))
  const optionIndex = options.findIndex(option => option.getAttribute('value') === value)
  if (optionIndex < 0) throw new Error(`Option ${value} not found in ${label}`)
  // 键盘路径验证选择器与应用的接线，不依赖选项入场过渡期间的命中几何。
  await userEvent.keyboard('{Home}')
  for (let index = 0; index < optionIndex; index += 1) await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => expect(trigger.getAttribute('aria-activedescendant')).toBe(options[optionIndex].id))
  // 提交的那一次读得到期望值：`change` 在 `_selectActiveOption` 写完 `value` 之后同步派发，捕获阶段
  // 跑在应用的 handler 前面。应用把 `:value` 绑到 locale 状态上，随后的渲染会先把旧值刷回去，等新
  // locale 加载完才收敛——轮询 `host.value` 等的是那次收敛，1 秒窗口在慢机器上会落在收敛之前。
  // 接线判据因此取提交本身；页面收敛由每个用例自己的 waitFor 负责。
  let committed: string | undefined
  const recordCommit = () => {
    committed = host.value
  }
  host.addEventListener('change', recordCommit, { capture: true })
  await userEvent.keyboard('{Enter}')
  host.removeEventListener('change', recordCommit, { capture: true })
  expect(committed, `${label}：Enter 没有提交 ${value}（没有收到 change）`).toBe(value)
  await nextTick()
}

function textOf(html: string) {
  const el = document.createElement('div')
  el.innerHTML = html
  return el.textContent
}

beforeEach(async () => {
  await loadDemoLocale('en', false)
})

it('首页通过全局选择器切换壳文案，更新偏好并保留路由和主题', async () => {
  await loadDemoLocale('zh-CN', false)
  const { router, wrapper } = await mountShell('/home')
  try {
    await select('全局主题', 'dark')
    await select('全局语言', 'en')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Variants, sizes, icons and loading states'))
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem('locale')).toBe('en')
    expect(router.currentRoute.value.path).toBe('/home')
    expect(wrapper.find('web-ui-theme').element as WebUiTheme).toHaveProperty('appearance', 'dark')
  } finally {
    wrapper.unmount()
    document.body.innerHTML = ''
    localStorage.clear()
  }
})

it('组件页切换文档、API、运行示例与双框架源码，保留当前路由和主题', async () => {
  local.set('theme-appearance', 'dark')
  const { router, wrapper } = await mountShell('/home')
  try {
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
    expect(document.documentElement.lang).toBe('zh-CN')
    expect(localStorage.getItem('locale')).toBe('zh-CN')
    expect(router.currentRoute.value.path).toBe('/components/button')
    expect(wrapper.find('web-ui-theme').element as WebUiTheme).toHaveProperty('appearance', 'dark')
  } finally {
    wrapper.unmount()
    document.body.innerHTML = ''
    localStorage.clear()
  }
})
