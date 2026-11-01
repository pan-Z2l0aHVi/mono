import '@/assets/global.css'

import { local } from '@greypan/browser-kit'
import type { WebUiSelect, WebUiTheme } from '@greypan/web-ui'
import { createHead } from '@unhead/vue/client'
import { flushPromises, mount, type DOMWrapper } from '@vue/test-utils'
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

/**
 * 点击示例工具栏里的 segmented-trigger 前，先把「可点击」等到位，再交给 `userEvent.click`。
 *
 * Playwright 的 click 自带同强度检查（attached、可见、连续两帧 stable、动作点命中），但它的重试
 * 预算比 Vitest 的测试预算长，失败只留下 “timed out while waiting for click”，看不出卡在哪一项。
 * 这里把同一组判据写成期待值：
 *
 * - 位置由测试决定：每一轮 ready 不满足时都重新 `scrollIntoView({ block: 'center', inline: 'center',
 *   behavior: 'instant' })`。贴视口上缘时动作点会落到 sticky banner/header 上（实测中心命中的是
 *   header 里的 `web-ui-select`）；交给 Playwright 自己挑滚动位置，就多出一段「先被盖住、再靠重试
 *   滚动脱困」的窗口。滚动后布局再移，下一轮仍能重新纠正。
 * - 每一轮重新按文案取节点：locale 切换按 `${locale}:${demoKey}` 重挂预览，旧 wrapper 可能指向
 *   被替换的节点。
 * - ready 要求已连接、已布局、动作点（矩形中心）在视口内且命中 trigger 或其子节点，且连续两帧
 *   boundingBox 相同（与 Playwright 的 stable 判据同强度）。只看动作点而不要求整个矩形都在视口内，
 *   与 Playwright 的动作点判据一致，超出视口的超大 trigger 不会被误判。
 * - 每次等待在 rAF 与定时器之间竞争：rAF 停摆时定时器仍会醒来检查 deadline，超时始终能带读数抛出，
 *   不会静默拖到测试框架的超时。
 * - 超时错误带读数，失败能直接指认 attached / visible / stable / hit target 哪一项。
 */
async function clickSegmentedTrigger(sample: DOMWrapper<Element>, label: string) {
  const resolve = () => {
    const trigger = sample.findAll('web-ui-segmented-trigger').find(item => item.text() === label)
    if (!trigger) throw new Error(`Segmented trigger "${label}" not found`)
    return trigger.element
  }

  const pollIntervalMs = 50
  const deadline = performance.now() + 5000
  let previous: string | undefined
  for (;;) {
    const trigger = resolve()
    const rect = trigger.getBoundingClientRect()
    const box = `${rect.left},${rect.top},${rect.width},${rect.height}`
    const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const hit = document.elementFromPoint(point.x, point.y)
    const pointInViewport =
      point.x >= 0 && point.x <= window.innerWidth && point.y >= 0 && point.y <= window.innerHeight
    const ready =
      trigger.isConnected &&
      rect.width > 0 &&
      rect.height > 0 &&
      pointInViewport &&
      hit !== null &&
      (hit === trigger || trigger.contains(hit))
    if (ready && previous === box) {
      await userEvent.click(trigger)
      return
    }
    if (performance.now() > deadline) {
      throw new Error(
        `Segmented trigger "${label}" is not clickable: connected=${trigger.isConnected} box=${box} ` +
          `point=${point.x},${point.y} viewport=${window.innerWidth}x${window.innerHeight} ` +
          `hit=${hit?.tagName ?? 'none'} previous=${previous ?? 'none'}`
      )
    }
    previous = ready ? box : undefined
    // 滚动后布局可能继续位移（sticky chrome、toast 偏移），每轮不满足都重新纠正位置。
    if (!ready) trigger.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' })
    // rAF 停摆时定时器兜底，保证 deadline 仍会被检查。
    let timer: ReturnType<typeof setTimeout> | undefined
    await new Promise<void>(resolveWait => {
      const frame = requestAnimationFrame(() => {
        if (timer !== undefined) clearTimeout(timer)
        resolveWait()
      })
      timer = setTimeout(() => {
        cancelAnimationFrame(frame)
        resolveWait()
      }, pollIntervalMs)
    })
  }
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
    expect(wrapper.text()).toContain('Variants, sizes, icons, loading states')
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
    await clickSegmentedTrigger(sizes, 'React')
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
    await clickSegmentedTrigger(sizes, 'Vue')
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
