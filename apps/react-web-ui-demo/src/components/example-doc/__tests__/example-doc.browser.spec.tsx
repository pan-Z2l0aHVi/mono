import '@/assets/global.css'
import '@/generated/web-ui-examples.css'

import type { WebUiSlider } from '@greypan/web-ui'
import { cleanup, render, waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

// `?raw` 读的是 `import.meta.glob` 拿去编译的同一个文件：这条断言把「页面上显示的那份」直接钉到
// 「被执行的那份」上，中间不经过 payload 与围栏的等价推定。
import controlledSource from '@/generated/demos/slider--controlled.tsx?raw'
import { exampleDocs } from '@/generated/web-ui-examples'

import ExampleDoc from '..'

/*
 * 这一档量的是「markdown 生成的数据真的变成了页面」：示例条数与标题取自生成数据、代码块的颜色在
 * 真实浏览器里真的落到 DOM 上、带 `{#id}` 锚点的示例真的挂成了可交互组件。
 * jsdom 层能证明结构，但证明不了 shiki 的 `--shiki-light` 有没有被生成样式取用，也证明不了自定义
 * 元素有没有被升级——那两件事都需要真实引擎。
 */

const slider = exampleDocs.find(doc => doc.component === 'slider')
const button = exampleDocs.find(doc => doc.component === 'button')
if (!slider || !button) throw new Error('生成数据里缺少 slider / button')

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
  return section
}

function sample(container: HTMLElement, title: string) {
  const element = container.querySelector(`[data-example-sample="${title}"]`)
  if (!element) throw new Error(`示例「${title}」没有渲染`)
  return element
}

function keyword(container: HTMLElement) {
  const element = container.querySelector<HTMLElement>(`pre.shiki ${KEYWORD_SELECTOR}`)
  if (!element) throw new Error('代码块里没有关键字 token')
  return element
}

// live 示例是 lazy 的：不先把三份 demo 等齐，Suspense 会在断言之后才落地，React 的 act 环境
// 于是报「suspended resource finished loading inside a test, but not wrapped in act」。
//
// 这里的等待用 RTL 的 `waitFor`，而且**不**包进 `act`：`waitFor` 轮询期间会把
// `IS_REACT_ACT_ENVIRONMENT` 暂时关掉（root.browser.spec.tsx 的 `settleViewport` 记了同一条口径），
// 落在这个窗口里的 lazy 结算因此不再被记账。反过来把 `waitFor` 塞进 `act` 会得到
// 「not configured to support act」，而且那份结算没人 flush，等到超时依然是空的。
async function mountDemos(container: HTMLElement) {
  // 超时给到 8 秒：第一份 demo 的 dynamic import 是冷的，要等 dev server 现转源码，默认 1 秒不够；
  // 之后同一轮里模块已缓存，等到的就是真实挂载时间。
  await waitFor(
    () => {
      const mounted = container.querySelectorAll('[data-example-preview] web-ui-slider')
      if (mounted.length !== 3) throw new Error(`live 示例只挂载了 ${mounted.length} 个 web-ui-slider`)
    },
    { timeout: 8000 }
  )
  await act(async () => {
    for (const host of container.querySelectorAll<WebUiSlider>('web-ui-slider')) await host.updateComplete
  })
}

function sliderIn(container: HTMLElement, title: string) {
  const host = sample(container, title).querySelector<WebUiSlider>('web-ui-slider')
  if (!host) throw new Error(`示例「${title}」没有渲染出 web-ui-slider`)
  // 影子树里有 role="slider" = 元素真的被注册升级过，不是留着未知标签的空壳。
  if (!host.shadowRoot?.querySelector('[role="slider"]')) throw new Error(`示例「${title}」的 slider 没有升级`)
  return host
}

describe('example-doc（React 面 / 真实浏览器）', () => {
  afterEach(cleanup)

  it('示例逐条来自 markdown，代码块在真实引擎里带了颜色', () => {
    const { container } = render(<ExampleDoc component="button" />)

    expect(container.querySelector('[data-example-intro]')?.innerHTML).toBe(button.introHtml)
    expect(
      [...container.querySelectorAll('[data-example-sample]')].map(element =>
        element.getAttribute('data-example-sample')
      )
    ).toEqual(button.samples.map(candidate => candidate.title))

    const code = container.querySelector('pre.shiki')
    expect(code, '示例代码必须是 shiki 产出的 <pre>').not.toBeNull()
    expect(code?.classList.contains('wui-example-code')).toBe(true)
    // token 自己只带 `--shiki-light` 这个变量，落到文字上靠的是生成样式那条 `color: var(...)`。
    expect(getComputedStyle(keyword(container)).color).toBe(KEYWORD_LIGHT)
  })

  it('渲染的是 react 那一份代码，不是 vue 的', () => {
    const { container } = render(<ExampleDoc component="slider" />)
    const payload = slider.samples.find(candidate => candidate.title === '受控值')?.html.react
    if (!payload) throw new Error('生成数据里缺少受控值的 react 代码')

    const code = sample(container, '受控值').querySelector('pre.shiki')
    expect(code?.textContent).toContain('useState')
    expect(code?.textContent).not.toContain('<template>')
    // 生成的 HTML 片段经 dangerouslySetInnerHTML 落地后必须与 payload 逐字节同构；先解析一次，
    // 让两侧走同一套序列化（`&#x3C;` 在 DOM 里都会写回 `&lt;`），否则比的是转义写法而不是内容。
    const parsed = new DOMParser().parseFromString(payload, 'text/html').querySelector('pre')
    expect(code?.innerHTML).toBe(parsed?.innerHTML)
    expect(code?.textContent).toBe(parsed?.textContent)
    // 反向比：文件字节必须正好是 `<pre>` 的可见文本再加一个行尾换行。写成 `trimEnd()` 会把
    // 「文件末尾多一个空行」这类形状放掉。
    expect(`${code?.textContent}\n`).toBe(controlledSource)
  })

  it('外观切到深色时，token 换用 --shiki-dark', async () => {
    const { container, unmount } = render(<ExampleDoc component="button" />)
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
    expect(getComputedStyle(keyword(darkContainer)).color).toBe(KEYWORD_DARK)
  })

  it('带锚点的示例挂成真组件，没锚点的只有代码', async () => {
    const { container } = render(<ExampleDoc component="slider" />)
    const previews = [...container.querySelectorAll('[data-example-preview]')]
    expect(previews.map(element => element.getAttribute('data-example-preview'))).toEqual(
      slider.samples.map(candidate => candidate.liveKey).filter(Boolean)
    )
    await mountDemos(container)
    expect(sliderIn(container, '基础').value).toBe(40)

    const buttonContainer = render(<ExampleDoc component="button" />).container
    expect(
      buttonContainer.querySelector('[data-example-preview]'),
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
    const basic = sliderIn(container, '基础')
    expect([basic.min, basic.max, basic.step, basic.value]).toEqual([0, 100, 5, 40])

    expect(sample(container, '刻度与垂直方向').querySelector('pre.shiki')?.textContent).toMatch(/marks vertical/)
    const vertical = sliderIn(container, '刻度与垂直方向')
    expect([vertical.marks, vertical.vertical]).toEqual([true, true])
  })

  it('示例是活的：键盘能改值', async () => {
    const { container } = render(<ExampleDoc component="slider" />)
    await mountDemos(container)

    const host = sliderIn(container, '受控值')
    expect(host.value).toBe(30)
    const thumb = host.shadowRoot?.querySelector<HTMLElement>('[role="slider"]')
    if (!thumb) throw new Error('web-ui-slider 的影子树里没有 role="slider"')

    // 触发动作是键盘本身，所以 act 边界落在按键上；React 把新 value 写回元素的那次回写可能
    // 在动作返回后才落地，因此结果用不包 act 的 `waitFor` 等（同 `mountDemos` 的口径）。
    await act(async () => {
      thumb.focus()
      await userEvent.keyboard('{ArrowRight}')
    })
    await waitFor(() => expect(host.value).toBe(31))
  })

  it('props 表把 markdown 里手写的类型与默认值原样渲染出来', () => {
    const { container } = render(<ExampleDoc component="slider" />)
    const props = apiSection(slider, 'props')
    const rows = sectionRows(container, 'props')

    expect(rows.map(cells => cells[0])).toEqual(props.rows.map(row => row.name))
    // `boolean` / `false` / `100` 写在 slider.md 的 Props 表里：表格是这份数据的唯一来源，
    // 所以这一条钉的是 markdown → 生成 payload → DOM 这三跳没有走样，不是「源码说了算」。
    expect(rows.find(cells => cells[0] === 'marks')?.slice(1)).toEqual(['boolean', 'false', expect.any(String)])
    expect(rows.find(cells => cells[0] === 'max')?.slice(1)).toEqual(['number', '100', expect.any(String)])
  })

  it('events 表按 markdown 的小节生成，没写就不出现', () => {
    const { container } = render(<ExampleDoc component="slider" />)
    expect(sectionRows(container, 'events').map(cells => cells[0])).toEqual(['input', 'change'])

    const { container: buttonContainer } = render(<ExampleDoc component="button" />)
    // button.md 没写 ### Events 小节，就不该凭空多出一张 Events 表。
    expect(buttonContainer.querySelector('[data-example-api="events"]')).toBeNull()
  })
})
