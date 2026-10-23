import '@/assets/global.css'
import '@/generated/examples.css'
// 这三处默认值断言直接建元素（checkbox / layout / radio），unplugin 的注入扫不到 `createElement`，
// 得自己把组件模块拉进来才会升级。
import '@greypan/web-ui/components/checkbox'
import '@greypan/web-ui/components/layout'
import '@greypan/web-ui/components/radio'
// 主题宿主得自己注册：本文件里没有 `<web-ui-theme>` 的模板用法，unplugin 的注入扫不到这个 tag。
import '@greypan/web-ui/components/theme'

import type {
  WebUiAutocomplete,
  WebUiBackTop,
  WebUiCheckbox,
  WebUiCollapse,
  WebUiContextMenu,
  WebUiDialog,
  WebUiDrawer,
  WebUiDropdown,
  WebUiDropdownItem,
  WebUiLayout,
  WebUiPopover,
  WebUiRadio,
  WebUiSegmented,
  WebUiSegmentedTrigger,
  WebUiSelect,
  WebUiSlider,
  WebUiToast,
  WebUiTooltip
} from '@greypan/web-ui'
import { akarIconsCircleCheck, lucideCircleAlert, lucideCopy } from '@greypan/web-ui/icons'
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { page, userEvent } from 'vite-plus/test/browser'
import { nextTick } from 'vue'

import { setViewport } from '@/__tests__/viewport'
import { exampleDocs } from '@/generated/examples'

import { reactIcon, vueIcon } from '../flavor-icons'
import ExampleDoc from '../index.vue'

/*
 * 与 React 面同一组断言，量的是「同一份生成数据在 vue demo 里渲染出同样的东西」。
 * 两侧逐字节相同的生成数据由 web-ui 包的 `generated-parity.spec.ts` 保证，这里补上
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
const theme = exampleDocs.find(doc => doc.component === 'theme')
const segmentedTrigger = exampleDocs.find(doc => doc.component === 'segmented-trigger')
const drawer = exampleDocs.find(doc => doc.component === 'drawer')
const checkbox = exampleDocs.find(doc => doc.component === 'checkbox')
const radio = exampleDocs.find(doc => doc.component === 'radio')
const checkboxGroup = exampleDocs.find(doc => doc.component === 'checkbox-group')
const radioGroup = exampleDocs.find(doc => doc.component === 'radio-group')
if (
  !slider ||
  !button ||
  !collapse ||
  !imagePreview ||
  !layout ||
  !theme ||
  !segmentedTrigger ||
  !drawer ||
  !checkbox ||
  !radio ||
  !checkboxGroup ||
  !radioGroup
)
  throw new Error(
    '生成数据里缺少 slider / button / collapse / image-preview / layout / theme / segmented-trigger / drawer / checkbox / radio / checkbox-group / radio-group'
  )

/** 逐篇铺断言时按名字取生成数据：取不到就红，别让拼错的组件名变成「这篇没被测」。 */
function docOf(component: string): Doc {
  const doc = exampleDocs.find(candidate => candidate.component === component)
  if (!doc) throw new Error(`生成数据里没有 ${component} 这个 component`)
  return doc
}

/**
 * `${component}--${demoKey}` → 落盘文件字节。`?raw` 读的是 `import.meta.glob` 拿去编译的同一个文件，
 * 于是「页面上显示的那份」直接钉在「被执行的那份」上，中间不经过 payload 与围栏的等价推定。
 *
 * 这里用 glob 而不是逐条 `?raw` import：消费方是逐篇用例，写进口只会漏，而漏掉的那条正好是
 * 改名或改围栏时会漂的那条。缺文件由 `demoSourceOf` 报出来，「没覆盖」不等于「通过」。
 */
const demoRawModules = import.meta.glob<string>('../../../generated/demos/*.vue', {
  query: '?raw',
  import: 'default',
  eager: true
})
// key 取文件名去掉扩展：demo 文件名就是 `${component}--${demoKey}`，全局唯一，不必再带路径前缀。
const demoSources: Record<string, string> = Object.fromEntries(
  Object.entries(demoRawModules).map(([file, source]) => [
    file.slice(file.lastIndexOf('/') + 1, -'.vue'.length),
    source
  ])
)

function demoSourceOf(component: string, demoKey: string | null | undefined) {
  const key = `${component}--${demoKey ?? '(无锚点)'}`
  const source = demoSources[key]
  if (source === undefined) throw new Error(`${key} 没有落盘文件，测不到它显示的是不是被执行的那份`)
  return source
}

// 生成样式让 token 取 shiki 双主题里的浅色那一边。按 span 自己带的 `--shiki-light` 取色，
// 因为 `<pre>` 上第一个 span 往往是正文色（#24292E），拿它当「被着色的关键字」会稳定测错。
const KEYWORD_SELECTOR = 'span[style*="--shiki-light:#D73A49"]'
const KEYWORD_LIGHT = 'rgb(215, 58, 73)'
const KEYWORD_DARK = 'rgb(249, 117, 131)'

type Doc = NonNullable<typeof button>

/** Lit 宿主都带这条更新句柄；等首帧渲染完再读影子树。 */
type Upgradable = HTMLElement & { updateComplete: Promise<boolean> }

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

function headersOf(element: HTMLElement, key: string) {
  const section = element.querySelector(`[data-example-api="${key}"]`)
  if (!section) throw new Error(`API 小节 ${key} 没有渲染`)
  return [...section.querySelectorAll('thead th')].map(th => th.textContent)
}

/** 按行名与列标题取一格：位置由 markdown 的表头定，所以测试也按标题找值。 */
function cellOf(rows: (string | null)[][], section: { columns: { title: string }[] }, name: string, title: string) {
  const row = rows.find(cells => cells[0] === name)
  if (!row) throw new Error(`表格里没有 \`${name}\` 这一行`)
  return row[columnOf(section, title)]
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

/** 一条示例该有几个宿主，数的是那份落盘源码里 `<${tag}` 标签的个数（不含同前缀的别的 tag）。 */
function expectedHosts(component: string, demoKey: string | null | undefined, tag: string) {
  const source = demoSourceOf(component, demoKey)
  const count = (source.match(new RegExp(`<${tag}(?![-\\w])`, 'g')) ?? []).length
  // 源码里出现 `v-for`（React 那份对应的是 `.map(`）时，渲染出来的宿主个数由数据决定，静态数不出来，
  // 这条只能判下界。`v-if` 不参与：宿主级条件只有 `editable-text--unmount` 一处，初值就是挂着的。
  return { count, exact: !source.includes('v-for') && !source.includes('.map(') }
}

/**
 * 宿主 tag + 影子树里「已升级」的判据：`role` 是 `[role="…"]` 的简写，影子树不带 role 的组件（原生
 * `<dialog>`、纯 anchor 容器）改用 `probe` 指认那个必然存在的节点。
 */
interface Host {
  tag: string
  role?: string
  probe?: string
}
const sliderHost: Host = { tag: 'web-ui-slider', role: 'slider' }
const checkboxHost: Host = { tag: 'web-ui-checkbox', role: 'checkbox' }
const radioHost: Host = { tag: 'web-ui-radio', role: 'radio' }
const tooltipHost: Host = { tag: 'web-ui-tooltip', role: 'tooltip' }
const popoverHost: Host = { tag: 'web-ui-popover', role: 'dialog' }
const contextMenuHost: Host = { tag: 'web-ui-context-menu', probe: '.context-menu-anchor' }
const dialogHost: Host = { tag: 'web-ui-dialog', probe: 'dialog' }
const backTopHost: Host = { tag: 'web-ui-back-top', role: 'button' }

// live 示例是 defineAsyncComponent：先等每条示例真的挂上宿主，再等 Lit 自己的更新周期落地。
async function mountDemos(element: HTMLElement, doc: Doc, tag: string) {
  // 超时给到 8 秒：第一份 demo 的 dynamic import 是冷的，要等 dev server 现转源码，默认 1 秒不够；
  // 与 React 面同一口径（`example-doc.browser.spec.tsx` 的 `mountDemos`）：判据是逐条示例的宿主数，
  // 期望值现算自 demo 源码，所以语料里给某条示例加一个宿主就要求预览里真的多挂一个，
  // 只按「每个预览区至少一个」判会放过局部没结算完的情况。
  // 没锚点的示例没有预览区，也不该有：那条对应关系由 `src/__tests__/example-docs.spec.ts` 的壳映射用例管。
  const expected = doc.samples
    .filter(candidate => candidate.demoKey)
    .map(candidate => [candidate.title, expectedHosts(doc.component, candidate.demoKey, tag)] as const)
  await vi.waitFor(
    () => {
      for (const [title, { count, exact }] of expected) {
        // 只在预览区里数：卡片工具条上的复制/展开按钮和它们的图标也是 `web-ui-button` / `web-ui-icon`，
        // 从整张卡取会多算两个。
        const mounted = previewOf(element, title).querySelectorAll(tag).length
        if (exact ? mounted !== count : mounted < count)
          throw new Error(
            `示例「${title}」挂了 ${mounted} 个 ${tag}，源码里写的是 ${count} 个（${
              exact ? '源码逐个手写，判相等' : '源码用 map 生成，判下界'
            }）`
          )
      }
    },
    { timeout: 8000 }
  )
  await nextTick()
  for (const node of element.querySelectorAll<Upgradable>(tag)) await node.updateComplete
}

/** 一条示例里可以摆多个宿主，所以要指明取第几个。 */
function hostIn<T extends HTMLElement>(node: HTMLElement, title: string, host: Host, index = 0): T {
  const element = [...previewOf(node, title).querySelectorAll<T>(host.tag)][index]
  if (!element) throw new Error(`示例「${title}」的第 ${index + 1} 个位置没有渲染出 ${host.tag}`)
  // 影子树里有那个判据节点 = 元素真的被注册升级过，不是留着未知 tag 的空壳。
  const marker = host.probe ?? `[role="${host.role}"]`
  if (!element.shadowRoot?.querySelector(marker))
    throw new Error(`示例「${title}」的 ${host.tag} 没有升级（${marker}）`)
  return element
}

const sliderIn = (node: HTMLElement, title: string, index = 0) => hostIn<WebUiSlider>(node, title, sliderHost, index)

function previewOf(node: HTMLElement, title: string) {
  const preview = sample(node, title).querySelector<HTMLElement>('[data-sample-preview]')
  if (!preview) throw new Error(`示例「${title}」没有 live 预览`)
  return preview
}

/** 预览里的 `<output>` 读数：每条示例用同一个取法，比较值由各条断言自己给。 */
function readoutOf(preview: HTMLElement) {
  return () => preview.querySelector('output')?.textContent?.trim()
}

// 按文案取预览里的那个 web-ui-button 宿主：指针要打在宿主上才会进入 tooltip / popover 的监听链。
function buttonOf(preview: HTMLElement, label: string) {
  const host = [...preview.querySelectorAll<HTMLElement>('web-ui-button')].find(
    item => item.textContent?.trim() === label
  )
  if (!host) throw new Error(`预览里没有「${label}」按钮`)
  return host
}

// 提交动作的转发在影子 `<button>` 的 handler 里，点宿主不会触发 submit。
function shadowButton(preview: HTMLElement, label: string) {
  const host = buttonOf(preview, label)
  const button = host.shadowRoot?.querySelector<HTMLElement>('button')
  if (!button) throw new Error(`「${label}」按钮还没有渲染出影子 <button>`)
  return button
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

// Lit 首帧是异步的：collapse 的影子树落地前，light DOM 里的代码块没有被 slot 分配，
// getComputedStyle 会读到空串；样式与可见性断言先等宿主渲染完。
async function settleCollapses(element: HTMLElement) {
  for (const host of element.querySelectorAll<WebUiCollapse>('web-ui-collapse')) await host.updateComplete
  await nextTick()
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

const selectHost: Host = { tag: 'web-ui-select', role: 'combobox' }
const autocompleteHost: Host = { tag: 'web-ui-autocomplete', role: 'combobox' }

/** select / autocomplete 的开合落在影子树里的 trigger 上：宿主自己的点击进不去。 */
function comboboxOf(host: HTMLElement) {
  const combobox = host.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]')
  if (!combobox) throw new Error(`${host.localName} 的影子树里没有 role="combobox"`)
  return combobox
}

/** autocomplete 默认 trigger 是影子树里的 web-ui-input，键入要落到它内部的原生控件上。 */
function autocompleteInput(host: WebUiAutocomplete) {
  const input = host.shadowRoot?.querySelector('web-ui-input')?.shadowRoot?.querySelector<HTMLInputElement>('input')
  if (!input) throw new Error('autocomplete 默认 trigger 没有渲染出原生 input')
  return input
}

/** dropdown 的 menu panel 挂在 overlay root 的 shadow 树里，普通 querySelector 看不到。 */
function deepQuery<T extends Element>(root: Document | ShadowRoot, selector: string): T | null {
  const direct = root.querySelector<T>(selector)
  if (direct) return direct
  for (const host of root.querySelectorAll('*')) {
    if (!host.shadowRoot) continue
    const found = deepQuery<T>(host.shadowRoot, selector)
    if (found) return found
  }
  return null
}

/**
 * 当前这条示例的根 panel：trigger 的 aria-controls 指向它。
 * 直接按 value 在文档里找会命中别的测试留下的同值 item。
 */
function panelOf(preview: HTMLElement, what: string) {
  const trigger = preview.querySelector<HTMLElement>('[slot="trigger"]')
  const id = trigger?.getAttribute('aria-controls')
  if (!id) throw new Error(`${what} 的 trigger 上没有 aria-controls`)
  const panel = deepQuery<HTMLElement>(document, `#${CSS.escape(id)}`)
  if (!panel) throw new Error(`overlay 里没有 id="${id}" 的 ${what} panel`)
  return panel
}

const dropdownPanelOf = (preview: HTMLElement) => panelOf(preview, 'menu')
const popoverPanelOf = (preview: HTMLElement) => panelOf(preview, 'popover')

/** overlay root 自己带一层 shadow：命令式挂上去的 toast / image-preview 只能全树扫。 */
function deepQueryAll<T extends Element>(root: Document | ShadowRoot, selector: string): T[] {
  const found = [...root.querySelectorAll<T>(selector)]
  for (const host of root.querySelectorAll('*')) {
    if (!host.shadowRoot) continue
    found.push(...deepQueryAll<T>(host.shadowRoot, selector))
  }
  return found
}

const toastElements = () => deepQueryAll<WebUiToast>(document, 'web-ui-toast')
const imagePreviewElements = () => deepQueryAll<HTMLElement>(document, 'web-ui-image-preview')

/**
 * 命令式文档（toast / image-preview）的预览里一个宿主都没有，`mountDemos` 的宿主数因此判不出
 * lazy 围栏有没有结算完：动按钮前先等示例自己挂上来。
 */
async function demoSettled(node: HTMLElement, title: string) {
  await vi.waitFor(() => expect(previewOf(node, title).querySelector('web-ui-button')).not.toBeNull())
}

/** toast 的正文在影子树里：宿主自己没有可读的 textContent。 */
function toastMessage(el: WebUiToast) {
  return el.shadowRoot?.querySelector('.toast-message')?.textContent ?? ''
}

/**
 * toast 与 image-preview 由命令式 API 挂进文档级 overlay root，示例卸载只触发退场动画、不当场移除。
 * 残留宿主会抢先满足「点之前一个都没有」，所以每次动手前先等 overlay 退干净。
 */
async function overlayCleared() {
  await vi.waitFor(() => expect(toastElements().length + imagePreviewElements().length).toBe(0))
}

/** 打开期间 context-menu 把 item 迁进 overlay 里的 panel；按 item 文案认出是哪一块。 */
function openMenuPanelWith(text: string) {
  const panel = deepQueryAll<HTMLElement>(document, '.wui-menu-portal-overlay.context-menu').find(item =>
    [...item.querySelectorAll('web-ui-dropdown-item')].some(el => el.textContent?.includes(text))
  )
  if (!panel) throw new Error(`overlay 里没有含「${text}」的 context-menu panel`)
  return panel
}

function menuItemOf(panel: HTMLElement, text: string) {
  const item = [...panel.querySelectorAll<WebUiDropdownItem>('web-ui-dropdown-item')].find(el =>
    el.textContent?.includes(text)
  )
  if (!item) throw new Error(`panel 里没有「${text}」这一项`)
  return item
}

/** 右键路径就是宿主上的 `contextmenu`：合成事件带上按点坐标即可，不需要真的指针输入。 */
function rightClick(host: HTMLElement) {
  const { left, top } = host.getBoundingClientRect()
  host.dispatchEvent(
    new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: left + 24, clientY: top + 24 })
  )
}

/** 滚动容器里的可见性判据走组件自己挂的 `scroll` 监听：赋值后补一次事件，不等原生节流。 */
function scrollBox(box: HTMLElement, top: number) {
  box.scrollTop = top
  box.dispatchEvent(new Event('scroll'))
}

/** markdown 默认值单元格 → 元素侧的比较值：去掉反引号与字面量引号，`—` 表示空串。 */
function documentedDefault(cell: string | undefined) {
  const raw = (cell ?? '').replaceAll('`', '')
  return raw === '—' ? '' : raw.replace(/^'|'$/g, '')
}

/**
 * Props 表里手写的「默认值」一列 → 按属性名索引的映射。元素初值来自组件源码，两边对不上就是
 * 文档漏改；表里的行增删时键集会一起变，所以深比较把差异整个摊出来。
 */
function documentedDefaults(doc: Doc) {
  const props = apiSection(doc, 'props')
  const defaultColumn = columnOf(props, '默认值')
  return Object.fromEntries(props.rows.map(row => [row[0], documentedDefault(row[defaultColumn])]))
}

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

describe('example-doc（Vue 面 / 真实浏览器）', () => {
  it('示例逐条来自 markdown，代码块在真实引擎里带了颜色', async () => {
    const element = mountDoc('button')
    await settleCollapses(element)

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
    const payload = slider.samples.find(candidate => candidate.title === '垂直方向')?.html.vue
    if (!payload) throw new Error('生成数据里缺少垂直方向的 vue 代码')

    const code = sample(element, '垂直方向').querySelector('pre.shiki')
    expect(code?.textContent).toContain('@input')
    expect(code?.textContent).not.toContain('useState')
    // 生成的 HTML 片段经 v-html 落地后必须与 payload 同构；先解析一次，让两侧走同一套序列化
    // （`&#x3C;` 在 DOM 里都会写回 `&lt;`），否则比的是转义写法而不是内容。
    const parsed = new DOMParser().parseFromString(payload, 'text/html').querySelector('pre')
    expect(code?.innerHTML).toBe(parsed?.innerHTML)
    expect(code?.textContent).toBe(parsed?.textContent)
  })

  it('外观切到深色时，token 换用 --shiki-dark', async () => {
    const plain = mountDoc('button')
    await settleCollapses(plain)
    expect(getComputedStyle(keyword(plain)).color).toBe(KEYWORD_LIGHT)

    // 生成样式的深色判定读的是 web-ui-theme 的 resolved-appearance，所以把示例挂进一个真实的
    // 主题宿主；resolved-appearance 是组件的派生输出，只能由 appearance 驱动，直接写会被它自己覆盖回去。
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'dark')
    document.body.append(theme)
    mountDoc('button', theme)
    await vi.waitFor(() => expect(theme.getAttribute('resolved-appearance')).toBe('dark'))
    await settleCollapses(theme)
    expect(getComputedStyle(keyword(theme)).color).toBe(KEYWORD_DARK)

    // 正文、说明、行内代码与表头也跟着换深色档，而不是只换代码 token。
    const intro = theme.querySelector<HTMLElement>('[data-example-intro]')
    const description = theme.querySelector<HTMLElement>('.mdc-markdown-secondary')
    const headCell = theme.querySelector<HTMLElement>('[data-example-api="props"] th')
    const inlineCode = description?.querySelector('code')
    if (!intro || !description || !headCell || !inlineCode) throw new Error('深色 markdown 断言缺少节点')
    expect(getComputedStyle(intro).color).toBe('rgba(255, 255, 255, 0.81)')
    expect(getComputedStyle(description).color).toBe('rgba(255, 255, 255, 0.46)')
    expect(getComputedStyle(inlineCode).color).toBe('rgb(255, 115, 105)')
    expect(getComputedStyle(headCell).backgroundColor).toBe('rgba(255, 255, 255, 0.055)')
    theme.remove()
  })

  it('代码框架用 segmented 切换，点击与键盘都能换一份源码', async () => {
    const element = mountDoc('slider')
    await settleCollapses(element)
    const article = sample(element, '垂直方向')
    const segmented = segmentedIn(element, '垂直方向')
    const triggers = triggersOf(segmented)
    expect(triggers.map(trigger => trigger.textContent?.trim())).toEqual(['Vue', 'React'])
    // 名称前各挂一枚框架标记，且排在文字之前：tab 上的框架名靠形状认，比读字快。
    triggers.forEach((trigger, index) => {
      const icon = trigger.querySelector('web-ui-icon')
      expect(icon?.icon).toBe(index === 0 ? vueIcon : reactIcon)
      expect(trigger.querySelector('span')?.firstElementChild).toBe(icon)
    })
    // 工具条用 raised 变体（indicator 浮在沉一档的 track 上），与页面底色的工具条区分开。
    expect(segmented.variant).toBe('raised')
    expect(segmented.value).toBe('vue')
    expect(article.querySelector('[data-current-flavor]')?.getAttribute('data-current-flavor')).toBe('vue')
    expect(article.querySelector('[data-code] pre')?.textContent).toContain('@input')

    await userEvent.click(optionOf(triggers[1]))
    await vi.waitFor(() => expect(segmented.value).toBe('react'))
    await vi.waitFor(() =>
      expect(article.querySelector('[data-current-flavor]')?.getAttribute('data-current-flavor')).toBe('react')
    )
    expect(article.querySelector('[data-code] pre')?.textContent).toContain('useState')
    expect(triggers.map(trigger => trigger.checked)).toEqual([false, true])

    optionOf(triggers[0]).focus()
    await userEvent.keyboard('{Enter}')
    await vi.waitFor(() => expect(segmented.value).toBe('vue'))
    await vi.waitFor(() =>
      expect(article.querySelector('[data-current-flavor]')?.getAttribute('data-current-flavor')).toBe('vue')
    )
    // 焦点留在被激活的 option 上：document.activeElement 只会看到 trigger 宿主。
    expect(triggers[0].shadowRoot?.activeElement).toBe(optionOf(triggers[0]))
  })

  it('复制按钮写入当前源码，成功与失败都换成对应 icon', async () => {
    const element = mountDoc('slider')
    await settleCollapses(element)
    const article = sample(element, '垂直方向')
    const copy = article.querySelector<HTMLElement>('[data-copy]')
    if (!copy) throw new Error('代码区没有复制按钮')
    await vi.waitFor(() => expect(copy.shadowRoot?.querySelector('button')).toBeTruthy())
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
      copy.shadowRoot?.querySelector<HTMLElement>('button')?.click()
      await vi.waitFor(() => expect(writes).toHaveLength(1))
      expect(writes[0]).toContain('@input')
      await vi.waitFor(() => expect(copy.getAttribute('aria-label')).toBe('已复制'))
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
    const element = mountDoc('slider')
    await settleCollapses(element)
    const article = sample(element, '垂直方向')
    const copy = article.querySelector<HTMLElement>('[data-copy]')
    if (!copy) throw new Error('代码区没有复制按钮')
    await vi.waitFor(() => expect(copy.shadowRoot?.querySelector('button')).toBeTruthy())

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
      copy.shadowRoot?.querySelector<HTMLElement>('button')?.click()
      await vi.waitFor(() => expect(copy.getAttribute('aria-label')).toBe('复制失败'))
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
    const element = mountDoc('drawer')
    await settleCollapses(element)
    const articles = [...element.querySelectorAll<HTMLElement>('[data-sample]')]
    expect(articles.map(node => node.getAttribute('data-sample'))).toEqual(
      drawer.samples.map(candidate => candidate.title)
    )
    for (const article of articles) {
      const title = article.getAttribute('data-sample')
      expect(article.querySelector('[data-sample-preview]'), `${title}：已迁移示例缺少预览`).not.toBeNull()
      expect(article.querySelector('[data-code] pre'), `${title}：已迁移示例缺少代码`).not.toBeNull()
    }

    // 预览区必须单独取：工具条里的 web-ui-button 会先于异步 demo 升级，用整篇文章等会等错对象。
    const basic = sample(element, drawer.samples[0].title)
    const preview = basic.querySelector('[data-sample-preview]')
    await vi.waitFor(
      () => expect(preview?.querySelector('web-ui-button')?.shadowRoot?.querySelector('button')).toBeTruthy(),
      { timeout: 8000 }
    )
    const trigger = preview?.querySelector('web-ui-button')?.shadowRoot?.querySelector<HTMLElement>('button')
    const host = preview?.querySelector<WebUiDrawer>('web-ui-drawer')
    if (!trigger || !host) throw new Error('基础示例没有渲染出 button / drawer')
    trigger.click()
    await vi.waitFor(() => expect(host.open).toBe(true))
    expect(host.shadowRoot?.querySelector('dialog')?.open).toBe(true)
  })

  it('drawer 关闭按钮示例：点文案也能勾选', async () => {
    const element = mountDoc('drawer')
    await settleCollapses(element)
    await vi.waitFor(() => expect(sample(element, '关闭按钮').querySelector('web-ui-checkbox')).toBeTruthy())
    const article = sample(element, '关闭按钮')
    const checkbox = article.querySelector<WebUiCheckbox>('web-ui-checkbox')
    const drawerHost = article.querySelector<WebUiDrawer>('web-ui-drawer')
    if (!checkbox || !drawerHost) throw new Error('关闭按钮示例没有渲染 checkbox / drawer')
    await vi.waitFor(() => expect(checkbox.shadowRoot?.querySelector('[role="checkbox"]')).toBeTruthy())
    expect(checkbox.checked).toBe(true)
    expect(drawerHost.closable).toBe(true)

    // 文案放在组件默认槽里：点击落点命中影子树里 role="checkbox" 的交互 span，宿主与文案都能切换。
    await userEvent.click(checkbox)
    await vi.waitFor(() => expect(checkbox.checked).toBe(false))
    await vi.waitFor(() => expect(drawerHost.closable).toBe(false))
  })

  it('代码区默认只露出 peek，展开与收起由工具条按钮控制', async () => {
    const element = mountDoc('button')
    await settleCollapses(element)
    const article = sample(element, button.samples[0].title)
    const host = article.querySelector<WebUiCollapse>('web-ui-collapse')
    const inner = host?.shadowRoot?.querySelector('.wui-collapse-inner')
    const toggle = article.querySelector<HTMLElement>('[data-toggle-code]')
    if (!host || !inner || !toggle) throw new Error('collapse 或展开按钮不完整')
    await vi.waitFor(() => expect(toggle.shadowRoot?.querySelector('button')).toBeTruthy())

    expect(host.open).toBe(false)
    expect(host.peek).toBe('128px')
    expect(inner.hasAttribute('inert')).toBe(true)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    // 工具条只留图标：说明文字落在 aria-label 与 tooltip 上。
    expect(toggle.getAttribute('aria-label')).toBe('展开代码')
    const tooltips = [...article.querySelectorAll<WebUiTooltip>('web-ui-tooltip')]
    expect(tooltips.map(tooltip => tooltip.content)).toEqual(['复制代码', '展开代码'])

    toggle.shadowRoot?.querySelector<HTMLElement>('button')?.click()
    await vi.waitFor(() => expect(host.open).toBe(true))
    await host.updateComplete
    await nextTick()
    expect(inner.hasAttribute('inert')).toBe(false)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(toggle.getAttribute('aria-label')).toBe('收起代码')
    expect(tooltips.map(tooltip => tooltip.content)).toEqual(['复制代码', '收起代码'])

    toggle.shadowRoot?.querySelector<HTMLElement>('button')?.click()
    await vi.waitFor(() => expect(host.open).toBe(false))
    await host.updateComplete
    expect(inner.hasAttribute('inert')).toBe(true)
  })

  it('代码卡片圆角 16px，三段同色同边距，收起态渐隐带遮住 peek 六成以上', async () => {
    const element = mountDoc('slider')
    await settleCollapses(element)
    const article = sample(element, slider.samples[0].title)
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
    const inner = host.shadowRoot?.querySelector<HTMLElement>('.wui-collapse-inner')
    if (!inner) throw new Error('collapse 的影子树没有渲染')
    const peekLength = parseFloat(host.peek ?? '0')
    await vi.waitFor(() =>
      expect(
        parseFloat(getComputedStyle(inner).getPropertyValue('--wui-collapse-peek-edge-active')) / peekLength
      ).toBeGreaterThanOrEqual(0.6)
    )
  })

  it('markdown 正文按 Notion 版式渲染：正文 / 标题 / 行内代码 / 表格', async () => {
    const element = mountDoc('slider')
    await settleCollapses(element)
    const article = sample(element, slider.samples[0].title)
    const intro = element.querySelector<HTMLElement>('[data-example-intro]')
    const description = article.querySelector<HTMLElement>('.mdc-markdown-secondary')
    const sectionHeading = element.querySelector<HTMLElement>('h2.mdc-heading')
    const sampleHeading = article.querySelector<HTMLElement>('h3.mdc-heading')
    const table = element.querySelector<HTMLElement>('[data-example-api="props"] table')
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
    const element = mountDoc('button')
    await settleCollapses(element)
    const article = sample(element, button.samples[0].title)
    const host = article.querySelector<WebUiCollapse>('web-ui-collapse')
    const bar = article.querySelector<HTMLElement>('[data-flavor-switch]')?.parentElement
    const segmented = article.querySelector<HTMLElement>('[data-flavor-switch]')
    if (!host || !bar || !segmented) throw new Error('工具条结构不完整')

    bar.click()
    await vi.waitFor(() => expect(host.open).toBe(true))
    bar.click()
    await vi.waitFor(() => expect(host.open).toBe(false))

    // segmented 自己 stop 掉冒泡：点它只切框架，不会顺带把代码区打开。
    segmented.click()
    expect(host.open).toBe(false)
  })

  it('收起代码后滚动位置复位，再次展开从顶部开始', async () => {
    // 只有长示例才能滚出真实位移：drawer 的「嵌套堆叠」源码有 60 多行，必然超过 32rem。
    const element = mountDoc('drawer')
    await settleCollapses(element)
    const article = sample(element, '嵌套堆叠')
    const host = article.querySelector<WebUiCollapse>('web-ui-collapse')
    const code = article.querySelector<HTMLElement>('[data-code]')
    const toggle = article.querySelector<HTMLElement>('[data-toggle-code]')
    if (!host || !code || !toggle) throw new Error('collapse、代码区或展开按钮不完整')
    await vi.waitFor(() => expect(toggle.shadowRoot?.querySelector('button')).toBeTruthy())
    const button = () => toggle.shadowRoot?.querySelector<HTMLElement>('button')

    button()?.click()
    await vi.waitFor(() => expect(host.open).toBe(true))
    await host.updateComplete
    code.scrollTop = 300
    expect(code.scrollTop).toBe(300)

    button()?.click()
    await vi.waitFor(() => expect(host.open).toBe(false))
    await host.updateComplete
    expect(code.scrollTop).toBe(0)
  })

  it('展开后的代码区有最大高度并自己滚动', async () => {
    const element = mountDoc('slider')
    await settleCollapses(element)
    const code = sample(element, '垂直方向').querySelector<HTMLElement>('[data-code]')
    if (!code) throw new Error('代码区没有 data-code')

    const style = getComputedStyle(code)
    expect(style.maxHeight).toBe('512px')
    expect(style.overflowY).toBe('auto')
  })

  it('同页的 slider 示例使用不同 accessible name', async () => {
    const element = mountDoc('slider')
    await mountDemos(element, slider, 'web-ui-slider')

    const examples = [
      ['基础', 0, '音量'],
      ['刻度标记', 0, '刻度步进 10'],
      ['垂直方向', 0, '垂直亮度'],
      ['input 与 change', 0, '事件演示'],
      ['表单取值', 0, '表单音量'],
      ['CSS 变量', 0, '宽轨道']
    ] as const
    expect(new Set(examples.map(([, , name]) => name)).size).toBe(examples.length)

    for (const [title, index, name] of examples) {
      const host = sliderIn(element, title, index)
      expect(host.getAttribute('aria-label')).toBe(name)
      expect(
        page.elementLocator(host).getByRole('slider', { name, exact: true }).length,
        `${title} 的 slider 名称`
      ).toBe(1)
      expect(
        page.elementLocator(element).getByRole('slider', { name, exact: true }).length,
        `当前组件文档中名为「${name}」的 slider`
      ).toBe(1)
    }
  })

  it('页面上写的数字，就是屏幕上跑起来的那个值', async () => {
    const element = mountDoc('slider')
    await mountDemos(element, slider, 'web-ui-slider')

    // 代码块与 demo 文件同源，所以从渲染出来的 `<pre>` 文本里读到的取值，必须等于被执行那份源码
    // 传进组件的 props——这一条在浏览器层把「显示」和「执行」接上了。
    expect(sample(element, '基础').querySelector('pre.shiki')?.textContent).toMatch(
      /:min="0" :max="100" :step="5" :value="40"/
    )
    const basic = sliderIn(element, '基础', 1)
    expect([basic.min, basic.max, basic.step, basic.value]).toEqual([0, 100, 5, 40])

    // shiki 的 `<pre>` 里行与行之间没有文本节点分隔，所以逐属性判断，不比对跨行片段。
    const verticalCode = sample(element, '垂直方向').querySelector('pre.shiki')?.textContent ?? ''
    expect(verticalCode).toContain('vertical')
    expect(verticalCode).toContain('marks')
    const vertical = sliderIn(element, '垂直方向', 1)
    expect([vertical.marks, vertical.vertical]).toEqual([true, true])

    // CSS 变量示例写的也是「页面上的数字」：类里的 `--wui-slider-*` 要经生成的 `examples.css`
    // 落到宿主盒子上，量得到才说明这条示例真的在演示尺寸，而不是只剩一段没人用的类名。
    const sized = getComputedStyle(sliderIn(element, 'CSS 变量'))
    expect([sized.width, sized.height]).toEqual(['300px', '10px'])
  })

  it('示例是活的：键盘能改值', async () => {
    const element = mountDoc('slider')
    await mountDemos(element, slider, 'web-ui-slider')

    const host = sliderIn(element, '垂直方向')
    expect(host.value).toBe(60)
    const thumb = host.shadowRoot?.querySelector<HTMLElement>('[role="slider"]')
    if (!thumb) throw new Error('web-ui-slider 的影子树里没有 role="slider"')

    thumb.focus()
    await userEvent.keyboard('{ArrowRight}')
    await vi.waitFor(() => expect(host.value).toBe(61))
  })

  it('事件示例的读数跟着键盘走：@input 与 @change 真的接在 custom element 上', async () => {
    const element = mountDoc('slider')
    await mountDemos(element, slider, 'web-ui-slider')

    const preview = previewOf(element, 'input 与 change')
    const readout = readoutOf(preview)
    expect(readout()).toBe('input: 40 / change: 40')

    const host = sliderIn(element, 'input 与 change')
    const thumb = host.shadowRoot?.querySelector<HTMLElement>('[role="slider"]')
    if (!thumb) throw new Error('事件示例的 slider 没有升级')
    thumb.focus()
    await userEvent.keyboard('{ArrowRight}')
    // step 是 5，一次右箭头推进一档；两个读数一起动才说明两条 handler 都接上了。
    await vi.waitFor(() => expect(readout()).toBe('input: 45 / change: 45'))
  })

  it('表单取值示例：提交带出滑块的值，重置把读数和值一起清掉', async () => {
    const element = mountDoc('slider')
    await mountDemos(element, slider, 'web-ui-slider')

    const preview = previewOf(element, '表单取值')
    const readout = readoutOf(preview)

    // 局部名不叫 `slider`：它会把模块作用域里那篇文档的常量挡掉，同一块里的 `mountDemos` 就读到自己了。
    const host = sliderIn(element, '表单取值')
    expect([readout(), host.value]).toEqual(['尚未提交', 40])

    const thumb = host.shadowRoot?.querySelector<HTMLElement>('[role="slider"]')
    if (!thumb) throw new Error('表单取值示例的 slider 没有升级')
    thumb.focus()
    await userEvent.keyboard('{ArrowRight}')
    // step 是 5，所以一次右箭头推进一档。
    await vi.waitFor(() => expect(host.value).toBe(45))

    shadowButton(preview, '提交').click()
    await vi.waitFor(() => expect(readout()).toBe('volume=45'))

    shadowButton(preview, '重置').click()
    await vi.waitFor(() => expect([readout(), host.value]).toEqual(['尚未提交', 40]))
  })

  it('props 表里手写的默认值，就是 slider 元素的实际初值', async () => {
    // 每条 slider 示例都带 aria-label（可命名是文档明说的要求），页面上取不到「什么都没写」的
    // 样本，所以直接建一个裸元素比：表里那一列是手写的，元素初值来自组件源码，两边对不上就是文档漏改。
    const bare = document.createElement('web-ui-slider')
    try {
      document.body.append(bare)
      await bare.updateComplete
      expect({
        disabled: String(bare.disabled),
        marks: String(bare.marks),
        vertical: String(bare.vertical),
        name: bare.name,
        required: String(bare.required),
        'aria-label': bare.getAttribute('aria-label') ?? '',
        'aria-labelledby': bare.getAttribute('aria-labelledby') ?? '',
        value: String(bare.value),
        min: String(bare.min),
        max: String(bare.max),
        step: String(bare.step)
      }).toEqual(documentedDefaults(slider))
    } finally {
      bare.remove()
    }
  })

  it('props 表里手写的默认值，就是 checkbox / radio 元素的实际初值', async () => {
    // 这两篇的每条示例都写了属性，页面上取不到「什么都没写」的样本，所以直接建一个裸元素比：
    // 表里那一列是手写的，元素初值来自组件源码，两边对不上就是文档漏改。
    const bare = {
      checkbox: document.createElement('web-ui-checkbox'),
      radio: document.createElement('web-ui-radio')
    }
    try {
      document.body.append(bare.checkbox, bare.radio)
      await Promise.all([bare.checkbox.updateComplete, bare.radio.updateComplete])
      for (const [doc, host] of [
        [checkbox, bare.checkbox],
        [radio, bare.radio]
      ] as const) {
        expect({
          checked: String(host.checked),
          value: host.value,
          name: host.name,
          disabled: String(host.disabled),
          required: String(host.required)
        }).toEqual(documentedDefaults(doc))
      }
    } finally {
      bare.checkbox.remove()
      bare.radio.remove()
    }
  })

  it('checkbox 示例是活的：点整行都能勾选，禁用项按下不动', async () => {
    const element = mountDoc('checkbox')
    await mountDemos(element, checkbox, 'web-ui-checkbox')

    const readout = readoutOf(previewOf(element, '基础'))
    const [email, sms] = [0, 1].map(index => hostIn<WebUiCheckbox>(element, '基础', checkboxHost, index))
    expect([email.checked, sms.checked, readout()]).toEqual([true, false, '已选择：email'])

    // 落点由真实指针命中影子树里的 label：indicator、间距与右侧文案是同一次切换。
    await userEvent.click(sms)
    await vi.waitFor(() => expect(readout()).toBe('已选择：email、sms'))
    expect([email.checked, sms.checked]).toEqual([true, true])

    // 取消同样走那条链：页面把 `:checked` 写成比较结果，回写要把这一项落回未选中。
    await userEvent.click(email)
    await vi.waitFor(() => expect(readout()).toBe('已选择：sms'))
    expect([email.checked, sms.checked]).toEqual([false, true])

    const [lockedOn, lockedOff] = [0, 1].map(index => hostIn<WebUiCheckbox>(element, '禁用', checkboxHost, index))
    await userEvent.click(lockedOn)
    await userEvent.click(lockedOff)
    expect([lockedOn.checked, lockedOff.checked]).toEqual([true, false])
  })

  it('checkbox 表单示例：required 拦下空提交，勾满才出 name=value，重置清回去', async () => {
    const element = mountDoc('checkbox')
    await mountDemos(element, checkbox, 'web-ui-checkbox')

    const preview = previewOf(element, '表单值')
    const readout = readoutOf(preview)
    const [email, sms, agreement] = [0, 1, 2].map(index =>
      hostIn<WebUiCheckbox>(element, '表单值', checkboxHost, index)
    )
    expect([email.checked, sms.checked, agreement.checked, readout()]).toEqual([false, false, false, '尚未提交'])

    // 先勾一个非必填项再提交：条款没勾时若校验没拦下，读数会变成 `channel=email`，
    // 所以这一句区分得出「被 required 挡住」和「提交了一条空 FormData」。
    await userEvent.click(email)
    shadowButton(preview, '提交').click()
    expect(readout()).toBe('尚未提交')

    await userEvent.click(agreement)
    shadowButton(preview, '提交').click()
    await vi.waitFor(() => expect(readout()).toBe('channel=email · agreement=yes'))

    // 重置走 `form.reset()` + 页面把读数清空。这一条里三项挂载时本来就全未选中，所以「回到挂载态」
    // 与「全清」同解，钉住的是重置真的把勾与读数一起带走。
    shadowButton(preview, '重置').click()
    await vi.waitFor(() => expect([readout(), email.checked, agreement.checked]).toEqual(['尚未提交', false, false]))
    expect(sms.checked).toBe(false)
  })

  it('radio 示例是活的：点选会换项，再点已选中的一项不动，禁用项点不动', async () => {
    const element = mountDoc('radio')
    await mountDemos(element, radio, 'web-ui-radio')

    const readout = readoutOf(previewOf(element, '基础'))
    const [basic, pro] = [0, 1].map(index => hostIn<WebUiRadio>(element, '基础', radioHost, index))
    expect([basic.checked, pro.checked, readout()]).toEqual([true, false, '当前方案：basic'])

    // 计数从第一次真实点选就开始：没有这条正向对照，下面那句「再点不派发」也可能只是监听没装上。
    let changes = 0
    pro.addEventListener('change', () => {
      changes += 1
    })
    await userEvent.click(pro)
    await vi.waitFor(() => expect(readout()).toBe('当前方案：pro'))
    expect(changes).toBe(1)
    // 单选不是靠点击取消：上一项由页面的比较式回写成未选中。
    expect([basic.checked, pro.checked]).toEqual([false, true])

    // 已选中的一项再点一次不派发 `change`。读数区分不出「组件提前 return」和「页面回写了同一个值」——
    // 去掉组件里那条 `|| this._checked`，点击会写回 true（无变化）、照常派发事件、页面再把同一个值设
    // 一遍，三个读数全都不动。事件计数才是那条提前 return 的唯一判据。
    await userEvent.click(pro)
    expect([changes, basic.checked, pro.checked, readout()]).toEqual([1, false, true, '当前方案：pro'])

    const [lockedOn, lockedOff] = [0, 1].map(index => hostIn<WebUiRadio>(element, '禁用', radioHost, index))
    await userEvent.click(lockedOn)
    await userEvent.click(lockedOff)
    expect([lockedOn.checked, lockedOff.checked]).toEqual([true, false])
  })

  it('radio 表单示例：提交带出选中项的 value，重置回到初始项', async () => {
    const element = mountDoc('radio')
    await mountDemos(element, radio, 'web-ui-radio')

    const preview = previewOf(element, '表单值')
    const readout = readoutOf(preview)
    const [small, medium, large] = [0, 1, 2].map(index => hostIn<WebUiRadio>(element, '表单值', radioHost, index))
    expect([small.checked, medium.checked, large.checked, readout()]).toEqual([false, true, false, '尚未提交'])

    await userEvent.click(large)
    await vi.waitFor(() => expect([small.checked, medium.checked, large.checked]).toEqual([false, false, true]))

    shadowButton(preview, '提交').click()
    await vi.waitFor(() => expect(readout()).toBe('size=l'))

    // 页面把 `size` 推回 `m`，`:checked="size === 'm'"` 的回写单独就能得到这个结果；`form.reset()` 复原的
    // 也是挂载时那一份（同样是 `m`），所以这里区分不出两条路径，钉的是重置之后只剩中项选中。
    shadowButton(preview, '重置').click()
    await vi.waitFor(() => expect([readout(), medium.checked, large.checked]).toEqual(['尚未提交', true, false]))
    expect(small.checked).toBe(false)
  })

  it('组示例的排列方向与成员间距真的落到样式里', async () => {
    // 组文档等挂载按**成员**宿主判（组元素影子树里没有 role），方向与间距则量组元素本身。
    for (const [doc, tag, groupTag] of [
      [checkboxGroup, 'web-ui-checkbox', 'web-ui-checkbox-group'],
      [radioGroup, 'web-ui-radio', 'web-ui-radio-group']
    ] as const) {
      const element = mountDoc(doc.component)
      await mountDemos(element, doc, tag)

      // 两条 direction 的差别要量得出来：读属性证明不了样式生效，flex 轴向才决定成员是叠着还是并排。
      const dirs = [...sample(element, '排列方向').querySelectorAll<HTMLElement>(groupTag)]
      expect(
        dirs.map(group => getComputedStyle(group).flexDirection),
        `${doc.component} 的排列方向`
      ).toEqual(['column', 'row'])

      // 间距同理：默认那条经 `--wui-space-2` 解析成 8px，第二条用工具类覆盖成 16px。
      const gaps = [...sample(element, '成员间距').querySelectorAll<HTMLElement>(groupTag)]
      expect(
        gaps.map(group => getComputedStyle(group).gap),
        `${doc.component} 的成员间距`
      ).toEqual(['8px', '16px'])
    }
  })

  it('props 表把 markdown 里手写的类型与默认值原样渲染出来', () => {
    const element = mountDoc('collapse')
    const props = apiSection(collapse, 'props')
    const rows = rowsOf(element, 'props')

    expect(rows.map(cells => cells[0])).toEqual(props.rows.map(row => row[0]))
    // 列序照 markdown 的表头原样渲染：渲染端不认识哪一列是说明，它照 `columns` 逐列铺。
    expect(headersOf(element, 'props')).toEqual(props.columns.map(column => column.title))
    // `boolean` / `false` 写在 collapse.md 的 Props 表里：表格是这份数据的唯一来源，
    // 所以这一条钉的是 markdown → 生成 payload → DOM 这三跳没有走样，不是「源码说了算」。
    expect(cellOf(rows, props, 'open', '类型')).toBe('boolean')
    expect(cellOf(rows, props, 'open', '默认值')).toBe('false')

    const sliderRows = rowsOf(mountDoc('slider'), 'props')
    expect(cellOf(sliderRows, apiSection(slider, 'props'), 'max', '默认值')).toBe('100')
  })

  it('options 表（命令式 API 的 option）与 props 表一样渲染类型与默认值两列', () => {
    const rows = rowsOf(mountDoc('image-preview'), 'options')
    const options = apiSection(imagePreview, 'options')

    expect(rows.map(cells => cells[0])).toEqual(options.rows.map(row => row[0]))
    // #360：元素 `@property` 里没有的 `index` / `target` / `container` 也在这一节里，
    // 所以这三个字段是「表格是手写的唯一来源」这条契约的直接证据。
    expect(cellOf(rows, options, 'index', '类型')).toBe('number')
    expect(cellOf(rows, options, 'index', '默认值')).toBe('0')
    expect(cellOf(rows, options, 'target', '默认值')).toBe('—')
    expect(cellOf(rows, options, 'container', '默认值')).toBe('—')
  })

  it('events 与 slots 表按 markdown 的小节生成，没写就不出现', () => {
    const element = mountDoc('collapse')
    expect(rowsOf(element, 'events').map(cells => cells[0])).toEqual(['open-change'])
    expect(rowsOf(element, 'slots').map(cells => cells[0])).toEqual(
      apiSection(collapse, 'slots').rows.map(row => row[0])
    )

    const sliderElement = mountDoc('slider')
    expect(rowsOf(sliderElement, 'events').map(cells => cells[0])).toEqual(['input', 'change'])
    // 两列小节的列形状来自 markdown 的表头，渲染端不会再凭空补出类型与默认值两格。
    expect(rowsOf(sliderElement, 'events').map(cells => cells.length)).toEqual([2, 2])

    // button.md 没写 ### Events 小节，就不该凭空多出一张 Events 表。
    expect(mountDoc('button').querySelector('[data-example-api="events"]')).toBeNull()
  })

  it('methods 表列出手写的方法，没写方法的组件不留空表', () => {
    const rows = rowsOf(mountDoc('collapse'), 'methods')

    // 名称单元格写成调用形态（`show()` / `replay(options?)`），与 Props / Events 的裸属性名不同：
    // 这一节记的是挂在元素上的方法，不是声明式契约。
    expect(rows.map(cells => cells[0])).toEqual(apiSection(collapse, 'methods').rows.map(row => row[0]))
    expect(rows.map(cells => cells[0])).toEqual(['show()', 'close()', 'toggle()'])
    // 两列小节的列形状来自 markdown 的表头。
    expect(rows.map(cells => cells.length)).toEqual([2, 2, 2])

    // button.md 没有方法可写，就不该凭空多出一张 Methods 表。
    expect(mountDoc('button').querySelector('[data-example-api="methods"]')).toBeNull()
  })

  it('散文小节渲染成正文 HTML，不铺成一张表', () => {
    const element = mountDoc('slider')
    const prose = slider.api.find(section => section.key === '行为说明')
    if (prose?.kind !== 'prose') throw new Error('slider 的 行为说明 不是散文小节')

    const section = element.querySelector(`[data-example-api="${prose.key}"]`)
    if (!section) throw new Error('slider 的 行为说明 小节没有渲染')
    // 散文小节没有表头也没有表格：正文就是生成器渲染好的那段 HTML。
    expect(section.querySelector('table')).toBeNull()
    // 散文可以有多段（列表、代码块都是段落级的），比的是整段正文而不是第一个 <p>。
    const expected = document.createElement('div')
    expected.innerHTML = prose.html
    expect(section.querySelector('div')?.textContent).toBe(expected.textContent)
  })

  it('返回 handle 表只收只读成员，列形状来自 markdown', () => {
    const element = mountDoc('image-preview')
    const handle = apiSection(imagePreview, '返回 handle')
    const rows = rowsOf(element, '返回 handle')

    expect(rows.map(cells => cells[0])).toEqual(handle.rows.map(row => row[0]))
    // handle 上的方法归 ### Methods，这一节只记只读成员——同一件事不在两节里各写一遍。
    expect(rows.map(cells => cells[0])).toEqual(['index', 'scale', 'images', 'closed'])
    expect(headersOf(element, '返回 handle')).toEqual(['名称', '说明', '类型'])
    expect(cellOf(rows, handle, 'closed', '类型')).toBe('Promise<void>')
  })

  it('theme 的 token 表按 markdown 的列渲染，颜色与阴影两族是浅色/深色双值列', () => {
    const element = mountDoc('theme')
    const color = apiSection(theme, 'color tokens')
    const rows = rowsOf(element, 'color tokens')

    // 两族 token 的两个值列是并列的浅色 / 深色，不是「类型 + 默认值」：列数由配置声明，渲染端照铺。
    expect(headersOf(element, 'color tokens')).toEqual(['名称', '说明', '浅色默认值', '深色默认值'])
    expect(rows.map(cells => cells[0])).toEqual(color.rows.map(row => row[0]))
    expect(cellOf(rows, color, '--wui-color-page', '浅色默认值')).toBe('#fff')
    expect(cellOf(rows, color, '--wui-color-page', '深色默认值')).toBe('#242628')
  })

  it('layout 的三张 API 表来自 markdown，四条示例都挂出 live 预览', async () => {
    const element = mountDoc('layout')

    for (const key of ['props', 'events', 'slots'] as const) {
      expect(
        rowsOf(element, key).map(cells => cells[0]),
        `${key} 表的行名`
      ).toEqual(apiSection(layout, key).rows.map(row => row[0]))
    }
    expect(rowsOf(element, 'props').map(cells => cells.length)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4])

    expect([...element.querySelectorAll('[data-sample]')].map(node => node.getAttribute('data-sample'))).toEqual(
      layout.samples.map(candidate => candidate.title)
    )
    // layout 是整屏布局，直接铺进文档页会和外层 shell 抢 sticky header，所以每条示例自己套一个
    // 限高滚动容器：预览区存在，且宿主真的挂上了。
    expect(
      [...element.querySelectorAll('[data-sample-preview]')].map(node => node.getAttribute('data-sample-preview'))
    ).toEqual(layout.samples.map(candidate => candidate.demoKey))
    await mountDemos(element, layout, 'web-ui-layout')
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
      expect(actual).toEqual(documentedDefaults(layout))
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

  it('select 示例是活的：选中后回写 value，清除回到空，禁用控件打不开', async () => {
    const element = mountDoc('select')
    await mountDemos(element, docOf('select'), 'web-ui-select')

    const preview = previewOf(element, '基础')
    const readout = readoutOf(preview)
    const host = hostIn<WebUiSelect>(element, '基础', selectHost)
    expect([host.value, readout()]).toEqual(['vue', '当前值：vue'])

    await userEvent.click(comboboxOf(host))
    await vi.waitFor(() => expect(host.open).toBe(true))

    // 选中项由页面的 @change 回写 value，trigger 的标签与读数一起动。
    await userEvent.click(preview.querySelector<HTMLElement>('web-ui-option[value="react"]')!)
    await vi.waitFor(() => expect([host.value, readout()]).toEqual(['react', '当前值：react']))
    expect(host.open).toBe(false)

    shadowButton(preview, '清除').click()
    await vi.waitFor(() => expect([host.value, readout()]).toEqual(['', '当前值：（空）']))

    // 禁用态在 Playwright 眼里不是 enabled 元素，userEvent 会拒绝点击；直接派发 click 才测得到守卫。
    const locked = hostIn<WebUiSelect>(element, '基础', selectHost, 1)
    comboboxOf(locked).click()
    expect(locked.open).toBe(false)
  })

  it('select 表单示例：required 拦下空提交，选中后带出 framework，重置回空', async () => {
    const element = mountDoc('select')
    await mountDemos(element, docOf('select'), 'web-ui-select')

    const preview = previewOf(element, '表单取值')
    const readout = readoutOf(preview)
    const host = hostIn<WebUiSelect>(element, '表单取值', selectHost)
    expect(readout()).toBe('尚未提交')

    // 空提交被 required 拦在 submit 事件之前；只读 output 分不出「被拦下」和「提交了空字段」
    // （demo 对缺失字段同样写空串），所以直接数 form 上的 submit 事件。
    const form = preview.querySelector('form')
    if (!form) throw new Error('表单取值示例没有 form')
    let submits = 0
    const countSubmit = () => submits++
    form.addEventListener('submit', countSubmit)

    shadowButton(preview, '提交').click()
    expect([submits, readout()]).toEqual([0, '尚未提交'])

    await userEvent.click(comboboxOf(host))
    await vi.waitFor(() => expect(host.open).toBe(true))
    await userEvent.click(preview.querySelector<HTMLElement>('web-ui-option[value="vue"]')!)
    await vi.waitFor(() => expect(host.value).toBe('vue'))

    shadowButton(preview, '提交').click()
    await vi.waitFor(() => expect(readout()).toBe('framework=vue'))
    expect(submits).toBe(1)

    shadowButton(preview, '重置').click()
    await vi.waitFor(() => expect([readout(), host.value]).toEqual(['尚未提交', '']))
    form.removeEventListener('submit', countSubmit)
  })

  it('select 的 open-change 每次开合各报一次', async () => {
    const element = mountDoc('select')
    await mountDemos(element, docOf('select'), 'web-ui-select')

    const preview = previewOf(element, '开合通知')
    const readout = readoutOf(preview)
    const host = hostIn<WebUiSelect>(element, '开合通知', selectHost)
    expect(readout()).toBe('open-change：0 次 · 最后一次 detail.open = —')

    await userEvent.click(comboboxOf(host))
    await vi.waitFor(() => expect(readout()).toBe('open-change：1 次 · 最后一次 detail.open = true'))

    await userEvent.click(comboboxOf(host))
    await vi.waitFor(() => expect(readout()).toBe('open-change：2 次 · 最后一次 detail.open = false'))
  })

  it('autocomplete 示例是活的：键入过滤候选，选中回填 label 与 selected-value', async () => {
    const element = mountDoc('autocomplete')
    await mountDemos(element, docOf('autocomplete'), 'web-ui-autocomplete')

    const preview = previewOf(element, '基础')
    const readout = readoutOf(preview)
    const host = hostIn<WebUiAutocomplete>(element, '基础', autocompleteHost)

    autocompleteInput(host).focus()
    await userEvent.keyboard('React')
    await vi.waitFor(() => expect(host.open).toBe(true))
    // 不匹配的候选被过滤标记藏起来：剩下的可点项只有 React。
    expect(preview.querySelector('web-ui-option[value="Vue"]')?.hasAttribute('data-filtered')).toBe(true)

    await userEvent.click(preview.querySelector<HTMLElement>('web-ui-option[value="React"]')!)
    await vi.waitFor(() => expect(readout()).toBe('输入：React · selected-value：React'))
    expect([host.value, host.selectedValue]).toEqual(['React', 'React'])
  })

  it('autocomplete 允许自定义值：无匹配时 Enter 提交原文，selected-value 保持空', async () => {
    const element = mountDoc('autocomplete')
    await mountDemos(element, docOf('autocomplete'), 'web-ui-autocomplete')

    const preview = previewOf(element, '允许自定义值')
    const readout = readoutOf(preview)
    const host = hostIn<WebUiAutocomplete>(element, '允许自定义值', autocompleteHost)

    autocompleteInput(host).focus()
    await userEvent.keyboard('Rust')
    // 没有候选匹得上，panel 不会留在打开态。
    await vi.waitFor(() => expect(host.open).toBe(false))

    await userEvent.keyboard('{Enter}')
    await vi.waitFor(() => expect(readout()).toBe('最近提交：Rust · selected-value：(空)'))
    expect(host.selectedValue).toBe('')
  })

  it('dropdown 受控示例：trigger 打开，portal 里的 item 点击关闭并带回选择', async () => {
    const element = mountDoc('dropdown')
    await mountDemos(element, docOf('dropdown'), 'web-ui-dropdown')

    const preview = previewOf(element, '受控开合')
    const readout = readoutOf(preview)
    const host = preview.querySelector<WebUiDropdown>('web-ui-dropdown')
    if (!host) throw new Error('受控开合示例没有渲染 web-ui-dropdown')
    expect(host.open).toBe(false)

    shadowButton(preview, '受控菜单').click()
    await vi.waitFor(() => expect(host.open).toBe(true))
    await vi.waitFor(() => expect(readout()).toBe('状态：open · 最近选择：—'))

    // item 被迁进 overlay root，示例把 @click 挂在 item 自己身上，点击仍能回到页面状态。
    await vi.waitFor(() =>
      expect(dropdownPanelOf(preview).querySelector('web-ui-dropdown-item[value="archive"]')).not.toBeNull()
    )
    dropdownPanelOf(preview).querySelector<HTMLElement>('web-ui-dropdown-item[value="archive"]')?.click()
    await vi.waitFor(() => expect([host.open, readout()]).toEqual([false, '状态：closed · 最近选择：归档']))
  })

  it('dropdown 命令式入口直接改 open，禁用菜单打不开', async () => {
    const element = mountDoc('dropdown')
    await mountDemos(element, docOf('dropdown'), 'web-ui-dropdown')

    const preview = previewOf(element, '命令式')
    const [menu, locked] = [...preview.querySelectorAll<WebUiDropdown>('web-ui-dropdown')]
    if (!menu || !locked) throw new Error('命令式示例没有渲染两个 web-ui-dropdown')
    expect([menu.open, locked.open]).toEqual([false, false])

    shadowButton(preview, '调用 openMenu()').click()
    await vi.waitFor(() => expect(menu.open).toBe(true))

    shadowButton(preview, '调用 closeAll()').click()
    await vi.waitFor(() => expect(menu.open).toBe(false))

    shadowButton(preview, '禁用菜单').click()
    expect(locked.open).toBe(false)
  })

  it('segmented 事件示例：用户切换派发 input 与 change，外部改值不派发', async () => {
    const element = mountDoc('segmented')
    await mountDemos(element, docOf('segmented'), 'web-ui-segmented')

    const preview = previewOf(element, 'input 与 change')
    const readout = readoutOf(preview)
    const host = segmentedIn(element, 'input 与 change')
    const triggers = triggersOf(host)
    expect(readout()).toBe('input: 0 / change: 0 · 当前值：week')

    // 程序化路径：页面直接改 value，indicator 动但两条计数都不动。
    shadowButton(preview, '外部设为「月」').click()
    await vi.waitFor(() => expect(readout()).toBe('input: 0 / change: 0 · 当前值：month'))
    expect(triggers.map(trigger => trigger.checked)).toEqual([false, false, true])

    // 点击已是当前项不派发。
    optionOf(triggers[2]).click()
    await vi.waitFor(() => expect(host.value).toBe('month'))
    expect(readout()).toBe('input: 0 / change: 0 · 当前值：month')

    optionOf(triggers[0]).click()
    await vi.waitFor(() => expect(readout()).toBe('input: 1 / change: 1 · 当前值：day'))
  })

  it('segmented 表单示例：提交带出选中项，重置回初始项', async () => {
    const element = mountDoc('segmented')
    await mountDemos(element, docOf('segmented'), 'web-ui-segmented')

    const preview = previewOf(element, '表单字段')
    const readout = readoutOf(preview)
    const host = segmentedIn(element, '表单字段')
    const triggers = triggersOf(host)
    expect([host.value, readout()]).toEqual(['wed', '尚未提交'])

    optionOf(triggers[1]).click()
    await vi.waitFor(() => expect(host.value).toBe('tue'))

    shadowButton(preview, '提交').click()
    await vi.waitFor(() => expect(readout()).toBe('day=tue'))

    shadowButton(preview, '重置').click()
    await vi.waitFor(() => expect([readout(), host.value]).toEqual(['尚未提交', 'wed']))
  })

  it('tooltip 基础示例是活的：悬停出提示、移开收起，读数跟着 open-change', async () => {
    const element = mountDoc('tooltip')
    await mountDemos(element, docOf('tooltip'), 'web-ui-tooltip')

    const preview = previewOf(element, '基础')
    const readout = readoutOf(preview)
    const host = hostIn<WebUiTooltip>(element, '基础', tooltipHost)
    const trigger = host.querySelector<HTMLElement>('web-ui-button')
    if (!trigger) throw new Error('基础示例的 tooltip 里没有 trigger 按钮')
    expect([host.open, readout()]).toEqual([false, 'open-change：0 次 · 最后一次 detail.open = —'])

    // pointerenter 不冒泡，但 user-event 沿 enter 链逐个派发，所以打在 trigger 上就进得了宿主监听。
    await userEvent.hover(trigger)
    await vi.waitFor(() =>
      expect([host.open, readout()]).toEqual([true, 'open-change：1 次 · 最后一次 detail.open = true'])
    )
    expect(host.shadowRoot?.querySelector('.tooltip-text')?.textContent).toBe('保存当前更改')

    await userEvent.unhover(trigger)
    await vi.waitFor(() =>
      expect([host.open, readout()]).toEqual([false, 'open-change：2 次 · 最后一次 detail.open = false'])
    )
  })

  it('tooltip 富内容示例：提示来自 slot="content"，不是 content 属性', async () => {
    const element = mountDoc('tooltip')
    await mountDemos(element, docOf('tooltip'), 'web-ui-tooltip')

    const preview = previewOf(element, '富内容')
    const readout = readoutOf(preview)
    const host = hostIn<WebUiTooltip>(element, '富内容', tooltipHost)
    const trigger = host.querySelector<HTMLElement>('web-ui-button')
    if (!trigger) throw new Error('富内容示例的 tooltip 里没有 trigger 按钮')
    expect(trigger.getAttribute('aria-label')).toBe('查看快捷键')

    await userEvent.hover(trigger)
    await vi.waitFor(() => expect([host.open, readout()]).toEqual([true, '最后一次 detail.open = true']))

    // 影子面板里没有 .tooltip-text，落位的是具名 slot；内容节点留在宿主 light DOM。
    expect(host.shadowRoot?.querySelector('.tooltip-text')).toBeNull()
    const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="content"]')
    const content = slot?.assignedElements()[0]
    expect(content?.parentElement).toBe(host)
    expect(content?.textContent).toContain('打开命令面板')

    await userEvent.unhover(trigger)
    await vi.waitFor(() => expect(readout()).toBe('最后一次 detail.open = false'))
  })

  it('tooltip 延迟示例：0 延迟即时开合，禁用提示不出现也不派发', async () => {
    const element = mountDoc('tooltip')
    await mountDemos(element, docOf('tooltip'), 'web-ui-tooltip')

    const preview = previewOf(element, '延迟')
    const readout = readoutOf(preview)
    const [instant, locked] = [...preview.querySelectorAll<WebUiTooltip>('web-ui-tooltip')]
    if (!instant || !locked) throw new Error('延迟示例没有渲染两个 tooltip')
    expect([instant.showDelay, instant.hideDelay]).toEqual([0, 0])

    const instantTrigger = instant.querySelector<HTMLElement>('web-ui-button')
    if (!instantTrigger) throw new Error('即时提示的 tooltip 里没有 trigger 按钮')
    await userEvent.hover(instantTrigger)
    await vi.waitFor(() => expect(instant.open).toBe(true))
    // readout 由 open-change handler 写入，晚于 open 翻转：跟着等，不等瞬时序。
    await vi.waitFor(() => expect(readout()).toBe('即时提示最近一次 detail.open = true · 禁用提示不派发'))

    await userEvent.unhover(instantTrigger)
    await vi.waitFor(() => expect(instant.open).toBe(false))

    // disabled 只关掉触发：不显示、也不派发，所以读数停在上一次。
    expect(locked.disabled).toBe(true)
    const lockedTrigger = locked.querySelector<HTMLElement>('web-ui-button')
    if (!lockedTrigger) throw new Error('禁用提示的 tooltip 里没有 trigger 按钮')
    await userEvent.hover(lockedTrigger)
    await vi.waitFor(() =>
      expect([locked.open, readout()]).toEqual([false, '即时提示最近一次 detail.open = false · 禁用提示不派发'])
    )
  })

  it('popover 基础示例：点 trigger 开合，内容真的落进 panel 的 slot', async () => {
    const element = mountDoc('popover')
    await mountDemos(element, docOf('popover'), 'web-ui-popover')

    const preview = previewOf(element, '基础')
    const readout = readoutOf(preview)
    const host = hostIn<WebUiPopover>(element, '基础', popoverHost)
    expect([host.open, readout()]).toEqual([false, 'open-change：0 次 · 最后一次 detail.open = —'])

    shadowButton(preview, '显示详情').click()
    await vi.waitFor(() =>
      expect([host.open, readout()]).toEqual([true, 'open-change：1 次 · 最后一次 detail.open = true'])
    )

    // 默认插槽里的节点留在宿主 light DOM，靠 panel 的 <slot> 显示：assignedNodes 关闭态也成立，所以和 open 一起等。
    await vi.waitFor(() =>
      expect(
        host.open &&
          popoverPanelOf(preview)
            .querySelector<HTMLSlotElement>('slot:not([name])')
            ?.assignedNodes()
            .some(node => node.textContent?.includes('发布详情'))
      ).toBe(true)
    )

    shadowButton(preview, '显示详情').click()
    await vi.waitFor(() =>
      expect([host.open, readout()]).toEqual([false, 'open-change：2 次 · 最后一次 detail.open = false'])
    )
  })

  it('popover hover 示例：进与出各等 100ms，读数只跟随用户来源', async () => {
    const element = mountDoc('popover')
    await mountDemos(element, docOf('popover'), 'web-ui-popover')

    const preview = previewOf(element, 'Hover 触发')
    const readout = readoutOf(preview)
    const host = hostIn<WebUiPopover>(element, 'Hover 触发', popoverHost)
    expect(host.trigger).toBe('hover')
    const trigger = buttonOf(preview, '悬停我')

    await userEvent.hover(trigger)
    await vi.waitFor(() => expect([host.open, readout()]).toEqual([true, '最后一次 detail.open = true']))

    // 这个模式下 click 不参与开合：点已经开着的 trigger 也不会收掉 panel。
    await userEvent.click(trigger)
    expect([host.open, readout()]).toEqual([true, '最后一次 detail.open = true'])

    await userEvent.unhover(trigger)
    await vi.waitFor(() => expect([host.open, readout()]).toEqual([false, '最后一次 detail.open = false']))
  })

  it('popover 受控示例：show()/close() 不派发，trigger 点击派发并由页面回写', async () => {
    const element = mountDoc('popover')
    await mountDemos(element, docOf('popover'), 'web-ui-popover')

    const preview = previewOf(element, '受控开合')
    const readout = readoutOf(preview)
    const host = hostIn<WebUiPopover>(element, '受控开合', popoverHost)
    expect([host.open, host.trigger, readout()]).toEqual([false, 'manual', 'open = false'])

    shadowButton(preview, 'show()').click()
    await vi.waitFor(() => expect([host.open, readout()]).toEqual([true, 'open = true']))

    // manual 的 panel 被 setInert：Escape 被吞掉，既不关闭也不派发。
    await userEvent.keyboard('{Escape}')
    expect([host.open, readout()]).toEqual([true, 'open = true'])

    shadowButton(preview, 'close()').click()
    await vi.waitFor(() => expect([host.open, readout()]).toEqual([false, 'open = false']))

    // 点 trigger 是用户来源：组件切换后派发 open-change，页面把 detail.open 写回同一份状态。
    shadowButton(preview, '手动开合').click()
    await vi.waitFor(() => expect([host.open, readout()]).toEqual([true, 'open = true']))
    shadowButton(preview, '手动开合').click()
    await vi.waitFor(() => expect([host.open, readout()]).toEqual([false, 'open = false']))
  })

  it('context-menu 基础示例：右键打开，激活一项关掉并回报', async () => {
    const element = mountDoc('context-menu')
    await mountDemos(element, docOf('context-menu'), 'web-ui-context-menu')

    const preview = previewOf(element, '基础')
    const readout = readoutOf(preview)
    const host = hostIn<WebUiContextMenu>(element, '基础', contextMenuHost)
    expect([host.isOpen, readout()]).toEqual([false, 'open-change：0 次 · 最后一次 detail.open = —'])

    rightClick(host)
    await vi.waitFor(() =>
      expect([host.isOpen, readout()]).toEqual([true, 'open-change：1 次 · 最后一次 detail.open = true'])
    )

    // item 是打开之后才迁进 panel 的：等 panel 带着这一项出现再点。
    const panel = await vi.waitFor(() => openMenuPanelWith('粘贴'))
    expect(menuItemOf(panel, '删除').disabled).toBe(true)
    menuItemOf(panel, '复制').click()
    await vi.waitFor(() =>
      expect([host.isOpen, readout()]).toEqual([false, 'open-change：2 次 · 最后一次 detail.open = false'])
    )
    // 关掉后 item 迁回宿主。
    await vi.waitFor(() => expect(host.querySelectorAll('web-ui-dropdown-item').length).toBe(3))
  })

  it('context-menu 禁用示例：右键不打开也不计数，重新启用后照常', async () => {
    const element = mountDoc('context-menu')
    await mountDemos(element, docOf('context-menu'), 'web-ui-context-menu')

    const preview = previewOf(element, '禁用')
    const readout = readoutOf(preview)
    const host = hostIn<WebUiContextMenu>(element, '禁用', contextMenuHost)

    shadowButton(preview, '禁用 menu').click()
    await nextTick()
    rightClick(host)
    expect([host.isOpen, readout()]).toEqual([false, 'disabled = true · open-change：0 次 · 最后一次 detail.open = —'])

    shadowButton(preview, '启用 menu').click()
    await nextTick()
    rightClick(host)
    await vi.waitFor(() =>
      expect([host.isOpen, readout()]).toEqual([
        true,
        'disabled = false · open-change：1 次 · 最后一次 detail.open = true'
      ])
    )

    await userEvent.keyboard('{Escape}')
    await vi.waitFor(() => expect(host.isOpen).toBe(false))
  })

  it('dialog 基础示例：程序式打开与 footer 都不派发，Escape 把结果交回来', async () => {
    const element = mountDoc('dialog')
    await mountDemos(element, docOf('dialog'), 'web-ui-dialog')

    const preview = previewOf(element, '基础')
    const readout = readoutOf(preview)
    const host = hostIn<WebUiDialog>(element, '基础', dialogHost)
    expect([host.open, host.shadowRoot?.querySelector('dialog')?.hasAttribute('open'), readout()]).toEqual([
      false,
      false,
      'open-change：0 次 · 最后一次 detail.open = —'
    ])

    // 页面把 open 置真：这条路径不派发事件，读数停在 0 次。
    shadowButton(preview, '打开 dialog').click()
    await vi.waitFor(() => expect(host.open).toBe(true))
    expect(readout()).toBe('open-change：0 次 · 最后一次 detail.open = —')
    expect(host.shadowRoot?.querySelector('.wui-dialog-heading')?.textContent).toBe('确认操作')

    // footer 里的按钮也是页面直接改状态。
    shadowButton(preview, '取消').click()
    await vi.waitFor(() => expect(host.open).toBe(false))
    expect(readout()).toBe('open-change：0 次 · 最后一次 detail.open = —')

    shadowButton(preview, '打开 dialog').click()
    await vi.waitFor(() => expect(host.open).toBe(true))
    await userEvent.keyboard('{Escape}')
    await vi.waitFor(() =>
      expect([host.open, readout()]).toEqual([false, 'open-change：1 次 · 最后一次 detail.open = false'])
    )
  })

  it('dialog 受控关闭示例：Escape 只请求关闭，页面不回写就保持打开', async () => {
    const element = mountDoc('dialog')
    await mountDemos(element, docOf('dialog'), 'web-ui-dialog')

    const preview = previewOf(element, '受控关闭')
    const readout = readoutOf(preview)
    const host = hostIn<WebUiDialog>(element, '受控关闭', dialogHost)
    expect(readout()).toBe('已拦截关闭请求 · 0 次')

    shadowButton(preview, '打开 dialog').click()
    await vi.waitFor(() => expect(host.open).toBe(true))

    await userEvent.keyboard('{Escape}')
    await vi.waitFor(() => expect(readout()).toBe('已拦截关闭请求 · 1 次'))
    expect(host.open).toBe(true)

    await userEvent.keyboard('{Escape}')
    await vi.waitFor(() => expect(readout()).toBe('已拦截关闭请求 · 2 次'))
    expect(host.open).toBe(true)

    // 「放弃更改」直接写 false：程序式关闭，controlled 不拦。
    shadowButton(preview, '放弃更改').click()
    await vi.waitFor(() => expect(host.open).toBe(false))
  })

  it('dialog headless 示例：内置 header 与 footer 一概不渲染，默认插槽自己铺内容', async () => {
    const element = mountDoc('dialog')
    await mountDemos(element, docOf('dialog'), 'web-ui-dialog')

    const preview = previewOf(element, 'Headless')
    const readout = readoutOf(preview)
    const host = hostIn<WebUiDialog>(element, 'Headless', dialogHost)
    const shadow = host.shadowRoot
    if (!shadow) throw new Error('headless dialog 没有影子树')
    expect(host.headless).toBe(true)
    expect(shadow.querySelector('.header')).toBeNull()
    expect(shadow.querySelector('.wui-dialog-footer')).toBeNull()
    expect(shadow.querySelector('dialog')?.getAttribute('aria-label')).toBe('图片详情')
    expect(readout()).toBe('headless dialog：已关闭')

    shadowButton(preview, '打开图片详情').click()
    await vi.waitFor(() => expect([host.open, readout()]).toEqual([true, 'headless dialog：已打开']))
    expect(shadow.querySelector('.wui-dialog-content')).not.toBeNull()
    // 默认插槽内容是宿主 light DOM：量 host.textContent 才证明落在 dialog 里，preview 全文谁都能命中。
    expect(host.textContent).toContain('山间清晨')

    shadowButton(preview, '完成').click()
    await vi.waitFor(() => expect([host.open, readout()]).toEqual([false, 'headless dialog：已关闭']))
  })

  it('toast 快捷方法示例：四条各建一条，正文与类型都落进影子树', async () => {
    const element = mountDoc('toast')
    await mountDemos(element, docOf('toast'), 'web-ui-toast')
    await demoSettled(element, '快捷方法')

    const preview = previewOf(element, '快捷方法')
    const readout = readoutOf(preview)
    await overlayCleared()

    for (const label of ['success', 'info', 'warning', 'error']) {
      shadowButton(preview, label).click()
    }
    // 影子树首帧是异步的：连正文一起等到渲染完再比。
    await vi.waitFor(() =>
      expect(toastElements().map(toastMessage)).toEqual(['操作成功', '提示信息', '请注意', '出错了'])
    )
    expect(toastElements()).toHaveLength(4)
    expect(readout()).toMatch(/^最近创建的 id：toast-\d+$/)
    // error 走 role="alert"，其余交给容器 role="log" 的 polite 播报。
    expect(toastElements()[3]?.shadowRoot?.querySelector('[role="alert"]')).not.toBeNull()
    expect(toastElements()[1]?.shadowRoot?.querySelector('[role="alert"]')).toBeNull()
  })

  it('toast 完整 option 示例：heading 与 position 落到那一条 toast 上', async () => {
    const element = mountDoc('toast')
    await mountDemos(element, docOf('toast'), 'web-ui-toast')
    await demoSettled(element, '完整 option')

    const preview = previewOf(element, '完整 option')
    const readout = readoutOf(preview)
    await overlayCleared()
    shadowButton(preview, '创建完整 option 的 toast').click()
    await vi.waitFor(() => expect(toastElements().map(toastMessage)).toEqual(['更改已写入云端']))

    const item = toastElements()[0]
    if (!item) throw new Error('完整 option 示例没有建出 toast')
    expect(item.shadowRoot?.querySelector('.toast-heading')?.textContent).toBe('已保存')
    expect(item.parentElement?.className).toContain('wui-toast-bottom-right')
    expect(readout()).toMatch(/^id：toast-\d+ · 位置：bottom-right · 4 秒后自动关闭$/)
  })

  it('toast 合并同一条示例：同 id 原地替换，不追加第二条', async () => {
    const element = mountDoc('toast')
    await mountDemos(element, docOf('toast'), 'web-ui-toast')
    await demoSettled(element, '合并同一条')

    const preview = previewOf(element, '合并同一条')
    const readout = readoutOf(preview)

    await overlayCleared()
    shadowButton(preview, '开始上传').click()
    await vi.waitFor(() => expect(toastElements().map(toastMessage)).toEqual(['上传中 0%']))
    expect(readout()).toBe('id：demo-upload · 当前：0%')

    shadowButton(preview, '进度 60%').click()
    await vi.waitFor(() => expect(toastElements().map(toastMessage)).toEqual(['上传中 60%']))
    expect(toastElements()).toHaveLength(1)

    shadowButton(preview, '完成').click()
    await vi.waitFor(() => expect(toastElements().map(toastMessage)).toEqual(['上传完成']))
    expect(toastElements()[0]?.shadowRoot?.querySelector('.toast.success')).not.toBeNull()
    expect(readout()).toBe('id：demo-upload · 当前：完成')
  })

  it('toast 关闭示例：close(id) 收走那一条，clear() 收走全部', async () => {
    const element = mountDoc('toast')
    await mountDemos(element, docOf('toast'), 'web-ui-toast')
    await demoSettled(element, '关闭')

    const preview = previewOf(element, '关闭')
    const readout = readoutOf(preview)

    await overlayCleared()
    shadowButton(preview, '创建一条').click()
    await vi.waitFor(() => expect(toastElements()).toHaveLength(1))
    expect(toastElements()[0]?.shadowRoot?.querySelector('.toast-message')?.textContent).toBe('这条 toast 不会自动关闭')

    shadowButton(preview, '关闭这一条').click()
    await vi.waitFor(() => expect(toastElements()).toHaveLength(0))
    expect(readout()).toBe('最近操作：toast.close(demo-close)')

    shadowButton(preview, '创建一条').click()
    await vi.waitFor(() => expect(toastElements()).toHaveLength(1))
    shadowButton(preview, '清空全部').click()
    await vi.waitFor(() => expect(toastElements()).toHaveLength(0))
    expect(readout()).toBe('最近操作：toast.clear()')

    // 挂载排在微任务里：同一 tick 内先建再 clear()，等过一整个宏任务周期也不该冒出那条 toast。
    shadowButton(preview, '创建一条').click()
    shadowButton(preview, '清空全部').click()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(toastElements()).toHaveLength(0)
    expect(readout()).toBe('最近操作：toast.clear()')
  })

  it('back-top 容器示例：scrollTarget 赋值后切到容器模式，过阈值才出现', async () => {
    const element = mountDoc('back-top')
    await mountDemos(element, docOf('back-top'), 'web-ui-back-top')

    const host = hostIn<WebUiBackTop>(element, '自定义滚动容器', backTopHost)
    const box = host.parentElement
    if (!box) throw new Error('back-top 没有放在滚动容器内部')
    // scrollTarget 是 element property，只能挂载后赋值：demo 的 onMounted 交完容器组件才切模式。
    await vi.waitFor(() => expect(host.scrollTarget).toBe(box))
    expect(host.hasAttribute('container-mode')).toBe(true)
    expect([host.threshold, host.visible]).toEqual([100, false])

    scrollBox(box, 150)
    await vi.waitFor(() => expect(host.visible).toBe(true))
    scrollBox(box, 0)
    await vi.waitFor(() => expect(host.visible).toBe(false))
  })

  it('back-top 自定义内容示例：default slot 顶掉默认内容，出现时机仍由阈值决定', async () => {
    const element = mountDoc('back-top')
    await mountDemos(element, docOf('back-top'), 'web-ui-back-top')

    const preview = previewOf(element, '自定义内容')
    const host = hostIn<WebUiBackTop>(element, '自定义内容', backTopHost)
    const box = host.parentElement
    if (!box) throw new Error('自定义内容示例的 back-top 没有放在滚动容器内部')
    const slotted = buttonOf(preview, '回到顶部')
    expect(slotted.closest('web-ui-back-top')).toBe(host)
    expect(getComputedStyle(slotted).visibility).toBe('hidden')

    scrollBox(box, 150)
    await vi.waitFor(() => expect(host.visible).toBe(true))
    expect(getComputedStyle(slotted).visibility).toBe('visible')

    // 交互语义仍由组件提供：点 slot 里的 button 也走同一条 toTop()。
    slotted.click()
    await vi.waitFor(() => expect(box.scrollTop).toBe(0))
  })

  it('back-top 立即回到顶部示例：scroll-behavior=auto 的点击不播动画', async () => {
    const element = mountDoc('back-top')
    await mountDemos(element, docOf('back-top'), 'web-ui-back-top')

    const host = hostIn<WebUiBackTop>(element, '立即回到顶部', backTopHost)
    const box = host.parentElement
    if (!box) throw new Error('立即回到顶部示例的 back-top 没有放在滚动容器内部')
    expect(host.scrollBehavior).toBe('auto')

    scrollBox(box, 150)
    await vi.waitFor(() => expect(host.visible).toBe(true))

    const inner = host.shadowRoot?.querySelector<HTMLElement>('[role="button"]')
    if (!inner) throw new Error('back-top 的影子树里没有 role="button"')
    inner.click()
    expect(box.scrollTop).toBe(0)

    // 键盘同理：Enter 与 Space 都走 toTop()。
    scrollBox(box, 150)
    await vi.waitFor(() => expect(host.visible).toBe(true))
    inner.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
    expect(box.scrollTop).toBe(0)
  })

  it('image-preview 基础示例：命令式打开挂到 overlay root，Escape 退场后宿主移除', async () => {
    const element = mountDoc('image-preview')
    await mountDemos(element, docOf('image-preview'), 'web-ui-image-preview')
    await demoSettled(element, '基础')

    const preview = previewOf(element, '基础')
    await overlayCleared()

    shadowButton(preview, '打开预览').click()
    // appendChild 一发生 length 就到 1：等首帧证据 dialog.open，shadow 内容渲染完，后面的 null 断言才可信。
    await vi.waitFor(() => expect(imagePreviewElements()[0]?.shadowRoot?.querySelector('dialog')?.open).toBe(true))
    const host = imagePreviewElements()[0]
    if (!host) throw new Error('预览宿主没有挂进 overlay')
    // 只传 images：四个展示类 option 保持默认关闭，画面上没有控件。
    expect(host.shadowRoot?.querySelector('.wui-image-preview-counter')).toBeNull()
    expect(host.shadowRoot?.querySelector('.wui-image-preview-close')).toBeNull()

    await userEvent.keyboard('{Escape}')
    await vi.waitFor(() => expect(imagePreviewElements()).toHaveLength(0))
  })

  it('image-preview 展示类 option 与 handle 读数：控件齐、跳图后再放大', async () => {
    const element = mountDoc('image-preview')
    await mountDemos(element, docOf('image-preview'), 'web-ui-image-preview')
    await demoSettled(element, '展示类 option')

    const display = previewOf(element, '展示类 option')
    await overlayCleared()
    shadowButton(display, '打开预览（全部控件）').click()
    // appendChild 一发生 length 就到 1：直接等首帧证据 counter 文本，shadow 内容渲染完再断其余控件。
    await vi.waitFor(() =>
      expect(imagePreviewElements()[0]?.shadowRoot?.querySelector('.wui-image-preview-counter')?.textContent).toBe(
        '1 / 3'
      )
    )
    const all = imagePreviewElements()[0]
    if (!all) throw new Error('全部控件示例没有挂出预览宿主')
    expect(all.shadowRoot?.querySelectorAll('.wui-image-preview-nav')).toHaveLength(2)
    expect(all.shadowRoot?.querySelector('.wui-image-preview-toolbar')).not.toBeNull()

    const close = all.shadowRoot?.querySelector<HTMLElement>('.wui-image-preview-close')
    if (!close) throw new Error('closable 没有渲染关闭 button')
    close.click()
    await vi.waitFor(() => expect(imagePreviewElements()).toHaveLength(0))

    // handle：先 goTo 再 zoomIn（切图会把缩放复位到 1x），读数同步拿到新值。
    await demoSettled(element, 'handle')
    const handle = previewOf(element, 'handle')
    const readout = readoutOf(handle)
    expect(readout()).toBe('尚未打开')
    shadowButton(handle, '打开并跳到第 2 张').click()
    await vi.waitFor(() => expect(readout()).toBe('第 2 张 · 缩放 150%'))
    const opened = imagePreviewElements()[0]
    if (!opened) throw new Error('handle 示例没有挂出预览宿主')
    await vi.waitFor(() =>
      expect(opened.shadowRoot?.querySelector('.wui-image-preview-scale')?.textContent).toBe('150%')
    )

    await userEvent.keyboard('{Escape}')
    await vi.waitFor(() => expect(readout()).toBe('预览已关闭'))
  })
})
