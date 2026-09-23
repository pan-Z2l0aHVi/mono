import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import '@/components/layout'
import '@/components/select'
import '@/components/theme'
import type { WebUiLayout } from '@/components/layout'
import type { WebUiSelect } from '@/components/select'
import type { WebUiTheme } from '@/components/theme'

afterEach(async () => {
  document.body.replaceChildren()
  await page.viewport(1280, 720)
})

interface Rgba {
  rgb: [number, number, number]
  alpha: number
}

function parseColor(value: string): Rgba {
  const match = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(value)
  if (!match) throw new Error(`无法解析计算色值：${value}`)
  return {
    rgb: [Number(match[1]), Number(match[2]), Number(match[3])],
    alpha: match[4] === undefined ? 1 : Number(match[4])
  }
}

/** 半透明面板叠在 page 上的实际观感。 */
function composite(panel: string, backdrop: string): [number, number, number] {
  const front = parseColor(panel)
  const back = parseColor(backdrop)
  return [0, 1, 2].map(channel => front.alpha * front.rgb[channel] + (1 - front.alpha) * back.rgb[channel]) as [
    number,
    number,
    number
  ]
}

function queryShadow(host: HTMLElement, selector: string): HTMLElement {
  const found = host.shadowRoot?.querySelector<HTMLElement>(selector)
  if (!found) throw new Error(`${host.tagName} shadow root 缺少 ${selector}`)
  return found
}

/** 探针挂在 theme 作用域内，与组件走同一条继承链。 */
function resolveToken(theme: WebUiTheme, token: string): string {
  const probe = document.createElement('div')
  probe.style.backgroundColor = `var(${token})`
  theme.append(probe)
  const value = getComputedStyle(probe).backgroundColor
  probe.remove()
  return value
}

function createTheme(appearance: 'light' | 'dark'): WebUiTheme {
  const theme = document.createElement('web-ui-theme')
  theme.appearance = appearance
  document.body.append(theme)
  return theme
}

function createLayoutIn(theme: WebUiTheme): WebUiLayout {
  const layout = document.createElement('web-ui-layout')
  layout.innerHTML = `
    <div slot="sidebar" style="height: 100%">Sidebar</div>
    <main style="height: 200px">Content</main>
  `
  theme.append(layout)
  return layout
}

async function createOpenSelectIn(theme: WebUiTheme): Promise<WebUiSelect> {
  const select = document.createElement('web-ui-select')
  select.innerHTML = `
    <web-ui-option value="apple">Apple</web-ui-option>
    <web-ui-option value="banana">Banana</web-ui-option>
  `
  theme.append(select)
  await select.updateComplete
  queryShadow(select, '[role="combobox"]').click()
  await select.updateComplete
  await new Promise(resolve => requestAnimationFrame(resolve))
  return select
}

describe('深色表面 elevation（浏览器计算值）', () => {
  it('sidebar 面板消费 sidebar 专用 token，且比 page 浅一档', async () => {
    await page.viewport(1280, 720)
    const theme = createTheme('dark')
    const layout = createLayoutIn(theme)
    await layout.updateComplete

    const pageColor = parseColor(resolveToken(theme, '--wui-color-page'))
    const panel = queryShadow(layout, '.aside-panel')
    const background = getComputedStyle(panel).backgroundColor

    // 不与 dialog/drawer/toast 共用的 overlay token 混在一起
    expect(background).toBe(resolveToken(theme, '--wui-color-surface-sidebar'))
    expect(background).not.toBe(resolveToken(theme, '--wui-color-surface-overlay'))

    composite(background, resolveToken(theme, '--wui-color-page')).forEach((value, channel) => {
      expect(value, `sidebar 通道 ${channel} 比 page 亮的量`).toBeGreaterThan(pageColor.rgb[channel] + 3)
      expect(value, `sidebar 通道 ${channel} 比 page 亮的量`).toBeLessThan(pageColor.rgb[channel] + 12)
    })
  })

  it('下拉面板比 page 浅一档，且激活行仍落在 accent 上', async () => {
    const theme = createTheme('dark')
    const select = await createOpenSelectIn(theme)

    const pageColor = parseColor(resolveToken(theme, '--wui-color-page'))
    const panel = queryShadow(select, '.select-overlay')
    const background = getComputedStyle(panel).backgroundColor

    expect(background).toBe(resolveToken(theme, '--wui-color-surface-menu'))
    composite(background, resolveToken(theme, '--wui-color-page')).forEach((value, channel) => {
      expect(value, `下拉面板 通道 ${channel} 比 page 亮的量`).toBeGreaterThan(pageColor.rgb[channel] + 3)
      expect(value, `下拉面板 通道 ${channel} 比 page 亮的量`).toBeLessThan(pageColor.rgb[channel] + 12)
    })

    // 可读性不破：激活行是实心 accent，前景取 on-accent
    const activeRow = select.querySelector('web-ui-option')
    expect(activeRow).toBeTruthy()
    if (!activeRow) return
    activeRow.setAttribute('active', '')
    await select.updateComplete
    const label = queryShadow(activeRow, '.option-label')
    expect(getComputedStyle(label).backgroundColor).toBe(resolveToken(theme, '--wui-color-accent'))
    expect(getComputedStyle(label).color).toBe(resolveToken(theme, '--wui-color-on-accent'))
  })

  it('浅色模式两个表面与改动前一致', async () => {
    await page.viewport(1280, 720)
    const theme = createTheme('light')
    const layout = createLayoutIn(theme)
    await layout.updateComplete
    const select = await createOpenSelectIn(theme)

    // 浅色 sidebar 与共享 overlay 同值，下拉面板仍取 menu token 的浅色默认
    expect(getComputedStyle(queryShadow(layout, '.aside-panel')).backgroundColor).toBe(
      resolveToken(theme, '--wui-color-surface-overlay')
    )
    expect(getComputedStyle(queryShadow(select, '.select-overlay')).backgroundColor).toBe(
      resolveToken(theme, '--wui-color-surface-menu')
    )
  })
})
