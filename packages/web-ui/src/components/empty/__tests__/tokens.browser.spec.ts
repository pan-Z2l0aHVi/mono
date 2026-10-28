import '..'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiEmpty } from '@/components/empty'
import type { WebUiTheme } from '@/components/theme'
import { resolveColor, waitForUpdate } from '@/shared/test-utils'

/**
 * `--wui-empty-*` 是 `web-ui-empty` 唯一的公开旋钮：组件不设 JS 属性，调用方写变量，
 * 组件把它落到盒、图形、字号、颜色与留白上。
 *
 * 每条用例的期望值都来自用例自己写进去的输入，不抄样式表里的默认字面量——默认值是设计
 * 值，改版时该跟着变的是它们，不是这份契约。默认色取哪枚主题 token 由最后一条用例守。
 */
afterEach(() => document.body.replaceChildren())

async function mountEmpty(tokens: Record<string, string> = {}): Promise<WebUiEmpty> {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  theme.appearance = 'light'

  const el = document.createElement('web-ui-empty') as WebUiEmpty
  el.title = '暂无内容'
  el.description = '当前区域还没有可展示的内容。'
  el.innerHTML = '<button slot="action">重新加载</button>'
  for (const [token, value] of Object.entries(tokens)) el.style.setProperty(token, value)

  theme.append(el)
  document.body.append(theme)
  await waitForUpdate(theme)
  await waitForUpdate(el)
  await new Promise(resolve => requestAnimationFrame(resolve))
  return el
}

function part(el: WebUiEmpty, selector: string): HTMLElement {
  const node = el.shadowRoot?.querySelector<HTMLElement>(selector)
  if (!node) throw new Error(`web-ui-empty shadow root 缺少 ${selector}`)
  return node
}

const computed = (
  el: WebUiEmpty,
  selector: string,
  prop:
    | 'width'
    | 'fontSize'
    | 'color'
    | 'paddingTop'
    | 'paddingLeft'
    | 'minHeight'
    | 'opacity'
    | 'marginTop'
    | 'maxWidth'
) => getComputedStyle(part(el, selector))[prop]

/** 主题 token 的计算色：探针挂在主题里，与组件走同一条继承链。 */
function themeColor(el: WebUiEmpty, token: string): string {
  const theme = el.parentElement
  if (!theme) throw new Error('web-ui-empty 没有挂在 web-ui-theme 里')
  const probe = document.createElement('span')
  probe.style.color = `var(${token})`
  theme.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

describe('web-ui-empty 的 CSS 变量契约（浏览器）', () => {
  it('--wui-empty-icon-size 同时改盒与图形，两者始终同尺寸', async () => {
    const el = await mountEmpty({ '--wui-empty-icon-size': '64px' })

    const box = computed(el, '.empty-icon', 'width')
    expect(box).toBe('64px')
    expect(computed(el, '.empty-glyph', 'width')).toBe(box)
  })

  it('--wui-empty-icon-color 决定图形颜色', async () => {
    const el = await mountEmpty({ '--wui-empty-icon-color': 'rgb(255, 0, 0)' })

    expect(computed(el, '.empty-icon', 'color')).toBe(resolveColor('rgb(255, 0, 0)'))
  })

  it('--wui-empty-icon-opacity 单独改图形深浅', async () => {
    const el = await mountEmpty({ '--wui-empty-icon-opacity': '1' })

    expect(computed(el, '.empty-glyph', 'opacity')).toBe('1')
  })

  it('两枚字号变量各自只改一行文案', async () => {
    const el = await mountEmpty({
      '--wui-empty-title-font-size': '20px',
      '--wui-empty-description-font-size': '12px'
    })

    expect(computed(el, '.empty-title', 'fontSize')).toBe('20px')
    expect(computed(el, '.empty-description', 'fontSize')).toBe('12px')
  })

  it('两枚颜色变量各自只改一行文案', async () => {
    const el = await mountEmpty({
      '--wui-empty-title-color': 'rgb(0, 128, 0)',
      '--wui-empty-description-color': 'rgb(128, 0, 0)'
    })

    expect(computed(el, '.empty-title', 'color')).toBe(resolveColor('rgb(0, 128, 0)'))
    expect(computed(el, '.empty-description', 'color')).toBe(resolveColor('rgb(128, 0, 0)'))
  })

  it('--wui-empty-min-height 与 --wui-empty-padding 各自改留白', async () => {
    const el = await mountEmpty({
      '--wui-empty-min-height': '120px',
      '--wui-empty-padding': '16px 12px'
    })

    expect(computed(el, '.empty', 'minHeight')).toBe('120px')
    expect(computed(el, '.empty', 'paddingTop')).toBe('16px')
    expect(computed(el, '.empty', 'paddingLeft')).toBe('12px')
  })

  it('--wui-empty-content-width 收窄文案与操作区', async () => {
    const el = await mountEmpty({ '--wui-empty-content-width': '300px' })

    expect(computed(el, '.empty-title', 'maxWidth')).toBe('300px')
    expect(computed(el, '.empty-description', 'maxWidth')).toBe('300px')
    expect(computed(el, '.empty-action', 'maxWidth')).toBe('300px')
  })

  it('两枚段间距变量各自改一段间距', async () => {
    const el = await mountEmpty({
      '--wui-empty-title-margin-top': '8px',
      '--wui-empty-action-margin-top': '4px'
    })

    expect(computed(el, '.empty-title', 'marginTop')).toBe('8px')
    expect(computed(el, '.empty-action', 'marginTop')).toBe('4px')
  })

  it('默认色分别取主题的 text / secondary：标题取 text，描述与图形取 secondary', async () => {
    const el = await mountEmpty()

    expect(computed(el, '.empty-title', 'color')).toBe(themeColor(el, '--wui-color-text'))
    expect(computed(el, '.empty-description', 'color')).toBe(themeColor(el, '--wui-color-text-secondary'))
    expect(computed(el, '.empty-icon', 'color')).toBe(themeColor(el, '--wui-color-text-secondary'))
    expect(computed(el, '.empty-title', 'color')).not.toBe(computed(el, '.empty-description', 'color'))
  })
})
