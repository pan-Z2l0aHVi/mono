import '@/components/autocomplete'
import '@/components/dialog'
import '@/components/option'
import '@/components/popover'
import '@/components/select'
import '@/components/textarea'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import scrollbarCss from '@/assets/scrollbar.css?raw'
import type { WebUiAutocomplete } from '@/components/autocomplete'
import type { WebUiDialog } from '@/components/dialog'
import type { WebUiPopover } from '@/components/popover'
import type { WebUiSelect } from '@/components/select'
import type { WebUiTextarea } from '@/components/textarea'
import type { WebUiTheme } from '@/components/theme'
import { pollUntil } from '@/shared/test-utils'

/**
 * 组件内部的滚动容器（dialog 的 `.desc`、`.wui-dialog-content`，drawer 的
 * `.wui-dialog-content` 等）靠 `src/assets/scrollbar.css` 的 `.wui-scroll` 接上
 * `web-ui-theme` 提供的 `--wui-scrollbar-handle`。这一档只能在真实浏览器里量：jsdom
 * 既不算布局，也没有 scrollbar 几何。
 *
 * 两条判据各自承重：
 * - 颜色断言证明 `.wui-scroll` 的 `scrollbar-color` 真的读到了主题 token；
 * - 宽度断言证明 scrollbar**不占布局宽度**（覆盖式）。一旦有人改回 `::-webkit-scrollbar`
 *   去拿圆角/尺寸，引擎会切回经典 scrollbar 并固定占一条宽度，这条立刻红。
 */

/** 取计算后 `scrollbar-color` 的 thumb 色（第一个颜色）。 */
function thumbColor(el: Element): string {
  const value = getComputedStyle(el).scrollbarColor
  return /rgba?\([^)]*\)|#[0-9a-f]+/i.exec(value)?.[0] ?? value
}

/**
 * 在元素自己的主题作用域里解析 `--wui-scrollbar-handle`，作为 thumb 色的期望值。
 * 写死 rgba 字面量会随 token 调整而腐化，也把「读到了主题 token」退化成「读到了该字面量」
 * （示范：context-menu scrim-theme 的 resolveToken）。
 */
function expectedHandle(el: Element): string {
  const probe = document.createElement('span')
  probe.style.color = 'var(--wui-scrollbar-handle)'
  el.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  if (!color) throw new Error('无法解析 --wui-scrollbar-handle')
  return color
}

/** scrollbar.css 里 `.wui-scroll` 的 var() 兜底值（没有主题时的期望值源），不在测试里再抄一份。 */
function scrollbarFallback(): string {
  const match = /--wui-scrollbar-handle,\s*([^)]+\))\)\s*transparent/.exec(scrollbarCss)
  if (!match) throw new Error('scrollbar.css 里找不到 --wui-scrollbar-handle 的兜底值')
  return match[1]!
}

/** 把颜色值归一成浏览器计算形态（示范：theme reduced-motion 的 resolvedColor）。 */
function resolvedColor(scope: Element, value: string): string {
  const probe = document.createElement('span')
  probe.style.color = value
  scope.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  if (!color) throw new Error(`无法解析颜色 ${value}`)
  return color
}

function desc(component: WebUiDialog): HTMLElement {
  const el = component.shadowRoot?.querySelector<HTMLElement>('.desc')
  if (!el) throw new Error('Expected dialog .desc to exist.')
  return el
}

/** `resolved-appearance` 由 root 同步异步写，等它落到目标值再读 token。 */
async function waitForResolvedAppearance(theme: WebUiTheme, expected: 'light' | 'dark'): Promise<void> {
  const deadline = performance.now() + 2000
  while (performance.now() < deadline) {
    if (theme.getAttribute('resolved-appearance') === expected) return
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  throw new Error(`resolved appearance did not become ${expected}, still ${theme.getAttribute('resolved-appearance')}`)
}

async function openTallDialog(appearance?: 'light' | 'dark'): Promise<WebUiDialog> {
  const dialog = document.createElement('web-ui-dialog') as WebUiDialog
  dialog.style.setProperty('--wui-dialog-max-height', '200px')
  const content = document.createElement('div')
  content.style.cssText = 'height: 2000px;'
  dialog.append(content)

  if (appearance) {
    const parent = document.createElement('web-ui-theme') as WebUiTheme
    parent.setAttribute('appearance', appearance)
    parent.setAttribute('motion', 'reduced')
    parent.append(dialog)
    document.body.append(parent)
    await parent.updateComplete
    await waitForResolvedAppearance(parent, appearance)
  } else {
    document.body.append(dialog)
  }

  dialog.open = true
  await dialog.updateComplete
  await new Promise(resolve => requestAnimationFrame(resolve))
  return dialog
}

async function createLightTheme(): Promise<WebUiTheme> {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  theme.setAttribute('appearance', 'light')
  theme.className = 'block'
  document.body.append(theme)
  await theme.updateComplete
  await waitForResolvedAppearance(theme, 'light')
  return theme
}

function createOptions(count: number): HTMLElement[] {
  return Array.from({ length: count }, (_, index) => {
    const option = document.createElement('web-ui-option')
    option.setAttribute('value', `option-${index}`)
    option.textContent = `Option ${index + 1}`
    return option
  })
}

function portalPanel(theme: WebUiTheme, selector: string): HTMLElement | null {
  const host = theme.getOverlayRoot()?.querySelector<HTMLElement>('[data-wui-overlay-container] > div')
  return host?.shadowRoot?.querySelector<HTMLElement>(selector) ?? null
}

async function waitForPortalScroll(
  theme: WebUiTheme,
  panelSelector: string,
  scrollSelector: string
): Promise<HTMLElement> {
  await pollUntil(
    () => Boolean(portalPanel(theme, panelSelector)?.querySelector(scrollSelector)),
    `Expected ${scrollSelector} to be created in the portal panel`
  )
  const scroll = portalPanel(theme, panelSelector)?.querySelector<HTMLElement>(scrollSelector)
  if (!scroll) throw new Error(`Expected ${scrollSelector} to exist in the portal panel`)
  return scroll
}

afterEach(() => {
  document.body.replaceChildren()
  // root 同步在全部主题断开时**保留最后值**（避免重挂间隙闪回 UA 白底），所以上一个用例的
  // thumb 色会留在 documentElement 上。这里显式清掉，让每个用例都从「还没有主题」开始。
  document.documentElement.style.removeProperty('--wui-scrollbar-handle')
})

describe('组件内部 scrollbar（浏览器）', () => {
  it('浅色主题下读到 token 的 thumb 色，且 scrollbar 不占布局宽度', async () => {
    const dialog = await openTallDialog('light')
    const el = desc(dialog)

    // 先确认它确实是滚动容器：没有溢出就量不到 scrollbar 槽，后面的宽度断言会空转。
    expect(el.scrollHeight).toBeGreaterThan(el.clientHeight)
    expect(thumbColor(el)).toBe(expectedHandle(el))
    // 覆盖式 scrollbar 不占宽度。`::-webkit-scrollbar` 的经典 scrollbar 会把这里顶成 > 0。
    expect(el.offsetWidth - el.clientWidth).toBe(0)
    // 主场景（dialog .desc）同样收窄为 thin：portal 面板的那两条（见下）不覆盖这条路径。
    expect(getComputedStyle(el).scrollbarWidth).toBe('thin')
  })

  it('深色主题下换成白色 thumb', async () => {
    const dialog = await openTallDialog('dark')
    const el = desc(dialog)

    expect(el.scrollHeight).toBeGreaterThan(el.clientHeight)
    expect(thumbColor(el)).toBe(expectedHandle(el))
    expect(el.offsetWidth - el.clientWidth).toBe(0)
  })

  it('没有主题时回退到浅色的黑 thumb，同样不占宽度', async () => {
    const dialog = await openTallDialog()
    const el = desc(dialog)

    expect(el.scrollHeight).toBeGreaterThan(el.clientHeight)
    expect(thumbColor(el)).toBe(resolvedColor(el, scrollbarFallback()))
    expect(el.offsetWidth - el.clientWidth).toBe(0)
  })

  it('theme-owned portal select 面板保留内部 scrollbar 主题', async () => {
    const theme = await createLightTheme()
    const select = document.createElement('web-ui-select') as WebUiSelect
    select.portal = true
    select.style.setProperty('--wui-select-max-height', '80px')
    select.append(...createOptions(10))
    theme.append(select)
    await select.updateComplete

    select.shadowRoot?.querySelector<HTMLElement>('[role="combobox"]')?.click()
    const scroll = await waitForPortalScroll(theme, '[role="listbox"]', '.select-scroll')

    expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight)
    expect(thumbColor(scroll)).toBe(expectedHandle(scroll))
    expect(getComputedStyle(scroll).scrollbarWidth).toBe('thin')
  })

  it('theme-owned portal autocomplete 面板保留内部 scrollbar 主题', async () => {
    const theme = await createLightTheme()
    const autocomplete = document.createElement('web-ui-autocomplete') as WebUiAutocomplete
    autocomplete.portal = true
    autocomplete.style.setProperty('--wui-autocomplete-max-height', '80px')
    autocomplete.append(...createOptions(10))
    theme.append(autocomplete)
    await autocomplete.updateComplete

    const input = autocomplete.shadowRoot?.querySelector('web-ui-input')
    input?.shadowRoot?.querySelector('input')?.focus()
    input?.click()
    const scroll = await waitForPortalScroll(theme, '.autocomplete-overlay', '.autocomplete-scroll')

    expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight)
    expect(thumbColor(scroll)).toBe(expectedHandle(scroll))
    expect(getComputedStyle(scroll).scrollbarWidth).toBe('thin')
  })

  it('textarea 原生滚动区读到 token thumb 色，不占布局宽度', async () => {
    const theme = await createLightTheme()
    const textarea = document.createElement('web-ui-textarea') as WebUiTextarea
    textarea.rows = 3
    textarea.value = Array.from({ length: 40 }, (_, index) => `line ${index}`).join('\n')
    theme.append(textarea)
    await textarea.updateComplete

    const el = textarea.shadowRoot?.querySelector<HTMLElement>('textarea')
    if (!el) throw new Error('Expected textarea to exist.')

    expect(el.scrollHeight).toBeGreaterThan(el.clientHeight)
    // 探针挂到同 shadow 的包装盒上：textarea 不是合法的元素容器，probe 不能往里塞。
    expect(thumbColor(el)).toBe(expectedHandle(el.parentElement ?? theme))
    expect(el.offsetWidth - el.clientWidth).toBe(0)
    expect(getComputedStyle(el).scrollbarWidth).toBe('thin')
  })

  it('popover 设 max-height 后超高内容滚动，滚动条保留主题', async () => {
    const theme = await createLightTheme()
    const popover = document.createElement('web-ui-popover') as WebUiPopover
    popover.style.setProperty('--wui-popover-max-height', '80px')
    const content = document.createElement('div')
    content.style.cssText = 'height: 400px;'
    popover.append(content)
    theme.append(popover)
    await popover.updateComplete

    popover.open = true
    await popover.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const el = popover.shadowRoot?.querySelector<HTMLElement>('.popover-panel')
    if (!el) throw new Error('Expected popover panel to exist.')

    // 先证明内容确实超高：opt-in 限高生效才有 scrollbar 可量。
    expect(el.scrollHeight).toBeGreaterThan(el.clientHeight)
    expect(thumbColor(el)).toBe(expectedHandle(el))
    expect(el.offsetWidth - el.clientWidth).toBe(0)
    expect(getComputedStyle(el).overflowY).toBe('auto')
  })

  it('popover 默认不限高：内容多高面板就多高', async () => {
    const theme = await createLightTheme()
    const popover = document.createElement('web-ui-popover') as WebUiPopover
    const content = document.createElement('div')
    content.style.cssText = 'height: 400px;'
    popover.append(content)
    theme.append(popover)
    await popover.updateComplete

    popover.open = true
    await popover.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const el = popover.shadowRoot?.querySelector<HTMLElement>('.popover-panel')
    if (!el) throw new Error('Expected popover panel to exist.')

    expect(el.scrollHeight).toBe(el.clientHeight)
    expect(getComputedStyle(el).maxHeight).toBe('none')
    // 滚动容器语义是 opt-in 的：默认不限高时溢出保持 visible，嵌套的绝对定位
    // 子 overlay 不被裁剪（Codex review Should fix 的回归断言）。
    expect(getComputedStyle(el).overflowY).toBe('visible')
  })

  it('portal 模式的 popover 面板自带 scrollbar 主题且限高变量已转发', async () => {
    const theme = await createLightTheme()
    const popover = document.createElement('web-ui-popover') as WebUiPopover
    popover.portal = true
    popover.style.setProperty('--wui-popover-max-height', '80px')
    const content = document.createElement('div')
    content.style.cssText = 'height: 400px;'
    popover.append(content)
    theme.append(popover)
    await popover.updateComplete

    popover.open = true
    await popover.updateComplete
    await pollUntil(() => {
      const panel = portalPanel(theme, '.popover-panel')
      return panel !== null && !panel.hasAttribute('hidden')
    }, 'Expected portal popover panel to become visible')

    const el = portalPanel(theme, '.popover-panel')
    if (!el) throw new Error('Expected portal popover panel to exist.')

    expect(el.scrollHeight).toBeGreaterThan(el.clientHeight)
    expect(thumbColor(el)).toBe(expectedHandle(el))
    expect(getComputedStyle(el).scrollbarWidth).toBe('thin')
    expect(getComputedStyle(el).overflowY).toBe('auto')
  })

  it('打开态切换 --wui-popover-max-height 会重新对齐滚动类', async () => {
    const theme = await createLightTheme()
    const popover = document.createElement('web-ui-popover') as WebUiPopover
    popover.style.setProperty('--wui-popover-max-height', '80px')
    const content = document.createElement('div')
    content.style.cssText = 'height: 400px;'
    popover.append(content)
    theme.append(popover)
    await popover.updateComplete

    popover.open = true
    await popover.updateComplete
    await new Promise(resolve => requestAnimationFrame(resolve))

    const el = popover.shadowRoot?.querySelector<HTMLElement>('.popover-panel')
    if (!el) throw new Error('Expected popover panel to exist.')
    expect(getComputedStyle(el).overflowY).toBe('auto')

    // 打开态取消限高：面板盒高随内容增长，ResizeObserver 重算后溢出回到 visible
    popover.style.removeProperty('--wui-popover-max-height')
    await pollUntil(() => getComputedStyle(el).overflowY === 'visible', '打开态取消限高后 overflow-y 未回到 visible')

    // 打开态重新限高：类重新挂上，超高内容恢复滚动
    popover.style.setProperty('--wui-popover-max-height', '80px')
    await pollUntil(() => getComputedStyle(el).overflowY === 'auto', '打开态重新限高后 overflow-y 未回到 auto')
  })
})
