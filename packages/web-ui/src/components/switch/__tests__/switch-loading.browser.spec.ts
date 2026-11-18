import '..'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { waitForUpdate } from '@/shared/test-utils'

import type { WebUiSwitch } from '..'
import switchSource from '../index.ts?raw'

afterEach(() => document.body.replaceChildren())

/** loading spinner 的 svg：`color` 最终以行内 style 落在这里（消费点）。 */
function spinnerSvg(el: WebUiSwitch): SVGElement {
  const icon = el.shadowRoot?.querySelector('web-ui-icon')
  const svg = icon?.shadowRoot?.querySelector('svg')
  if (!svg) throw new Error('loading spinner 未渲染')
  return svg
}

/** 把颜色声明文本归一成计算色（示范：theme reduced-motion 的 resolvedColor）。 */
function resolvedColor(scope: Element, value: string): string {
  const probe = document.createElement('span')
  probe.style.color = value
  scope.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  if (!color) throw new Error(`无法解析颜色 ${value}`)
  return color
}

/** switch 源码里 spinner 颜色的声明（含 var() 与兜底），不在测试里抄一份。 */
function spinnerDeclaredColor(): string {
  const match = /--wui-color-accent,\s*(#[0-9a-f]+)\)/.exec(switchSource)
  if (!match) throw new Error('switch/index.ts 里找不到 spinner 颜色声明')
  return `var(--wui-color-accent, ${match[1]!})`
}

describe('WebUiSwitch loading spinner 颜色（浏览器）', () => {
  it('主题作用域内取 accent token：计算色与同作用域对表', async () => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', 'light')
    const el = document.createElement('web-ui-switch') as WebUiSwitch
    theme.append(el)
    document.body.append(theme)
    el.loading = true
    await Promise.all([theme.updateComplete, el.updateComplete])

    const svg = spinnerSvg(el)
    const declared = svg.style.color
    expect(declared, '接线：spinner 颜色声明应指向 accent token').toContain('--wui-color-accent')
    expect(getComputedStyle(svg).color).toBe(resolvedColor(theme, declared))
  })

  it('没有主题时落到源码声明的兜底色', async () => {
    const el = document.createElement('web-ui-switch') as WebUiSwitch
    document.body.append(el)
    el.loading = true
    await el.updateComplete

    const svg = spinnerSvg(el)
    expect(getComputedStyle(svg).color).toBe(resolvedColor(el, spinnerDeclaredColor()))
    // 兜底真的出色：不因 var() 解析失败掉成透明/继承黑。
    expect(getComputedStyle(svg).color).not.toBe('rgba(0, 0, 0, 0)')
  })
})
