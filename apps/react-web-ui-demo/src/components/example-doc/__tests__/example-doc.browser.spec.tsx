import '@/assets/global.css'
import '@/generated/examples.css'

import type {
  WebUiCheckbox,
  WebUiCollapse,
  WebUiDrawer,
  WebUiLayout,
  WebUiSegmented,
  WebUiSegmentedTrigger,
  WebUiSlider,
  WebUiTooltip
} from '@greypan/web-ui'
import { akarIconsCircleCheck, lucideCircleAlert, lucideCopy } from '@greypan/web-ui/icons'
import { cleanup, render, waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { setViewport } from '@/__tests__/viewport'
// `?raw` 读的是 `import.meta.glob` 拿去编译的同一个文件：这条断言把「页面上显示的那份」直接钉到
// 「被执行的那份」上，中间不经过 payload 与围栏的等价推定。
import basicSource from '@/generated/demos/slider--basic.tsx?raw'
import eventsSource from '@/generated/demos/slider--events.tsx?raw'
import formSource from '@/generated/demos/slider--form.tsx?raw'
import marksSource from '@/generated/demos/slider--marks.tsx?raw'
import sizingSource from '@/generated/demos/slider--sizing.tsx?raw'
import verticalSource from '@/generated/demos/slider--vertical.tsx?raw'
import { exampleDocs } from '@/generated/examples'

import ExampleDoc from '..'
import { reactIcon, vueIcon } from '../flavor-icons'

/*
 * 这一档量的是「markdown 生成的数据真的变成了页面」：示例条数与标题取自生成数据、代码块的颜色在
 * 真实浏览器里真的落到 DOM 上、带 `{#id}` 锚点的示例真的挂成了可交互组件。
 * jsdom 层能证明结构，但证明不了 shiki 的 `--shiki-light` 有没有被生成样式取用，也证明不了自定义
 * 元素有没有被升级——那两件事都需要真实引擎。
 */

const slider = exampleDocs.find(doc => doc.component === 'slider')
const button = exampleDocs.find(doc => doc.component === 'button')
const imagePreview = exampleDocs.find(doc => doc.component === 'image-preview')
const collapse = exampleDocs.find(doc => doc.component === 'collapse')
const layout = exampleDocs.find(doc => doc.component === 'layout')
const theme = exampleDocs.find(doc => doc.component === 'theme')
const segmentedTrigger = exampleDocs.find(doc => doc.component === 'segmented-trigger')
const drawer = exampleDocs.find(doc => doc.component === 'drawer')
if (!slider || !button || !imagePreview || !collapse || !layout || !theme || !segmentedTrigger || !drawer)
  throw new Error(
    '生成数据里缺少 slider / button / image-preview / collapse / layout / theme / segmented-trigger / drawer'
  )

/** demoKey → 落盘文件字节；少一条就在断言里直接报出来，不留「这条没被覆盖」的静默缺口。 */
const demoSources: Record<string, string> = {
  basic: basicSource,
  marks: marksSource,
  vertical: verticalSource,
  events: eventsSource,
  form: formSource,
  sizing: sizingSource
}

// 生成样式让 token 取 shiki 双主题里的浅色那一边。这里按 span 自己带的 `--shiki-light` 取色，
// 因为 `<pre>` 上第一个 span 往往是正文色（#24292E），拿它当「被着色的关键字」会稳定测错。
const KEYWORD_SELECTOR = 'span[style*="--shiki-light:#D73A49"]'
const KEYWORD_LIGHT = 'rgb(215, 58, 73)'
const KEYWORD_DARK = 'rgb(249, 117, 131)'

function sectionRows(container: HTMLElement, key: string) {
  const section = container.querySelector(`[data-example-api="${key}"]`)
  if (!section) throw new Error(`API 小节 ${key} 没有渲染`)
  return [...section.querySelectorAll('tbody tr')].map(row =>
    [...row.querySelectorAll('td')].map(cell => cell.textContent)
  )
}

function apiSection(doc: NonNullable<typeof button>, key: string) {
  const section = doc.api.find(candidate => candidate.key === key)
  if (!section) throw new Error(`生成数据里缺少 ${doc.component} 的 ${key}`)
  // 断言只对表格小节有意义：散文小节没有 `rows` / `columns`，取错小节要在这里红，
  // 而不是让 `rows.map` 悄悄对 undefined 求值。
  if (section.kind !== 'table') throw new Error(`${doc.component} 的 ${key} 不是表格小节`)
  return section
}

/** 按列标题取该列的下标：列形状由 markdown 的表头定，测试跟着标题找，不写死序号。 */
function columnOf(section: { columns: { title: string }[] }, title: string) {
  const index = section.columns.findIndex(column => column.title === title)
  if (index < 0) throw new Error(`小节里没有「${title}」列`)
  return index
}

function sectionHeaders(container: HTMLElement, key: string) {
  const section = container.querySelector(`[data-example-api="${key}"]`)
  if (!section) throw new Error(`API 小节 ${key} 没有渲染`)
  return [...section.querySelectorAll('thead th')].map(th => th.textContent)
}

/** 按行名与列标题取一格：位置由 markdown 的表头定，所以测试也按标题找值。 */
function cellOf(rows: (string | null)[][], section: { columns: { title: string }[] }, name: string, title: string) {
  const row = rows.find(cells => cells[0] === name)
  if (!row) throw new Error(`表格里没有 \`${name}\` 这一行`)
  return row[columnOf(section, title)]
}

function sample(container: HTMLElement, title: string) {
  const element = container.querySelector(`[data-sample="${title}"]`)
  if (!element) throw new Error(`示例「${title}」没有渲染`)
  return element
}

function keyword(container: HTMLElement) {
  const element = container.querySelector<HTMLElement>(`pre.shiki ${KEYWORD_SELECTOR}`)
  if (!element) throw new Error('代码块里没有关键字 token')
  return element
}

/** 一条示例该有几个 slider 宿主，数的是那份落盘源码里 `<web-ui-slider` 标签的个数。 */
function expectedSliders(demoKey: string | null | undefined) {
  const source = demoKey ? demoSources[demoKey] : undefined
  if (!source) throw new Error(`slider--${demoKey ?? '(无锚点)'} 的源码没有导入，测不到它该挂几个宿主`)
  return (source.match(/<web-ui-slider/g) ?? []).length
}

// 函数声明里的引用不吃模块作用域的窄化（声明可以被提前调用），所以「生成数据里确实有 slider」
// 这一条在模块作用域先落一次，`mountDemos` 再用它。
const sliderSamples = slider.samples

// live 示例是 lazy 的：不先把六份 demo 等齐，Suspense 会在断言之后才落地，React 的 act 环境
// 于是报「suspended resource finished loading inside a test, but not wrapped in act」。
//
// 这里的等待用 RTL 的 `waitFor`，而且**不**包进 `act`：`waitFor` 轮询期间会把
// `IS_REACT_ACT_ENVIRONMENT` 暂时关掉（root.browser.spec.tsx 的 `settleViewport` 记了同一条口径），
// 落在这个窗口里的 lazy 结算因此不再被记账。反过来把 `waitFor` 塞进 `act` 会得到
// 「not configured to support act」，而且那份结算没人 flush，等到超时依然是空的。
async function mountDemos(container: HTMLElement) {
  // 超时给到 8 秒：第一份 demo 的 dynamic import 是冷的，要等 dev server 现转源码，默认 1 秒不够；
  // 之后同一轮里模块已缓存，等到的就是真实挂载时间。
  //
  // 判据是逐条示例的宿主数，期望值现算自 demo 源码：语料里加一个 slider，这里就要求预览里
  // 真的多挂一个；只按「每个预览至少一个」判会放过局部没结算完的情况。
  const expected = sliderSamples.map(candidate => [candidate.title, expectedSliders(candidate.demoKey)] as const)
  await waitFor(
    () => {
      for (const [title, count] of expected) {
        const mounted = sample(container, title).querySelectorAll('web-ui-slider').length
        if (mounted !== count) throw new Error(`示例「${title}」挂了 ${mounted} 个 slider，源码里写的是 ${count} 个`)
      }
    },
    { timeout: 8000 }
  )
  await act(async () => {
    for (const host of container.querySelectorAll<WebUiSlider>('web-ui-slider')) await host.updateComplete
  })
}

/** 一条示例里可以摆多个宿主，所以要指明取第几个。 */
function sliderIn(container: HTMLElement, title: string, index = 0) {
  const host = [...sample(container, title).querySelectorAll<WebUiSlider>('web-ui-slider')][index]
  if (!host) throw new Error(`示例「${title}」的第 ${index + 1} 个位置没有渲染出 web-ui-slider`)
  // 影子树里有 role="slider" = 元素真的被注册升级过，不是留着未知 tag 的空壳。
  if (!host.shadowRoot?.querySelector('[role="slider"]')) throw new Error(`示例「${title}」的 slider 没有升级`)
  return host
}

// segmented-trigger 的 live 示例同样是 lazy 的，等两个宿主与它们的子 trigger 都升级完。
async function mountSegmented(container: HTMLElement) {
  await waitFor(
    () => {
      const mounted = container.querySelectorAll('[data-sample-preview] web-ui-segmented')
      if (mounted.length !== 2) throw new Error(`live 示例只挂载了 ${mounted.length} 个 web-ui-segmented`)
    },
    { timeout: 8000 }
  )
  await act(async () => {
    for (const host of container.querySelectorAll<WebUiSegmented>('web-ui-segmented')) await host.updateComplete
    for (const host of container.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger'))
      await host.updateComplete
  })
}

// Lit 首帧是异步的：collapse 的影子树落地前，light DOM 里的代码块没有被 slot 分配，
// getComputedStyle 会读到空串；样式与可见性断言先等宿主渲染完。
async function settleCollapses(container: HTMLElement) {
  await act(async () => {
    for (const host of container.querySelectorAll<WebUiCollapse>('web-ui-collapse')) await host.updateComplete
  })
}

// drawer 页 14 条示例全是 lazy 组件：先把它们结算完，避免 Suspense 在断言之后落地触发 act 告警。
async function mountDrawerDemos(container: HTMLElement) {
  const total = drawer?.samples.length ?? 0
  await waitFor(
    () => {
      const mounted = container.querySelectorAll('[data-sample] web-ui-drawer')
      if (mounted.length < total) throw new Error(`live 示例只挂载了 ${mounted.length} / ${total} 个 drawer`)
    },
    { timeout: 8000 }
  )
}

function segmentedIn(container: HTMLElement, title: string) {
  const host = sample(container, title).querySelector<WebUiSegmented>('web-ui-segmented')
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

describe('example-doc（React 面 / 真实浏览器）', () => {
  afterEach(cleanup)

  it('示例逐条来自 markdown，代码块在真实引擎里带了颜色', async () => {
    const { container } = render(<ExampleDoc component="button" />)
    await settleCollapses(container)

    expect(container.querySelector('[data-example-intro]')?.innerHTML).toBe(button.introHtml)
    expect(
      [...container.querySelectorAll('[data-sample]')].map(element => element.getAttribute('data-sample'))
    ).toEqual(button.samples.map(candidate => candidate.title))

    const code = container.querySelector('pre.shiki')
    expect(code, '示例代码必须是 shiki 产出的 <pre>').not.toBeNull()
    expect(code?.classList.contains('mdc-code')).toBe(true)
    // token 自己只带 `--shiki-light` 这个变量，落到文字上靠的是生成样式那条 `color: var(...)`。
    expect(getComputedStyle(keyword(container)).color).toBe(KEYWORD_LIGHT)
  })

  it('渲染的是 react 那一份代码，不是 vue 的', () => {
    const { container } = render(<ExampleDoc component="slider" />)
    const payload = slider.samples.find(candidate => candidate.title === '垂直方向')?.html.react
    if (!payload) throw new Error('生成数据里缺少垂直方向的 react 代码')

    const code = sample(container, '垂直方向').querySelector('pre.shiki')
    expect(code?.textContent).toContain('useState')
    expect(code?.textContent).not.toContain('<template>')
    // 生成的 HTML 片段经 dangerouslySetInnerHTML 落地后必须与 payload 逐字节同构；先解析一次，
    // 让两侧走同一套序列化（`&#x3C;` 在 DOM 里都会写回 `&lt;`），否则比的是转义写法而不是内容。
    const parsed = new DOMParser().parseFromString(payload, 'text/html').querySelector('pre')
    expect(code?.innerHTML).toBe(parsed?.innerHTML)
    expect(code?.textContent).toBe(parsed?.textContent)
  })

  it('每条带锚点的示例，页面 <pre> 的可见文本就是那份落盘文件', async () => {
    const { container } = render(<ExampleDoc component="slider" />)
    await mountDemos(container)

    // 逐条比，而不是只比一条：这条契约的覆盖面就是「所有带锚点的示例」，改名或改围栏时
    // 恰恰是没被断言盖住的那条会漂。文件字节 = 可见文本 + 一个行尾换行（见 `demoFileContent`），
    // 写成 `trimEnd()` 会把「文件末尾多一个空行」这类形状放掉。
    for (const candidate of slider.samples) {
      if (!candidate.demoKey) continue
      const source = demoSources[candidate.demoKey]
      if (source === undefined) throw new Error(`生成数据里的 demoKey「${candidate.demoKey}」没有落盘文件`)
      const text = sample(container, candidate.title).querySelector('pre.shiki')?.textContent ?? ''
      expect(`${text}\n`).toBe(source)
    }
  })

  it('外观切到深色时，token 换用 --shiki-dark', async () => {
    const { container, unmount } = render(<ExampleDoc component="button" />)
    await settleCollapses(container)
    expect(getComputedStyle(keyword(container)).color).toBe(KEYWORD_LIGHT)
    unmount()

    // 生成样式的深色判定读的是 web-ui-theme 的 resolved-appearance，所以这里套一个真实的主题宿主；
    // resolved-appearance 是组件的派生输出，只能由 appearance 驱动，直接写会被它自己覆盖回去。
    const { container: darkContainer } = render(
      <web-ui-theme appearance="dark">
        <ExampleDoc component="button" />
      </web-ui-theme>
    )
    await waitFor(() =>
      expect(darkContainer.querySelector('web-ui-theme')?.getAttribute('resolved-appearance')).toBe('dark')
    )
    await settleCollapses(darkContainer)
    expect(getComputedStyle(keyword(darkContainer)).color).toBe(KEYWORD_DARK)

    // 正文、说明、行内代码与表头也跟着换深色档，而不是只换代码 token。
    const intro = darkContainer.querySelector<HTMLElement>('[data-example-intro]')
    const description = darkContainer.querySelector<HTMLElement>('.mdc-markdown-secondary')
    const headCell = darkContainer.querySelector<HTMLElement>('[data-example-api="props"] th')
    const inlineCode = description?.querySelector('code')
    if (!intro || !description || !headCell || !inlineCode) throw new Error('深色 markdown 断言缺少节点')
    expect(getComputedStyle(intro).color).toBe('rgba(255, 255, 255, 0.81)')
    expect(getComputedStyle(description).color).toBe('rgba(255, 255, 255, 0.46)')
    expect(getComputedStyle(inlineCode).color).toBe('rgb(255, 115, 105)')
    expect(getComputedStyle(headCell).backgroundColor).toBe('rgba(255, 255, 255, 0.055)')
  })

  it('代码框架用 segmented 切换，点击与键盘都能换一份源码', async () => {
    const { container } = render(<ExampleDoc component="slider" />)
    await settleCollapses(container)
    const article = sample(container, '垂直方向')
    const segmented = segmentedIn(container, '垂直方向')
    const triggers = triggersOf(segmented)
    // React 站先把 React 排在前面：第一项就是这份代码默认展示的运行时。
    expect(triggers.map(trigger => trigger.textContent?.trim())).toEqual(['React', 'Vue'])
    // 名称前各挂一枚框架标记，且排在文字之前：tab 上的框架名靠形状认，比读字快。
    ;[reactIcon, vueIcon].forEach((icon, index) => {
      const prefix = triggers[index]?.querySelector('web-ui-icon')
      expect(prefix?.icon).toBe(icon)
      expect(triggers[index]?.querySelector('span')?.firstElementChild).toBe(prefix)
    })
    // 工具条用 raised 变体（indicator 浮在沉一档的 track 上），与页面底色的工具条区分开。
    expect(segmented.variant).toBe('raised')
    expect(segmented.value).toBe('react')
    expect(article.querySelector('[data-current-flavor]')?.getAttribute('data-current-flavor')).toBe('react')
    expect(article.querySelector('[data-code] pre')?.textContent).toContain('useState')

    await act(async () => optionOf(triggers[1]).click())
    await waitFor(() => expect(segmented.value).toBe('vue'))
    await waitFor(() =>
      expect(article.querySelector('[data-current-flavor]')?.getAttribute('data-current-flavor')).toBe('vue')
    )
    expect(article.querySelector('[data-code] pre')?.textContent).toContain('@input')
    expect(triggers.map(trigger => trigger.checked)).toEqual([false, true])

    await act(async () => {
      optionOf(triggers[0]).focus()
      await userEvent.keyboard('{Enter}')
    })
    await waitFor(() => expect(segmented.value).toBe('react'))
    await waitFor(() =>
      expect(article.querySelector('[data-current-flavor]')?.getAttribute('data-current-flavor')).toBe('react')
    )
    // 焦点留在被激活的 option 上：document.activeElement 只会看到 trigger 宿主。
    expect(triggers[0].shadowRoot?.activeElement).toBe(optionOf(triggers[0]))
  })

  it('复制按钮写入当前源码，成功与失败都换成对应 icon', async () => {
    const { container } = render(<ExampleDoc component="slider" />)
    await settleCollapses(container)
    const article = sample(container, '垂直方向')
    const copy = article.querySelector<HTMLElement>('[data-copy]')
    if (!copy) throw new Error('代码区没有复制按钮')
    await waitFor(() => expect(copy.shadowRoot?.querySelector('button')).toBeTruthy())
    expect(copy.getAttribute('aria-label')).toBe('复制代码')
    expect(copy.querySelector('web-ui-icon')?.icon).toBe(lucideCopy)
    // 描边宿主只在成功态出现：静止时按钮里就是一枚普通图标。
    expect(copy.querySelector('web-ui-svg-draw-lines')).toBeNull()

    const writes: string[] = []
    const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => void writes.push(text) }
    })

    try {
      await act(async () => copy.shadowRoot?.querySelector<HTMLElement>('button')?.click())
      await waitFor(() => expect(writes).toHaveLength(1))
      expect(writes[0]).toContain('useState')
      await waitFor(() => expect(copy.getAttribute('aria-label')).toBe('已复制'))
      expect(copy.querySelector('web-ui-icon')?.icon).toBe(akarIconsCircleCheck)
      // 成功图标挂在描边宿主里：勾与圆是被画出来的，不是淡进来的一张现成图。
      const drawn = copy.querySelector('web-ui-svg-draw-lines')
      expect(drawn?.querySelector('web-ui-icon')?.icon).toBe(akarIconsCircleCheck)
      expect(drawn?.duration).toBe(300)
      // 成功态用主题的成功绿，而不是沿用文字色。
      expect(copy.querySelector('web-ui-icon')?.classList.contains('text-(--wui-color-success)')).toBe(true)
      // tooltip 跟着反馈走：悬停时读到的也是「已复制」，不是一直停在「复制代码」。
      expect(article.querySelector<WebUiTooltip>('web-ui-tooltip')?.content).toBe('已复制')
      // 图标变化之外还有一条 live region，读屏器不依赖 aria-label 的变化也能听到结果。
      expect(article.querySelector('[aria-live="polite"]')?.textContent).toBe('已复制')
    } finally {
      if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard)
      else Reflect.deleteProperty(navigator, 'clipboard')
    }
  })

  it('复制失败时换成失败 icon，而不是静默吞掉', async () => {
    const { container } = render(<ExampleDoc component="slider" />)
    await settleCollapses(container)
    const article = sample(container, '垂直方向')
    const copy = article.querySelector<HTMLElement>('[data-copy]')
    if (!copy) throw new Error('代码区没有复制按钮')
    await waitFor(() => expect(copy.shadowRoot?.querySelector('button')).toBeTruthy())

    const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    const execCommand = Object.getOwnPropertyDescriptor(document, 'execCommand')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('denied')
        }
      }
    })
    Object.defineProperty(document, 'execCommand', { configurable: true, value: () => false })

    try {
      await act(async () => copy.shadowRoot?.querySelector<HTMLElement>('button')?.click())
      await waitFor(() => expect(copy.getAttribute('aria-label')).toBe('复制失败'))
      expect(copy.querySelector('web-ui-icon')?.icon).toBe(lucideCircleAlert)
      expect(copy.querySelector('web-ui-icon')?.classList.contains('text-(--wui-color-danger)')).toBe(true)
    } finally {
      if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard)
      else Reflect.deleteProperty(navigator, 'clipboard')
      if (execCommand) Object.defineProperty(document, 'execCommand', execCommand)
      else Reflect.deleteProperty(document, 'execCommand')
    }
  })

  it('drawer 页每条示例都有预览与代码，预览能真的打开 drawer', async () => {
    const { container } = render(<ExampleDoc component="drawer" />)
    await settleCollapses(container)
    await mountDrawerDemos(container)
    const articles = [...container.querySelectorAll<HTMLElement>('[data-sample]')]
    expect(articles.map(node => node.getAttribute('data-sample'))).toEqual(
      drawer.samples.map(candidate => candidate.title)
    )
    for (const article of articles) {
      const title = article.getAttribute('data-sample')
      expect(article.querySelector('[data-sample-preview]'), `${title}：已迁移示例缺少预览`).not.toBeNull()
      expect(article.querySelector('[data-code] pre'), `${title}：已迁移示例缺少代码`).not.toBeNull()
    }

    // 预览区必须单独取：工具条里的 web-ui-button 会先于异步 demo 升级，用整篇文章等会等错对象。
    const basic = sample(container, drawer.samples[0].title)
    const preview = basic.querySelector('[data-sample-preview]')
    await waitFor(
      () => {
        if (!preview?.querySelector('web-ui-button')?.shadowRoot?.querySelector('button'))
          throw new Error('基础示例的 web-ui-button 还没升级')
      },
      { timeout: 8000 }
    )
    const trigger = preview?.querySelector('web-ui-button')?.shadowRoot?.querySelector<HTMLElement>('button')
    const host = preview?.querySelector<WebUiDrawer>('web-ui-drawer')
    if (!trigger || !host) throw new Error('基础示例没有渲染出 button / drawer')
    await act(async () => trigger.click())
    await waitFor(() => expect(host.open).toBe(true))
    expect(host.shadowRoot?.querySelector('dialog')?.open).toBe(true)
  })

  it('drawer 关闭按钮示例：点文案也能勾选', async () => {
    const { container } = render(<ExampleDoc component="drawer" />)
    await settleCollapses(container)
    await mountDrawerDemos(container)
    const article = sample(container, '关闭按钮')
    const checkbox = article.querySelector<WebUiCheckbox>('web-ui-checkbox')
    const drawerHost = article.querySelector<WebUiDrawer>('web-ui-drawer')
    if (!checkbox || !drawerHost) throw new Error('关闭按钮示例没有渲染 checkbox / drawer')
    await waitFor(() => expect(checkbox.shadowRoot?.querySelector('label')).toBeTruthy())
    expect(checkbox.checked).toBe(true)
    expect(drawerHost.closable).toBe(true)

    // 文案放在组件默认槽里：点击落点命中内部 <label>，宿主与文案都能切换。
    await act(async () => userEvent.click(checkbox))
    await waitFor(() => expect(checkbox.checked).toBe(false))
    expect(drawerHost.closable).toBe(false)
  })

  it('代码区默认只露出 peek，展开与收起由工具条按钮控制', async () => {
    const { container } = render(<ExampleDoc component="button" />)
    await settleCollapses(container)
    const article = sample(container, button.samples[0].title)
    const host = article.querySelector<WebUiCollapse>('web-ui-collapse')
    const inner = host?.shadowRoot?.querySelector('.wui-collapse-inner')
    const toggle = article.querySelector<HTMLElement>('[data-toggle-code]')
    if (!host || !inner || !toggle) throw new Error('collapse 或展开按钮不完整')
    await waitFor(() => expect(toggle.shadowRoot?.querySelector('button')).toBeTruthy())

    expect(host.open).toBe(false)
    expect(host.peek).toBe('128px')
    expect(inner.hasAttribute('inert')).toBe(true)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    // 工具条只留图标：说明文字落在 aria-label 与 tooltip 上。
    expect(toggle.getAttribute('aria-label')).toBe('展开代码')
    const tooltips = [...article.querySelectorAll<WebUiTooltip>('web-ui-tooltip')]
    expect(tooltips.map(tooltip => tooltip.content)).toEqual(['复制代码', '展开代码'])

    await act(async () => toggle.shadowRoot?.querySelector<HTMLElement>('button')?.click())
    await waitFor(() => expect(host.open).toBe(true))
    await settleCollapses(container)
    expect(inner.hasAttribute('inert')).toBe(false)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(toggle.getAttribute('aria-label')).toBe('收起代码')
    expect(tooltips.map(tooltip => tooltip.content)).toEqual(['复制代码', '收起代码'])

    await act(async () => toggle.shadowRoot?.querySelector<HTMLElement>('button')?.click())
    await waitFor(() => expect(host.open).toBe(false))
    await settleCollapses(container)
    expect(inner.hasAttribute('inert')).toBe(true)
  })

  it('代码卡片圆角 16px，三段同色同边距，收起态渐隐带遮住 peek 六成以上', async () => {
    const { container } = render(<ExampleDoc component="slider" />)
    await settleCollapses(container)
    const article = sample(container, slider.samples[0].title)
    const card = article.querySelector<HTMLElement>('[data-current-flavor]')
    const preview = article.querySelector<HTMLElement>('[data-sample-preview]')
    const toolbar = article.querySelector<HTMLElement>('[data-flavor-switch]')?.parentElement
    const code = article.querySelector<HTMLElement>('[data-code]')
    const host = article.querySelector<WebUiCollapse>('web-ui-collapse')
    if (!card || !preview || !toolbar || !code || !host) throw new Error('代码卡片或工具条没有渲染')

    expect(getComputedStyle(card).borderRadius).toBe('16px')
    // 预览、工具条、代码区三段一律铺页面底色，卡片壳自己不铺底：深色下预览区不能再浮出一层。
    // 判据取 class 而不是 computed 底色：这一段没挂在 web-ui-theme 里，token 变量解析不出颜色，
    // 给卡片铺了底在这里同样算出透明。
    for (const node of [preview, toolbar, code]) {
      expect(node.classList.contains('bg-(--wui-color-page)')).toBe(true)
    }
    expect([...card.classList].some(name => name.startsWith('bg-'))).toBe(false)
    // 预览、工具条、代码区共用同一档左右内边距，内容边线才是齐的。
    expect([preview, toolbar, code].map(node => getComputedStyle(node).paddingLeft)).toEqual(['16px', '16px', '16px'])

    // 代码 12px；工具条抬到代码区之上，segmented 长按时向下的投影才不会被后绘制的折叠区盖掉。
    expect(getComputedStyle(code).fontSize).toBe('12px')
    expect(getComputedStyle(toolbar).position).toBe('relative')
    expect(getComputedStyle(toolbar).zIndex).toBe('10')
    // 但只在卡内抬：`isolate` 让这张卡自成一个 stacking context，否则同一个 10 会去和
    // 页面 header（`--wui-layer-header` 也是 10）比大小，后画的工具条直接盖到 header 上。
    expect(getComputedStyle(card).isolation).toBe('isolate')

    // peek 128px 至少容得下上边距加四行完整代码；被截断的那半行不是遮挡的主力。
    const style = getComputedStyle(code)
    const lineHeight = parseFloat(style.lineHeight)
    expect(parseFloat(host.peek ?? '0')).toBeGreaterThanOrEqual(parseFloat(style.paddingTop) + 4 * lineHeight)
    // 真正的「下面还有内容」由末端渐隐带说出，长度取 peek 的六成以上。组件把推导值写在影子树的
    // inner 上，且首帧会过渡到位，所以等到落稳再判，别把过渡中途的读数当成不达标。
    const peekInner = host.shadowRoot?.querySelector<HTMLElement>('.wui-collapse-inner')
    if (!peekInner) throw new Error('collapse 的影子树没有渲染')
    const peekLength = parseFloat(host.peek ?? '0')
    await waitFor(() =>
      expect(
        parseFloat(getComputedStyle(peekInner).getPropertyValue('--wui-collapse-peek-edge-active')) / peekLength
      ).toBeGreaterThanOrEqual(0.6)
    )
  })

  it('markdown 正文按 Notion 版式渲染：正文 / 标题 / 行内代码 / 表格', async () => {
    const { container } = render(<ExampleDoc component="slider" />)
    await settleCollapses(container)
    const article = sample(container, slider.samples[0].title)
    const intro = container.querySelector<HTMLElement>('[data-example-intro]')
    const description = article.querySelector<HTMLElement>('.mdc-markdown-secondary')
    const sectionHeading = container.querySelector<HTMLElement>('h2.mdc-heading')
    const sampleHeading = article.querySelector<HTMLElement>('h3.mdc-heading')
    const table = container.querySelector<HTMLElement>('[data-example-api="props"] table')
    const headCell = table?.querySelector('th')
    const inlineCode = description?.querySelector('code')
    if (!intro || !description || !sectionHeading || !sampleHeading || !table || !headCell || !inlineCode)
      throw new Error('markdown 版式断言缺少节点')

    // 正文跟页面正文字号 token（14px）/ 1.5、#37352f；说明弱一档。
    const body = getComputedStyle(intro)
    expect(body.fontSize).toBe('14px')
    expect(body.lineHeight).toBe('21px')
    expect(body.color).toBe('rgb(55, 53, 47)')
    expect(getComputedStyle(description).color).toBe('rgba(55, 53, 47, 0.65)')

    // 标题层级取自 Notion 的阅读页。
    expect(getComputedStyle(sectionHeading).fontSize).toBe('24px')
    expect(getComputedStyle(sampleHeading).fontSize).toBe('20px')

    // 行内代码：红字 + 灰底。
    expect(getComputedStyle(inlineCode).color).toBe('rgb(235, 87, 87)')
    expect(getComputedStyle(inlineCode).backgroundColor).toBe('rgba(135, 131, 120, 0.15)')

    // 表格字号靠 .mdc-markdown 继承（生成的 CSS 不给 table 重复声明），所以 table 与单元格都量：
    // 真有 UA 或宿主规则盖住表格时，红的是这条实测，不是某一行 CSS 文本。
    expect(getComputedStyle(table).fontSize).toBe('14px')
    expect(getComputedStyle(headCell).fontSize).toBe('14px')
    expect(getComputedStyle(headCell).padding).toBe('7px 9px')
    expect(getComputedStyle(headCell).borderTopColor).toBe('rgb(233, 233, 231)')
    expect(getComputedStyle(headCell).backgroundColor).toBe('rgba(242, 241, 238, 0.5)')
  })

  it('工具条空白处也能开合代码，内部控件不误触', async () => {
    const { container } = render(<ExampleDoc component="button" />)
    await settleCollapses(container)
    const article = sample(container, button.samples[0].title)
    const host = article.querySelector<WebUiCollapse>('web-ui-collapse')
    const bar = article.querySelector<HTMLElement>('[data-flavor-switch]')?.parentElement
    const segmented = article.querySelector<HTMLElement>('[data-flavor-switch]')
    if (!host || !bar || !segmented) throw new Error('工具条结构不完整')

    await act(async () => bar.click())
    await waitFor(() => expect(host.open).toBe(true))
    await act(async () => bar.click())
    await waitFor(() => expect(host.open).toBe(false))

    // segmented 自己 stop 掉冒泡：点它只切框架，不会顺带把代码区打开。
    await act(async () => segmented.click())
    expect(host.open).toBe(false)
  })

  it('收起代码后滚动位置复位，再次展开从顶部开始', async () => {
    // 只有长示例才能滚出真实位移：drawer 的「嵌套堆叠」源码有 60 多行，必然超过 32rem。
    const { container } = render(<ExampleDoc component="drawer" />)
    await settleCollapses(container)
    await mountDrawerDemos(container)
    const article = sample(container, '嵌套堆叠')
    const host = article.querySelector<WebUiCollapse>('web-ui-collapse')
    const code = article.querySelector<HTMLElement>('[data-code]')
    const toggle = article.querySelector<HTMLElement>('[data-toggle-code]')
    if (!host || !code || !toggle) throw new Error('collapse、代码区或展开按钮不完整')
    await waitFor(() => expect(toggle.shadowRoot?.querySelector('button')).toBeTruthy())
    const button = () => toggle.shadowRoot?.querySelector<HTMLElement>('button')

    await act(async () => button()?.click())
    await waitFor(() => expect(host.open).toBe(true))
    await settleCollapses(container)
    code.scrollTop = 300
    expect(code.scrollTop).toBe(300)

    await act(async () => button()?.click())
    await waitFor(() => expect(host.open).toBe(false))
    await settleCollapses(container)
    expect(code.scrollTop).toBe(0)
  })

  it('展开后的代码区有最大高度并自己滚动', async () => {
    const { container } = render(<ExampleDoc component="slider" />)
    await settleCollapses(container)
    const code = sample(container, '垂直方向').querySelector<HTMLElement>('[data-code]')
    if (!code) throw new Error('代码区没有 data-code')

    const style = getComputedStyle(code)
    expect(style.maxHeight).toBe('512px')
    expect(style.overflowY).toBe('auto')
  })

  it('带锚点的示例挂成真组件，没锚点的只有代码', async () => {
    const { container } = render(<ExampleDoc component="slider" />)
    const previews = [...container.querySelectorAll('[data-sample-preview]')]
    expect(previews.map(element => element.getAttribute('data-sample-preview'))).toEqual(
      slider.samples.map(candidate => candidate.demoKey).filter(Boolean)
    )
    await mountDemos(container)
    expect(sliderIn(container, '基础', 1).value).toBe(40)

    const buttonContainer = render(<ExampleDoc component="button" />).container
    expect(
      buttonContainer.querySelector('[data-sample-preview]'),
      'button 的示例没有锚点，不该生成 live 预览'
    ).toBeNull()
  })

  it('页面上写的数字，就是屏幕上跑起来的那个值', async () => {
    const { container } = render(<ExampleDoc component="slider" />)
    await mountDemos(container)

    // 代码块与 demo 文件同源，所以从渲染出来的 `<pre>` 文本里读到的取值，必须等于被执行那份源码
    // 传进组件的 props——这一条在浏览器层把「显示」和「执行」接上了。
    expect(sample(container, '基础').querySelector('pre.shiki')?.textContent).toMatch(
      /min=\{0\} max=\{100\} step=\{5\} value=\{40\}/
    )
    const basic = sliderIn(container, '基础', 1)
    expect([basic.min, basic.max, basic.step, basic.value]).toEqual([0, 100, 5, 40])

    // shiki 的 `<pre>` 里行与行之间没有文本节点分隔，所以逐属性判断，不比对跨行片段。
    const verticalCode = sample(container, '垂直方向').querySelector('pre.shiki')?.textContent ?? ''
    expect(verticalCode).toContain('vertical')
    expect(verticalCode).toContain('marks')
    const vertical = sliderIn(container, '垂直方向', 1)
    expect([vertical.marks, vertical.vertical]).toEqual([true, true])

    // CSS 变量示例写的也是「页面上的数字」：类里的 `--wui-slider-*` 要经生成的 `examples.css`
    // 落到宿主盒子上，量得到才说明这条示例真的在演示尺寸，而不是只剩一段没人用的类名。
    const sized = getComputedStyle(sliderIn(container, 'CSS 变量'))
    expect([sized.width, sized.height]).toEqual(['300px', '10px'])
  })

  it('示例是活的：键盘能改值', async () => {
    const { container } = render(<ExampleDoc component="slider" />)
    await mountDemos(container)

    const host = sliderIn(container, '垂直方向')
    expect(host.value).toBe(60)
    const thumb = host.shadowRoot?.querySelector<HTMLElement>('[role="slider"]')
    if (!thumb) throw new Error('web-ui-slider 的影子树里没有 role="slider"')

    // 触发动作是键盘本身，所以 act 边界落在按键上；React 把新 value 写回元素的那次回写可能
    // 在动作返回后才落地，因此结果用不包 act 的 `waitFor` 等（同 `mountDemos` 的口径）。
    await act(async () => {
      thumb.focus()
      await userEvent.keyboard('{ArrowRight}')
    })
    await waitFor(() => expect(host.value).toBe(61))
  })

  it('事件示例的读数跟着键盘走：onInput 与 onChange 真的接在 custom element 上', async () => {
    const { container } = render(<ExampleDoc component="slider" />)
    await mountDemos(container)

    const preview = sample(container, 'input 与 change').querySelector('[data-sample-preview]')
    const readout = () => preview?.querySelector('output')?.textContent?.trim()
    expect(readout()).toBe('input: 40 / change: 40')

    const host = sliderIn(container, 'input 与 change')
    const thumb = host.shadowRoot?.querySelector<HTMLElement>('[role="slider"]')
    if (!thumb) throw new Error('事件示例的 slider 没有升级')
    await act(async () => {
      thumb.focus()
      await userEvent.keyboard('{ArrowRight}')
    })
    // step 是 5，一次右箭头推进一档；两个读数一起动才说明两条 handler 都接上了。
    await waitFor(() => expect(readout()).toBe('input: 45 / change: 45'))
  })

  it('表单取值示例：提交带出滑块的值，重置把读数和值一起清掉', async () => {
    const { container } = render(<ExampleDoc component="slider" />)
    await mountDemos(container)

    const preview = sample(container, '表单取值').querySelector('[data-sample-preview]')
    if (!preview) throw new Error('表单取值示例没有 live 预览')
    const readout = () => preview.querySelector('output')?.textContent?.trim()
    // 提交动作的转发在影子 `<button>` 的 handler 里，点宿主不会触发 submit。
    const shadowButton = (label: string) => {
      const host = [...preview.querySelectorAll<HTMLElement>('web-ui-button')].find(
        item => item.textContent?.trim() === label
      )
      if (!host) throw new Error(`表单取值示例里没有「${label}」按钮`)
      return host.shadowRoot?.querySelector<HTMLElement>('button')
    }

    const slider = sliderIn(container, '表单取值')
    expect([readout(), slider.value]).toEqual(['尚未提交', 40])

    const thumb = slider.shadowRoot?.querySelector<HTMLElement>('[role="slider"]')
    if (!thumb) throw new Error('表单取值示例的 slider 没有升级')
    await act(async () => {
      thumb.focus()
      await userEvent.keyboard('{ArrowRight}')
    })
    // step 是 5，所以一次右箭头推进一档。
    await waitFor(() => expect(slider.value).toBe(45))

    await act(async () => shadowButton('提交')?.click())
    await waitFor(() => expect(readout()).toBe('volume=45'))

    await act(async () => shadowButton('重置')?.click())
    await waitFor(() => expect([readout(), slider.value]).toEqual(['尚未提交', 40]))
  })

  it('props 表里手写的默认值，就是 slider 元素的实际初值', async () => {
    const { container } = render(<ExampleDoc component="slider" />)
    await mountDemos(container)

    // 「基础」的第一条不写任何属性，正好当默认值样本：表里那一列是手写的，元素初值来自组件源码，
    // 两边对不上就是文档漏改（layout 那条同判据）。属性增删也会在这里红。
    const host = sliderIn(container, '基础')
    const actual: Record<string, string> = {
      disabled: String(host.disabled),
      marks: String(host.marks),
      vertical: String(host.vertical),
      name: host.name,
      required: String(host.required),
      value: String(host.value),
      min: String(host.min),
      max: String(host.max),
      step: String(host.step)
    }
    const props = apiSection(slider, 'props')
    const defaultColumn = columnOf(props, '默认值')
    expect(Object.keys(actual).sort()).toEqual(props.rows.map(row => row[0]).sort())
    for (const row of props.rows) {
      expect(actual[row[0]], `${row[0]} 的默认值与元素初值不一致`).toBe(documentedDefault(row[defaultColumn]))
    }
  })

  it('props 表把 markdown 里手写的类型与默认值原样渲染出来', () => {
    const { container } = render(<ExampleDoc component="slider" />)
    const props = apiSection(slider, 'props')
    const rows = sectionRows(container, 'props')

    expect(rows.map(cells => cells[0])).toEqual(props.rows.map(row => row[0]))
    // 列序照 markdown 的表头原样渲染：渲染端不认识哪一列是说明，它照 `columns` 逐列铺。
    expect(sectionHeaders(container, 'props')).toEqual(props.columns.map(column => column.title))
    // `boolean` / `false` / `100` 写在 slider.md 的 Props 表里：表格是这份数据的唯一来源，
    // 所以这一条钉的是 markdown → 生成 payload → DOM 这三跳没有走样，不是「源码说了算」。
    expect(cellOf(rows, props, 'marks', '类型')).toBe('boolean')
    expect(cellOf(rows, props, 'marks', '默认值')).toBe('false')
    expect(cellOf(rows, props, 'max', '默认值')).toBe('100')
  })

  it('options 表（命令式 API 的 option）与 props 表一样渲染类型与默认值两列', () => {
    const { container } = render(<ExampleDoc component="image-preview" />)
    const options = apiSection(imagePreview, 'options')
    const rows = sectionRows(container, 'options')

    expect(rows.map(cells => cells[0])).toEqual(options.rows.map(row => row[0]))
    // #360：元素 `@property` 里没有的 `index` / `target` / `container` 也在这一节里，
    // 所以这三个字段是「表格是手写的唯一来源」这条契约的直接证据。
    expect(cellOf(rows, options, 'index', '类型')).toBe('number')
    expect(cellOf(rows, options, 'index', '默认值')).toBe('0')
    expect(cellOf(rows, options, 'target', '默认值')).toBe('—')
    expect(cellOf(rows, options, 'container', '默认值')).toBe('—')
  })

  it('events 表按 markdown 的小节生成，没写就不出现', () => {
    const { container } = render(<ExampleDoc component="slider" />)
    expect(sectionRows(container, 'events').map(cells => cells[0])).toEqual(['input', 'change'])
    // 两列小节的列形状来自 markdown 的表头，渲染端不会再凭空补出类型与默认值两格。
    expect(sectionRows(container, 'events').map(cells => cells.length)).toEqual([2, 2])

    const { container: buttonContainer } = render(<ExampleDoc component="button" />)
    // button.md 没写 ### Events 小节，就不该凭空多出一张 Events 表。
    expect(buttonContainer.querySelector('[data-example-api="events"]')).toBeNull()
  })

  it('methods 表列出手写的方法，没写方法的组件不留空表', () => {
    const { container } = render(<ExampleDoc component="collapse" />)
    const methods = apiSection(collapse, 'methods')
    const rows = sectionRows(container, 'methods')

    // 名称单元格写成调用形态（`show()` / `replay(options?)`），与 Props / Events 的裸属性名不同：
    // 这一节记的是挂在元素上的方法，不是声明式契约。
    expect(rows.map(cells => cells[0])).toEqual(methods.rows.map(row => row[0]))
    expect(rows.map(cells => cells[0])).toEqual(['show()', 'close()', 'toggle()'])
    // 两列小节的列形状来自 markdown 的表头。
    expect(rows.map(cells => cells.length)).toEqual([2, 2, 2])

    const { container: buttonContainer } = render(<ExampleDoc component="button" />)
    // button.md 没有方法可写，就不该凭空多出一张 Methods 表。
    expect(buttonContainer.querySelector('[data-example-api="methods"]')).toBeNull()
  })

  it('散文小节渲染成正文 HTML，不铺成一张表', () => {
    const { container } = render(<ExampleDoc component="slider" />)
    const prose = slider.api.find(section => section.key === '行为说明')
    if (prose?.kind !== 'prose') throw new Error('slider 的 行为说明 不是散文小节')

    const section = container.querySelector(`[data-example-api="${prose.key}"]`)
    if (!section) throw new Error('slider 的 行为说明 小节没有渲染')
    // 散文小节没有表头也没有表格：正文就是生成器渲染好的那段 HTML，DOM 里逐字就是 payload 的 html。
    expect(section.querySelector('table')).toBeNull()
    // 散文可以有多段（列表、代码块都是段落级的），比的是整段正文而不是第一个 <p>。
    const expected = document.createElement('div')
    expected.innerHTML = prose.html
    expect(section.querySelector('div')?.textContent).toBe(expected.textContent)
  })

  it('返回 handle 表只收只读成员，列形状来自 markdown', () => {
    const { container } = render(<ExampleDoc component="image-preview" />)
    const handle = apiSection(imagePreview, '返回 handle')
    const rows = sectionRows(container, '返回 handle')

    expect(rows.map(cells => cells[0])).toEqual(handle.rows.map(row => row[0]))
    // handle 上的方法归 ### Methods，这一节只记只读成员——同一件事不在两节里各写一遍。
    expect(rows.map(cells => cells[0])).toEqual(['index', 'scale', 'images', 'closed'])
    expect(sectionHeaders(container, '返回 handle')).toEqual(['名称', '说明', '类型'])
    expect(cellOf(rows, handle, 'closed', '类型')).toBe('Promise<void>')
  })

  it('theme 的 token 表按 markdown 的列渲染，颜色与阴影两族是浅色/深色双值列', () => {
    const { container } = render(<ExampleDoc component="theme" />)
    const color = apiSection(theme, 'color tokens')
    const rows = sectionRows(container, 'color tokens')

    // 两族 token 的两个值列是并列的浅色 / 深色，不是「类型 + 默认值」：列数由配置声明，渲染端照铺。
    expect(sectionHeaders(container, 'color tokens')).toEqual(['名称', '说明', '浅色默认值', '深色默认值'])
    expect(rows.map(cells => cells[0])).toEqual(color.rows.map(row => row[0]))
    expect(cellOf(rows, color, '--wui-color-page', '浅色默认值')).toBe('#fff')
    expect(cellOf(rows, color, '--wui-color-page', '深色默认值')).toBe('#242628')
  })

  it('layout 的三张 API 表来自 markdown，示例只有代码没有 live 预览', () => {
    const { container } = render(<ExampleDoc component="layout" />)

    for (const key of ['props', 'events', 'slots'] as const) {
      expect(
        sectionRows(container, key).map(cells => cells[0]),
        `${key} 表的行名`
      ).toEqual(apiSection(layout, key).rows.map(row => row[0]))
    }
    expect(sectionRows(container, 'props').map(cells => cells.length)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4])

    expect(
      [...container.querySelectorAll('[data-sample]')].map(element => element.getAttribute('data-sample'))
    ).toEqual(layout.samples.map(candidate => candidate.title))
    // layout 的示例是纯展示片段（没有 `{#id}` 锚点）：整页布局嵌进文档页会和外层 shell 抢 sticky
    // header，真实交互由手写的 layout-demo 页面演示，文档页只出代码。
    expect(container.querySelector('[data-sample-preview]')).toBeNull()
  })

  it('layout props 表里手写的默认值，就是元素实际的默认值', async () => {
    const restored = { width: window.innerWidth, height: window.innerHeight }
    try {
      // `mobile` 是视口派生的只读输出，而这一档默认跑在 414px 宽的窄视口里（vitest browser
      // 的默认 viewport）；先钉到桌面宽度，整张表才都按桌面分支的初值比较。
      await setViewport(1280, 800)
      const { container } = render(<web-ui-layout />)
      const host = container.querySelector<WebUiLayout>('web-ui-layout')
      if (!host) throw new Error('web-ui-layout 没有渲染')
      await act(async () => {
        await host.updateComplete
      })

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
      const defaultColumn = columnOf(props, '默认值')
      expect(Object.keys(actual).sort()).toEqual(props.rows.map(row => row[0]).sort())
      for (const row of props.rows) {
        expect(actual[row[0]], `${row[0]} 的默认值与元素初值不一致`).toBe(documentedDefault(row[defaultColumn]))
      }
    } finally {
      await setViewport(restored.width, restored.height)
    }
  })

  it('segmented-trigger 的 live 示例挂成真组件，点击推进父级状态、禁用项不动', async () => {
    const { container } = render(<ExampleDoc component="segmented-trigger" />)
    expect(
      [...container.querySelectorAll('[data-sample-preview]')].map(el => el.getAttribute('data-sample-preview'))
    ).toEqual(segmentedTrigger.samples.map(candidate => candidate.demoKey).filter(Boolean))
    await mountSegmented(container)

    const basic = segmentedIn(container, '基础')
    const triggers = triggersOf(basic)
    expect(triggers.map(trigger => trigger.value)).toEqual(['day', 'week', 'month'])
    expect(triggers.map(trigger => trigger.checked)).toEqual([true, false, false])

    // 点击第 2 项：trigger 只派发一个不冒泡的 change，父级 segmented 的 GroupController 捕获它、改自己
    // 的 value，再把 checked 铺回各项。这条走的是 trigger → 父级 → 父级派发 input 这条链路；因为父级在
    // 派发之前就已经写好了自己的 value，这两条断言量的是那条链路本身，量不到围栏里 `onInput` 那次回写。
    await act(async () => {
      optionOf(triggers[1]).click()
    })
    await waitFor(() => expect(basic.value).toBe('week'))
    expect(triggers.map(trigger => trigger.checked)).toEqual([false, true, false])

    // 禁用这一半是有区分度的：没有 `_isDisabled` 门，点击会把组值推到 `grid`。
    const disabled = segmentedIn(container, '单独禁用')
    const items = triggersOf(disabled)
    expect(items.map(trigger => trigger.disabled)).toEqual([false, true])
    await act(async () => {
      optionOf(items[1]).click()
    })
    expect(disabled.value).toBe('list')
  })
})
