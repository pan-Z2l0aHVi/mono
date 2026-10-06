import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import '@/components/layout'
import '@/components/option'
import '@/components/select'
import '@/components/theme'
import type { WebUiLayout } from '@/components/layout'
import type { WebUiOption } from '@/components/option'
import type { WebUiSelect } from '@/components/select'
import type { WebUiTheme } from '@/components/theme'
import { queryA11y, waitForUpdate } from '@/shared/test-utils'

/**
 * 表面 token 的归属与 elevation 关系守卫。
 *
 * 断言的全是**关系**，不含颜色字面量：某个面板消费哪一枚表面 token、合成后比 page 亮多少档、
 * 激活行落在 accent 上。主题改调色板（连同 media 块与双语文档一起改）这些都应成立。
 *
 * 为什么必须是关系而不是值：`theme-token-parity.spec.ts` 只在 fallback 字面量与 theme 定义
 * 不一致时才拦。把 layout 的 sidebar 改去消费 `--wui-color-surface-overlay`、同时把 fallback 写成
 * 一个合法字面量，parity 全程静默——那条链只在「字面量对不上定义」时才响。真正接住这种改动的
 * 是本文件：token 归属一旦串错，或改用与 page 同层的 overlay，合成后的明暗档位立刻塌掉。
 *
 * `layout/style.css` 里 sidebar 刻意不复用 overlay token（overlay 同时服务 dialog/drawer/toast，
 * 整体抬升会带偏不在范围内的表面），那条设计意图由下面第一条断言直接钉住。
 */
afterEach(async () => {
  document.body.replaceChildren()
  await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
})

/** 把 theme token 解析成计算色值：探针挂在 theme 作用域内，与组件走同一条继承链。 */
function resolveToken(theme: WebUiTheme, token: string): string {
  const probe = document.createElement('div')
  probe.style.backgroundColor = `var(${token})`
  theme.append(probe)
  const value = getComputedStyle(probe).backgroundColor
  probe.remove()
  return value
}

interface Rgb {
  rgb: [number, number, number]
  alpha: number
}

/**
 * 解析计算色值。Chromium 对半透明色可能回读成 `rgba(r, g, b, a)`，也可能回读成
 * `color(srgb …)`——`color-mix()` 解析出来的就是后者，两种写法同色但字符串不同，故两种都收。
 * 无法解析时返回 null 交调用方断言，不抛：拿一个空串去断言「这是半透明面板」只会得到
 * 一条看不懂的失败信息。
 */
function tryParseColor(value: string): Rgb | null {
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(value)
  if (rgb) {
    return {
      rgb: [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])],
      alpha: rgb[4] === undefined ? 1 : Number(rgb[4])
    }
  }
  const srgb = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/.exec(value)
  if (srgb) {
    return {
      rgb: [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255],
      alpha: srgb[4] === undefined ? 1 : Number(srgb[4])
    }
  }
  return null
}

/** 半透明面板叠在 page 上的实际观感——面板多为玻璃底，裸 token 值不是用户看到的颜色。 */
function compositeOn(panel: string, backdrop: string): [number, number, number] {
  const front = tryParseColor(panel)
  const back = tryParseColor(backdrop)
  if (!front || !back) throw new Error(`无法解析计算色值：panel=${panel} backdrop=${backdrop}`)
  return [0, 1, 2].map(channel => front.alpha * front.rgb[channel] + (1 - front.alpha) * back.rgb[channel]) as [
    number,
    number,
    number
  ]
}

/**
 * 必须等首次更新：token 定义在 shadow 的 `:host` 规则里，样式表在 Lit 首次更新时才附着。
 * 不等就会在 token 还不存在时去读，读到继承来的空值——而不是「token 未定义」这种可辨的失败。
 */
async function createTheme(appearance: 'light' | 'dark'): Promise<WebUiTheme> {
  const theme = document.createElement('web-ui-theme')
  theme.appearance = appearance
  document.body.append(theme)
  await waitForUpdate(theme)
  return theme
}

/**
 * 桌面视口。`layout` 按 `innerWidth <= 640` 在移动端与桌面两套模板之间二选一，
 * `.aside-panel` 只存在于桌面分支——必须先设视口再挂载，否则量到的是移动端那套。
 */
const DESKTOP_VIEWPORT = { width: 1280, height: 720 }

async function createLayoutIn(theme: WebUiTheme): Promise<WebUiLayout> {
  await page.viewport(DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height)
  const layout = document.createElement('web-ui-layout')
  layout.innerHTML = `
    <div slot="sidebar" style="height: 100%">Sidebar</div>
    <main style="height: 200px">Content</main>
  `
  theme.append(layout)
  await waitForUpdate(layout)
  return layout
}

async function createOpenSelectIn(theme: WebUiTheme): Promise<WebUiSelect> {
  const select = document.createElement('web-ui-select')
  select.innerHTML = `
    <web-ui-option value="apple">Apple</web-ui-option>
    <web-ui-option value="banana">Banana</web-ui-option>
  `
  theme.append(select)
  await waitForUpdate(select)
  const combobox = queryA11y(select, '[role="combobox"]')
  if (!(combobox instanceof HTMLElement)) throw new Error('未找到 role="combobox" 的触发器')
  combobox.click()
  await waitForUpdate(select)
  await new Promise(resolve => requestAnimationFrame(resolve))
  return select
}

/** shadow 内部元素：面板没有公开 role，只能按其稳定类名定位（用法同 settle-gate / segmented 各 spec）。 */
function panelOf(host: HTMLElement, selector: string): HTMLElement {
  const found = host.shadowRoot?.querySelector<HTMLElement>(selector)
  if (!found) throw new Error(`${host.tagName} shadow root 缺少 ${selector}`)
  return found
}

describe('表面 token 归属与 elevation（浏览器）', () => {
  it('sidebar 面板消费 sidebar 专用 token，不与 dialog/drawer/toast 的 overlay token 混用', async () => {
    for (const appearance of ['light', 'dark'] as const) {
      const theme = await createTheme(appearance)
      const layout = await createLayoutIn(theme)
      const background = getComputedStyle(panelOf(layout, '.aside-panel')).backgroundColor

      expect(background, `${appearance} sidebar 应消费 surface-sidebar`).toBe(
        resolveToken(theme, '--wui-color-surface-sidebar')
      )
      expect(background, `${appearance} sidebar 不得退到 overlay token`).not.toBe(
        resolveToken(theme, '--wui-color-surface-overlay')
      )
    }
  })

  it('下拉面板消费 menu 专用 token', async () => {
    for (const appearance of ['light', 'dark'] as const) {
      const theme = await createTheme(appearance)
      const select = await createOpenSelectIn(theme)
      const background = getComputedStyle(panelOf(select, '.select-overlay')).backgroundColor

      expect(background, `${appearance} 下拉面板应消费 surface-menu`).toBe(
        resolveToken(theme, '--wui-color-surface-menu')
      )
      expect(background, `${appearance} 下拉面板不得退到 overlay token`).not.toBe(
        resolveToken(theme, '--wui-color-surface-overlay')
      )
    }
  })

  /*
   * elevation 关系：面板是半透明玻璃底，合成后必须比 page 浅一档。
   * 上下界都留了余量——低于 3/255 读不出层级，越过 12/255 就不止「一档」——但都不是具体色值，
   * 调色板整体位移不改变这条关系。改成与 page 同层的 token（sidebar→overlay）会让合成色
   * 塌到下界之外，这里即红。
   */
  it('sidebar 与下拉面板合成后都比 page 浅一档', async () => {
    const theme = await createTheme('dark')
    const pageColor = tryParseColor(resolveToken(theme, '--wui-color-page'))
    const layout = await createLayoutIn(theme)
    const select = await createOpenSelectIn(theme)

    const panels: Array<[string, string]> = [
      ['sidebar', getComputedStyle(panelOf(layout, '.aside-panel')).backgroundColor],
      ['下拉面板', getComputedStyle(panelOf(select, '.select-overlay')).backgroundColor]
    ]

    expect(pageColor, 'page 色应解析为具体颜色').not.toBeNull()
    for (const [name, background] of panels) {
      compositeOn(background, resolveToken(theme, '--wui-color-page')).forEach((value, channel) => {
        expect(value, `${name} 通道 ${channel} 比 page 亮的量应读得出层级`).toBeGreaterThan(pageColor!.rgb[channel] + 3)
        expect(value, `${name} 通道 ${channel} 比 page 亮的量不应超过一档`).toBeLessThan(pageColor!.rgb[channel] + 12)
      })
    }
  })

  it('激活行落在 accent 上，前景取 on-accent', async () => {
    const theme = await createTheme('dark')
    const select = await createOpenSelectIn(theme)

    const activeRow = select.querySelector<WebUiOption>('web-ui-option')
    expect(activeRow).toBeTruthy()
    if (!activeRow) return
    activeRow.setAttribute('active', '')
    await waitForUpdate(activeRow)

    const label = panelOf(activeRow, '.option-label')
    const style = getComputedStyle(label)
    expect(style.backgroundColor, '激活行底色应取 accent').toBe(resolveToken(theme, '--wui-color-accent'))
    expect(style.color, '激活行前景应取 on-accent').toBe(resolveToken(theme, '--wui-color-on-accent'))
  })
})
