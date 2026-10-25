import '..'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiTheme } from '@/components/theme'

import type { WebUiEmpty } from '..'

/**
 * 空态的整套版面都由 `--wui-empty-*` 驱动：`size` 属性已移除，调用方唯一的旋钮就是这些变量。
 *
 * jsdom 没有布局，只能读到写进 style 的 token 文本；这里在 Chromium 里读回真实计算值，
 * 证明变量确实落在盒、图形、字号与颜色上，而不只是被写在宿主上。
 */
afterEach(() => document.body.replaceChildren())

async function mountEmpty(tokens: Record<string, string> = {}): Promise<WebUiEmpty> {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  theme.appearance = 'light'

  const el = document.createElement('web-ui-empty') as WebUiEmpty
  el.title = '暂无内容'
  el.description = '当前区域还没有可展示的内容。'
  for (const [token, value] of Object.entries(tokens)) el.style.setProperty(token, value)

  theme.append(el)
  document.body.append(theme)
  await el.updateComplete
  await new Promise(resolve => requestAnimationFrame(resolve))
  return el
}

function part(el: WebUiEmpty, selector: string): HTMLElement {
  const node = el.shadowRoot?.querySelector<HTMLElement>(selector)
  if (!node) throw new Error(`web-ui-empty shadow root 缺少 ${selector}`)
  return node
}

/** 用一枚探针读出 token 在该主题下的计算色，避免把 rgb 字面量钉进用例。 */
function probeColor(el: WebUiEmpty, token: string): string {
  const theme = el.parentElement
  if (!theme) throw new Error('web-ui-empty 没有挂在 web-ui-theme 里')
  const probe = document.createElement('span')
  probe.style.color = `var(${token})`
  theme.append(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value
}

const computed = (
  el: WebUiEmpty,
  selector: string,
  prop: 'width' | 'fontSize' | 'color' | 'paddingTop' | 'paddingLeft' | 'minHeight' | 'opacity'
) => getComputedStyle(part(el, selector))[prop]

describe('web-ui-empty 的 CSS 变量契约（浏览器）', () => {
  it('默认图形 40×40：盒与图形同尺寸，图形填满盒', async () => {
    const el = await mountEmpty()

    expect(computed(el, '.empty-icon', 'width')).toBe('40px')
    expect(computed(el, '.empty-glyph', 'width')).toBe('40px')
  })

  it('--wui-empty-icon-size 同时改盒与图形', async () => {
    const el = await mountEmpty({ '--wui-empty-icon-size': '64px' })

    expect(computed(el, '.empty-icon', 'width')).toBe('64px')
    expect(computed(el, '.empty-glyph', 'width')).toBe('64px')
  })

  it('--wui-empty-icon-color 决定图形颜色', async () => {
    const el = await mountEmpty({ '--wui-empty-icon-color': 'rgb(255, 0, 0)' })

    expect(computed(el, '.empty-icon', 'color')).toBe('rgb(255, 0, 0)')
  })

  // 深浅与色相是两件事，因此落在两枚变量上：颜色给实色，淡一档走 group opacity。
  // 两者合成才好看，但写成两个变量调用方才能只调其中一个。
  it('图形深浅默认 0.75，--wui-empty-icon-opacity 单独覆盖', async () => {
    const el = await mountEmpty()
    expect(computed(el, '.empty-glyph', 'opacity')).toBe('0.75')

    const solid = await mountEmpty({ '--wui-empty-icon-opacity': '1' })
    expect(computed(solid, '.empty-glyph', 'opacity')).toBe('1')
  })

  // 颜色必须落在实色上：带 alpha 的颜色会让笔画在重叠处二次合成。
  it('--wui-empty-icon-color 的默认值不带 alpha', async () => {
    const el = await mountEmpty()

    expect(computed(el, '.empty-icon', 'color')).toBe(probeColor(el, '--wui-color-text-secondary'))
  })

  it('标题与描述默认 16px / 14px', async () => {
    const el = await mountEmpty()

    expect(computed(el, '.empty-title', 'fontSize')).toBe('16px')
    expect(computed(el, '.empty-description', 'fontSize')).toBe('14px')
  })

  it('两个字号变量独立覆盖标题与描述', async () => {
    const el = await mountEmpty({
      '--wui-empty-title-font-size': '20px',
      '--wui-empty-description-font-size': '12px'
    })

    expect(computed(el, '.empty-title', 'fontSize')).toBe('20px')
    expect(computed(el, '.empty-description', 'fontSize')).toBe('12px')
  })

  // 默认色跟着主题 token 走：标题是正文色，描述是次级文字色，两者必须不同，
  // 否则把标题色钉成描述色也不会红。
  it('标题与描述默认取主题的 text / secondary', async () => {
    const el = await mountEmpty()

    expect(computed(el, '.empty-title', 'color')).toBe(probeColor(el, '--wui-color-text'))
    expect(computed(el, '.empty-description', 'color')).toBe(probeColor(el, '--wui-color-text-secondary'))
    expect(computed(el, '.empty-title', 'color')).not.toBe(computed(el, '.empty-description', 'color'))
  })

  it('两个颜色变量独立覆盖标题与描述', async () => {
    const el = await mountEmpty({
      '--wui-empty-title-color': 'rgb(0, 128, 0)',
      '--wui-empty-description-color': 'rgb(128, 0, 0)'
    })

    expect(computed(el, '.empty-title', 'color')).toBe('rgb(0, 128, 0)')
    expect(computed(el, '.empty-description', 'color')).toBe('rgb(128, 0, 0)')
  })

  it('默认留白：min-height 240、内边距 32/24', async () => {
    const el = await mountEmpty()

    expect(computed(el, '.empty', 'minHeight')).toBe('240px')
    expect(computed(el, '.empty', 'paddingTop')).toBe('32px')
    expect(computed(el, '.empty', 'paddingLeft')).toBe('24px')
  })

  it('--wui-empty-min-height 与 --wui-empty-padding 覆盖留白', async () => {
    const el = await mountEmpty({
      '--wui-empty-min-height': '120px',
      '--wui-empty-padding': '16px 12px'
    })

    expect(computed(el, '.empty', 'minHeight')).toBe('120px')
    expect(computed(el, '.empty', 'paddingTop')).toBe('16px')
    expect(computed(el, '.empty', 'paddingLeft')).toBe('12px')
  })
})
