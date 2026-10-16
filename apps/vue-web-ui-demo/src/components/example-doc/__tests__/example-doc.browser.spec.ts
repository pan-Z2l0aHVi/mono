import '@/assets/global.css'
import '@/generated/examples.css'
// 同理：layout 的默认值断言直接建元素，得把组件模块拉进来才会升级。
import '@greypan/web-ui/components/layout'
// 主题宿主得自己注册：本文件里没有 `<web-ui-theme>` 的模板用法，unplugin 的注入扫不到这个标签。
import '@greypan/web-ui/components/theme'

import type { WebUiLayout, WebUiSegmented, WebUiSegmentedTrigger, WebUiSlider } from '@greypan/web-ui'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import { nextTick } from 'vue'

import { setViewport } from '@/__tests__/viewport'
// `?raw` 读的是 `import.meta.glob` 拿去编译的同一个文件：这条断言把「页面上显示的那份」直接钉到
// 「被执行的那份」上，中间不经过 payload 与围栏的等价推定。
import basicSource from '@/generated/demos/slider--basic.vue?raw'
import controlledSource from '@/generated/demos/slider--controlled.vue?raw'
import marksSource from '@/generated/demos/slider--marks-vertical.vue?raw'
import { exampleDocs } from '@/generated/examples'

import ExampleDoc from '../index.vue'

/*
 * 与 React 面同一组断言，量的是「同一份生成数据在 vue demo 里渲染出同样的东西」。
 * 两侧逐字节相同的生成数据由 `scripts/example-docs.test.mjs` 保证，这里补上
 * 「渲染真的用上了它」：代码块的颜色在真实引擎里落到 DOM 上，带 `{#id}` 锚点的示例真的挂成
 * 了可交互组件。
 *
 * `attachTo` 是必需的：@vue/test-utils 默认挂到脱离文档的元素上，那种节点 `getComputedStyle`
 * 只会回空串，颜色断言会变成一句永远失败的噪声。
 */

const slider = exampleDocs.find(doc => doc.component === 'slider')
const button = exampleDocs.find(doc => doc.component === 'button')
const collapse = exampleDocs.find(doc => doc.component === 'collapse')
const imagePreview = exampleDocs.find(doc => doc.component === 'image-preview')
const layout = exampleDocs.find(doc => doc.component === 'layout')
const segmentedTrigger = exampleDocs.find(doc => doc.component === 'segmented-trigger')
if (!slider || !button || !collapse || !imagePreview || !layout || !segmentedTrigger)
  throw new Error('生成数据里缺少 slider / button / collapse / image-preview / layout / segmented-trigger')

/** demoKey → 落盘文件字节；少一条就在断言里直接报出来，不留「这条没被覆盖」的静默缺口。 */
const demoSources: Record<string, string> = {
  basic: basicSource,
  controlled: controlledSource,
  'marks-vertical': marksSource
}

// 生成样式让 token 取 shiki 双主题里的浅色那一边。按 span 自己带的 `--shiki-light` 取色，
// 因为 `<pre>` 上第一个 span 往往是正文色（#24292E），拿它当「被着色的关键字」会稳定测错。
const KEYWORD_SELECTOR = 'span[style*="--shiki-light:#D73A49"]'
const KEYWORD_LIGHT = 'rgb(215, 58, 73)'
const KEYWORD_DARK = 'rgb(249, 117, 131)'

type Doc = NonNullable<typeof button>

const wrappers: VueWrapper[] = []

function mountDoc(component: string, attachTo?: HTMLElement) {
  const wrapper = mount(ExampleDoc, { props: { component }, attachTo: attachTo ?? document.body })
  wrappers.push(wrapper)
  return wrapper.element as HTMLElement
}

function rowsOf(element: HTMLElement, key: string) {
  const section = element.querySelector(`[data-example-api="${key}"]`)
  if (!section) throw new Error(`API 小节 ${key} 没有渲染`)
  return [...section.querySelectorAll('tbody tr')].map(row =>
    [...row.querySelectorAll('td')].map(cell => cell.textContent)
  )
}

function apiSection(doc: Doc, key: string) {
  const section = doc.api.find(candidate => candidate.key === key)
  if (!section) throw new Error(`生成数据里缺少 ${doc.component} 的 ${key}`)
  return section
}

function sample(element: HTMLElement, title: string) {
  const node = element.querySelector(`[data-sample="${title}"]`)
  if (!node) throw new Error(`示例「${title}」没有渲染`)
  return node as HTMLElement
}

function keyword(element: HTMLElement) {
  const node = element.querySelector<HTMLElement>(`pre.shiki ${KEYWORD_SELECTOR}`)
  if (!node) throw new Error('代码块里没有关键字 token')
  return node
}

// live 示例是 defineAsyncComponent：先等三份 demo 真的挂上，再等 Lit 自己的更新周期落地。
async function mountDemos(element: HTMLElement) {
  // 超时给到 8 秒：第一份 demo 的 dynamic import 是冷的，要等 dev server 现转源码，默认 1 秒不够；
  // 与 React 面同一口径（`example-doc.browser.spec.tsx` 的 `mountDemos`）。
  await vi.waitFor(() => expect(element.querySelectorAll('[data-sample-preview] web-ui-slider')).toHaveLength(3), {
    timeout: 8000
  })
  await nextTick()
  for (const host of element.querySelectorAll<WebUiSlider>('web-ui-slider')) await host.updateComplete
}

function sliderIn(element: HTMLElement, title: string) {
  const host = sample(element, title).querySelector<WebUiSlider>('web-ui-slider')
  if (!host) throw new Error(`示例「${title}」没有渲染出 web-ui-slider`)
  // 影子树里有 role="slider" = 元素真的被注册升级过，不是留着未知标签的空壳。
  if (!host.shadowRoot?.querySelector('[role="slider"]')) throw new Error(`示例「${title}」的 slider 没有升级`)
  return host
}

// segmented-trigger 的 live 示例同样是 defineAsyncComponent，等两个宿主与它们的子 trigger 都升级完。
async function mountSegmented(element: HTMLElement) {
  await vi.waitFor(() => expect(element.querySelectorAll('[data-sample-preview] web-ui-segmented')).toHaveLength(2), {
    timeout: 8000
  })
  await nextTick()
  for (const host of element.querySelectorAll<WebUiSegmented>('web-ui-segmented')) await host.updateComplete
  for (const host of element.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger'))
    await host.updateComplete
}

function segmentedIn(element: HTMLElement, title: string) {
  const host = sample(element, title).querySelector<WebUiSegmented>('web-ui-segmented')
  if (!host) throw new Error(`示例「${title}」没有渲染出 web-ui-segmented`)
  return host
}

function triggersOf(host: WebUiSegmented) {
  return [...host.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')]
}

// 事件源是影子树里的 role="option"：host 上的点击不会进入影子树，直接点 host 打不到 handler。
function optionOf(trigger: WebUiSegmentedTrigger) {
  const option = trigger.shadowRoot?.querySelector<HTMLElement>('[role="option"]')
  if (!option) throw new Error('web-ui-segmented-trigger 的影子树里没有 role="option"')
  return option
}

/** markdown 默认值单元格 → 元素侧的比较值：去掉反引号与字面量引号，`—` 表示空串。 */
function documentedDefault(cell: string | undefined) {
  const raw = (cell ?? '').replaceAll('`', '')
  return raw === '—' ? '' : raw.replace(/^'|'$/g, '')
}

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

describe('example-doc（Vue 面 / 真实浏览器）', () => {
  it('示例逐条来自 markdown，代码块在真实引擎里带了颜色', () => {
    const element = mountDoc('button')

    expect(element.querySelector('[data-example-intro]')?.textContent).toBe(
      new DOMParser().parseFromString(button.introHtml, 'text/html').body.textContent?.trim()
    )
    expect([...element.querySelectorAll('[data-sample]')].map(node => node.getAttribute('data-sample'))).toEqual(
      button.samples.map(candidate => candidate.title)
    )

    const code = element.querySelector('pre.shiki')
    expect(code, '示例代码必须是 shiki 产出的 <pre>').not.toBeNull()
    expect(code?.classList.contains('mdc-code')).toBe(true)
    // token 自己只带 `--shiki-light` 这个变量，落到文字上靠的是生成样式那条 `color: var(...)`。
    expect(getComputedStyle(keyword(element)).color).toBe(KEYWORD_LIGHT)
  })

  it('渲染的是 vue 那一份代码，不是 react 的', () => {
    const element = mountDoc('slider')
    const payload = slider.samples.find(candidate => candidate.title === '受控值')?.html.vue
    if (!payload) throw new Error('生成数据里缺少受控值的 vue 代码')

    const code = sample(element, '受控值').querySelector('pre.shiki')
    expect(code?.textContent).toContain('@input')
    expect(code?.textContent).not.toContain('useState')
    // 生成的 HTML 片段经 v-html 落地后必须与 payload 同构；先解析一次，让两侧走同一套序列化
    // （`&#x3C;` 在 DOM 里都会写回 `&lt;`），否则比的是转义写法而不是内容。
    const parsed = new DOMParser().parseFromString(payload, 'text/html').querySelector('pre')
    expect(code?.innerHTML).toBe(parsed?.innerHTML)
    expect(code?.textContent).toBe(parsed?.textContent)
  })

  it('每条带锚点的示例，页面 <pre> 的可见文本就是那份落盘文件', async () => {
    const element = mountDoc('slider')
    await mountDemos(element)

    // 逐条比，而不是只比一条：这条契约的覆盖面就是「所有带锚点的示例」，改名或改围栏时
    // 恰恰是没被断言盖住的那条会漂。文件字节 = 可见文本 + 一个行尾换行（见 `demoFileContent`），
    // 写成 `trimEnd()` 会把「文件末尾多一个空行」这类形状放掉。
    for (const candidate of slider.samples) {
      if (!candidate.demoKey) continue
      const source = demoSources[candidate.demoKey]
      if (source === undefined) throw new Error(`生成数据里的 demoKey「${candidate.demoKey}」没有落盘文件`)
      const text = sample(element, candidate.title).querySelector('pre.shiki')?.textContent ?? ''
      expect(`${text}\n`).toBe(source)
    }
  })

  it('外观切到深色时，token 换用 --shiki-dark', async () => {
    const plain = mountDoc('button')
    expect(getComputedStyle(keyword(plain)).color).toBe(KEYWORD_LIGHT)

    // 生成样式的深色判定读的是 web-ui-theme 的 resolved-appearance，所以把示例挂进一个真实的
    // 主题宿主；resolved-appearance 是组件的派生输出，只能由 appearance 驱动，直接写会被它自己覆盖回去。
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'dark')
    document.body.append(theme)
    mountDoc('button', theme)
    await vi.waitFor(() => expect(theme.getAttribute('resolved-appearance')).toBe('dark'))
    expect(getComputedStyle(keyword(theme)).color).toBe(KEYWORD_DARK)
    theme.remove()
  })

  it('带锚点的示例挂成真组件，没锚点的只有代码', async () => {
    const element = mountDoc('slider')
    const previews = [...element.querySelectorAll('[data-sample-preview]')]
    expect(previews.map(node => node.getAttribute('data-sample-preview'))).toEqual(
      slider.samples.map(candidate => candidate.demoKey).filter(Boolean)
    )
    await mountDemos(element)
    expect(sliderIn(element, '基础').value).toBe(40)

    expect(mountDoc('button').querySelector('[data-sample-preview]')).toBeNull()
  })

  it('页面上写的数字，就是屏幕上跑起来的那个值', async () => {
    const element = mountDoc('slider')
    await mountDemos(element)

    // 代码块与 demo 文件同源，所以从渲染出来的 `<pre>` 文本里读到的取值，必须等于被执行那份源码
    // 传进组件的 props——这一条在浏览器层把「显示」和「执行」接上了。
    expect(sample(element, '基础').querySelector('pre.shiki')?.textContent).toMatch(
      /:min="0" :max="100" :step="5" :value="40"/
    )
    const basic = sliderIn(element, '基础')
    expect([basic.min, basic.max, basic.step, basic.value]).toEqual([0, 100, 5, 40])

    expect(sample(element, '刻度与垂直方向').querySelector('pre.shiki')?.textContent).toMatch(/marks vertical/)
    const vertical = sliderIn(element, '刻度与垂直方向')
    expect([vertical.marks, vertical.vertical]).toEqual([true, true])
  })

  it('示例是活的：键盘能改值', async () => {
    const element = mountDoc('slider')
    await mountDemos(element)

    const host = sliderIn(element, '受控值')
    expect(host.value).toBe(30)
    const thumb = host.shadowRoot?.querySelector<HTMLElement>('[role="slider"]')
    if (!thumb) throw new Error('web-ui-slider 的影子树里没有 role="slider"')

    thumb.focus()
    await userEvent.keyboard('{ArrowRight}')
    await vi.waitFor(() => expect(host.value).toBe(31))
  })

  it('props 表把 markdown 里手写的类型与默认值原样渲染出来', () => {
    const element = mountDoc('collapse')
    const props = apiSection(collapse, 'props')
    const rows = rowsOf(element, 'props')

    expect(rows.map(cells => cells[0])).toEqual(props.rows.map(row => row.name))
    // `boolean` / `false` 写在 collapse.md 的 Props 表里：表格是这份数据的唯一来源，
    // 所以这一条钉的是 markdown → 生成 payload → DOM 这三跳没有走样，不是「源码说了算」。
    expect(rows.find(cells => cells[0] === 'open')?.slice(1)).toEqual(['boolean', 'false', expect.any(String)])

    const sliderRows = rowsOf(mountDoc('slider'), 'props')
    expect(sliderRows.find(cells => cells[0] === 'max')?.slice(1)).toEqual(['number', '100', expect.any(String)])
  })

  it('options 表（命令式 API 的选项）与 props 表一样渲染类型与默认值两列', () => {
    const rows = rowsOf(mountDoc('image-preview'), 'options')

    expect(rows.map(cells => cells[0])).toEqual(apiSection(imagePreview, 'options').rows.map(row => row.name))
    // #360：元素 `@property` 里没有的 `index` / `target` / `container` 也在这一节里，
    // 所以这三个字段是「表格是手写的唯一来源」这条契约的直接证据。
    expect(rows.find(cells => cells[0] === 'index')?.slice(1)).toEqual(['number', '0', expect.any(String)])
    expect(rows.find(cells => cells[0] === 'target')?.slice(1)).toEqual(['Element', '—', expect.any(String)])
    expect(rows.find(cells => cells[0] === 'container')?.slice(1)).toEqual(['HTMLElement', '—', expect.any(String)])
  })

  it('events 与 slots 表按 markdown 的小节生成，没写就不出现', () => {
    const element = mountDoc('collapse')
    expect(rowsOf(element, 'events').map(cells => cells[0])).toEqual(['open-change'])
    expect(rowsOf(element, 'slots').map(cells => cells[0])).toEqual(
      apiSection(collapse, 'slots').rows.map(row => row.name)
    )

    const sliderElement = mountDoc('slider')
    expect(rowsOf(sliderElement, 'events').map(cells => cells[0])).toEqual(['input', 'change'])
    // 两列小节不会被多渲染出类型与默认值两格：列形状只由行带不带 `type` 决定。
    expect(rowsOf(sliderElement, 'events').map(cells => cells.length)).toEqual([2, 2])

    // button.md 没写 ### Events 小节，就不该凭空多出一张 Events 表。
    expect(mountDoc('button').querySelector('[data-example-api="events"]')).toBeNull()
  })

  it('methods 表列出手写的方法，没写方法的组件不留空表', () => {
    const rows = rowsOf(mountDoc('collapse'), 'methods')

    // 名称单元格写成调用形态（`show()` / `replay(options?)`），与 Props / Events 的裸属性名不同：
    // 这一节记的是挂在元素上的方法，不是声明式契约。
    expect(rows.map(cells => cells[0])).toEqual(apiSection(collapse, 'methods').rows.map(row => row.name))
    expect(rows.map(cells => cells[0])).toEqual(['show()', 'close()', 'toggle()'])
    // 两列小节不会被多渲染出类型与默认值两格。
    expect(rows.map(cells => cells.length)).toEqual([2, 2, 2])

    // button.md 没有方法可写，就不该凭空多出一张 Methods 表。
    expect(mountDoc('button').querySelector('[data-example-api="methods"]')).toBeNull()
  })

  it('layout 的三张 API 表来自 markdown，示例只有代码没有 live 预览', () => {
    const element = mountDoc('layout')

    for (const key of ['props', 'events', 'slots'] as const) {
      expect(
        rowsOf(element, key).map(cells => cells[0]),
        `${key} 表的行名`
      ).toEqual(apiSection(layout, key).rows.map(row => row.name))
    }
    expect(rowsOf(element, 'props').map(cells => cells.length)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4])

    expect([...element.querySelectorAll('[data-sample]')].map(node => node.getAttribute('data-sample'))).toEqual(
      layout.samples.map(candidate => candidate.title)
    )
    // layout 的示例是纯展示片段（没有 `{#id}` 锚点）：整页布局嵌进文档页会和外层 shell 抢 sticky
    // header，真实交互由手写的 layout-demo 页面演示，文档页只出代码。
    expect(element.querySelector('[data-sample-preview]')).toBeNull()
  })

  it('layout props 表里手写的默认值，就是元素实际的默认值', async () => {
    const restored = { width: window.innerWidth, height: window.innerHeight }
    const host = document.createElement('web-ui-layout')
    try {
      // `mobile` 是视口派生的只读输出，而这一档默认跑在 414px 宽的窄视口里（vitest browser
      // 的默认 viewport）；先钉到桌面宽度，整张表才都按桌面分支的初值比较。
      await setViewport(1280, 800)
      document.body.append(host)
      await host.updateComplete

      // 「默认值」这一列是手写的，与元素 `@property` 的初值之间原本没有任何守卫：`collapsed-width`
      // 在源码里从 '72px' 改成 '68px' 时 README 就漏改过一次。这里把两处直接钉在一起，
      // 加属性忘了写进表格也会红。
      const actual: Record<string, string> = {
        'sidebar-collapsed': String(host.sidebarCollapsed),
        'sidebar-open': String(host.sidebarOpen),
        'header-glow': String(host.headerGlow),
        mobile: String(host.mobile),
        'sidebar-width': host.sidebarWidth,
        'collapsed-width': host.collapsedWidth,
        'sidebar-resizable': String(host.sidebarResizable),
        'sidebar-min-width': host.sidebarMinWidth,
        'sidebar-max-width': host.sidebarMaxWidth
      }
      const props = apiSection(layout, 'props')
      expect(Object.keys(actual).sort()).toEqual(props.rows.map(row => row.name).sort())
      for (const row of props.rows) {
        expect(actual[row.name], `${row.name} 的默认值与元素初值不一致`).toBe(documentedDefault(row.default))
      }
    } finally {
      host.remove()
      await setViewport(restored.width, restored.height)
    }
  })

  it('segmented-trigger 的 live 示例挂成真组件，点击推进父级状态、禁用项不动', async () => {
    const element = mountDoc('segmented-trigger')
    expect(
      [...element.querySelectorAll('[data-sample-preview]')].map(node => node.getAttribute('data-sample-preview'))
    ).toEqual(segmentedTrigger.samples.map(candidate => candidate.demoKey).filter(Boolean))
    await mountSegmented(element)

    const basic = segmentedIn(element, '基础')
    const triggers = triggersOf(basic)
    expect(triggers.map(trigger => trigger.value)).toEqual(['day', 'week', 'month'])
    expect(triggers.map(trigger => trigger.checked)).toEqual([true, false, false])

    // 点击第 2 项：trigger 只派发一个不冒泡的 change，父级 segmented 的 GroupController 捕获它、改自己
    // 的 value，再把 checked 铺回各项。这条走的是 trigger → 父级 → 父级派发 input 这条链路；因为父级在
    // 派发之前就已经写好了自己的 value，这两条断言量的是那条链路本身，量不到围栏里 `@input` 那次回写。
    optionOf(triggers[1]).click()
    await vi.waitFor(() => expect(basic.value).toBe('week'))
    expect(triggers.map(trigger => trigger.checked)).toEqual([false, true, false])

    // 禁用这一半是有区分度的：没有 `_isDisabled` 门，点击会把组值推到 `grid`。
    const disabled = segmentedIn(element, '单独禁用')
    const items = triggersOf(disabled)
    expect(items.map(trigger => trigger.disabled)).toEqual([false, true])
    optionOf(items[1]).click()
    expect(disabled.value).toBe('list')
  })
})
