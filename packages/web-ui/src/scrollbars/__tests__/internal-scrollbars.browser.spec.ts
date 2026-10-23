import '@/components/autocomplete'
import '@/components/dialog'
import '@/components/option'
import '@/components/select'
import '@/components/theme'
// `--wui-scrollbar-*` 的外观分支写在这份文档级样式里（各 app 导入一次），不在 theme 组件内，
// 所以这里要显式导入，才量得到外观切换后的值。
import '@/scrollbars/style.css'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiAutocomplete } from '@/components/autocomplete'
import type { WebUiDialog } from '@/components/dialog'
import type { WebUiSelect } from '@/components/select'
import type { WebUiTheme } from '@/components/theme'
import { pollUntil } from '@/shared/test-utils'

/**
 * 组件内部的滚动容器（dialog 的 `.desc`、`.wui-dialog-content`，drawer 的
 * `.wui-dialog-content` 等）靠 `src/scrollbars/internal.css` 的 `.wui-scroll` 接上整页
 * 同一组 `--wui-scrollbar-*`。这一档只能在真实浏览器里量：jsdom 既不算布局，也没有
 * scrollbar 几何。
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
})

describe('组件内部 scrollbar（浏览器）', () => {
  it('浅色主题下读到 token 的 thumb 色，且 scrollbar 不占布局宽度', async () => {
    const dialog = await openTallDialog('light')
    const el = desc(dialog)

    // 先确认它确实是滚动容器：没有溢出就量不到 scrollbar 槽，后面的宽度断言会空转。
    expect(el.scrollHeight).toBeGreaterThan(el.clientHeight)
    expect(thumbColor(el)).toBe('rgba(0, 0, 0, 0.39)')
    // 覆盖式 scrollbar 不占宽度。`::-webkit-scrollbar` 的经典 scrollbar 会把这里顶成 > 0。
    expect(el.offsetWidth - el.clientWidth).toBe(0)
  })

  it('深色主题下换成白色 thumb', async () => {
    const dialog = await openTallDialog('dark')
    const el = desc(dialog)

    expect(el.scrollHeight).toBeGreaterThan(el.clientHeight)
    expect(thumbColor(el)).toBe('rgba(255, 255, 255, 0.5)')
    expect(el.offsetWidth - el.clientWidth).toBe(0)
  })

  it('没有主题时回退到浅色的黑 thumb，同样不占宽度', async () => {
    const dialog = await openTallDialog()
    const el = desc(dialog)

    expect(el.scrollHeight).toBeGreaterThan(el.clientHeight)
    expect(thumbColor(el)).toBe('rgba(0, 0, 0, 0.39)')
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
    expect(thumbColor(scroll)).toBe('rgba(0, 0, 0, 0.39)')
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
    expect(thumbColor(scroll)).toBe('rgba(0, 0, 0, 0.39)')
    expect(getComputedStyle(scroll).scrollbarWidth).toBe('thin')
  })
})
