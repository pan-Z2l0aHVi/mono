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
import { loadDemoLocale, localeSettled } from '../locale'

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
  // 提交时刻读得到期望值：`_selectActiveOption` 先写 `value`，再依次派发 `input` 与 `change`
  // （`select/index.ts:528-529`）。应用的 `@change` handler 在同一个 `change` 派发里、首个 await 之前
  // 就把旧值同步刷回去（`app/index.vue:27`），等新 locale 加载完才收敛，所以 `change` 上的观测点必须
  // 抢在它的 handler 前面——那要依赖同节点 capture 与 bubble 的相对次序，是引擎实现细节而不是构造保证。
  // 取 `input` 就不用抢：那一轮派发跑完时应用还没被通知过，读到的必然是提交值。
  // 轮询 `host.value` 等的是那次收敛，1 秒预算在慢机器上会落在收敛之前；接线判据因此取提交本身，
  // 页面收敛由用例切完语言后 `await localeSettled()` 与 `nextTick()` 负责。
  let committed: string | undefined
  const recordCommit = () => {
    committed = host.value
  }
  host.addEventListener('input', recordCommit, { once: true })
  await userEvent.keyboard('{Enter}')
  host.removeEventListener('input', recordCommit)
  if (committed === undefined) throw new Error(`${label}：Enter 没有提交 ${value}（没有派发 input）`)
  expect(committed, `${label}：Enter 提交的值不是 ${value}`).toBe(value)
  await nextTick()
  return host
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
    const chineseThemeOptions = Array.from(
      document.querySelectorAll('web-ui-select[aria-label="全局主题"] web-ui-option')
    ).map(option => option.textContent?.trim())
    expect(chineseThemeOptions).toEqual(expect.arrayContaining(['浅色模式', '深色模式', '跟随系统']))

    await select('全局主题', 'dark')
    const language = await select('全局语言', 'en')
    await localeSettled()
    await nextTick()
    const englishThemeOptions = Array.from(
      document.querySelectorAll('web-ui-select[aria-label="Global theme"] web-ui-option')
    ).map(option => option.textContent?.trim())
    expect(englishThemeOptions).toEqual(expect.arrayContaining(['Light', 'Dark', 'Follow system']))
    expect(wrapper.text()).toContain('Variants, sizes, icons and loading states')
    // 语料已就位，这次渲染也必然把受控的 `:value` 写回提交值；在这里读，不与异步加载赛跑。
    expect(language.value, '受控回写收敛到已提交语言').toBe('en')
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
    const language = await select('Global language', 'zh-CN')
    await localeSettled()
    await nextTick()
    const zh = chineseDocs.find(doc => doc.component === 'button')!
    expect(wrapper.find('[data-example-intro]').element.textContent).toBe(textOf(zh.introHtml))
    // 语料已就位，这次渲染也必然把受控的 `:value` 写回提交值；在这里读，不与异步加载赛跑。
    expect(language.value, '受控回写收敛到已提交语言').toBe('zh-CN')
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
