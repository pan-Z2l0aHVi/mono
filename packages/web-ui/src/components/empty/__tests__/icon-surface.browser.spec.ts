import '@/components/empty'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiEmpty } from '@/components/empty'
import type { WebUiTheme } from '@/components/theme'
import { waitForUpdate } from '@/shared/test-utils'

/**
 * 空态 icon 区**不绘制任何底面**（#230）。
 *
 * 这里断言的是关系而非色值：icon 盒的 `background-color` 必须透明，图形因此直接坐在
 * 它背后那张表面上。钉一个具体色值只能证明「不是那一档灰」，钉「透明」才证明没有底面
 * ——底面若换成任何一档中性色（包括半透明），这个用例都会红。
 *
 * 可辨度守卫同样走关系：图形色与它背后实际那张表面的 WCAG 对比度 ≥ 3。两侧都由主题
 * token 决定，本用例不含颜色字面量。
 */
afterEach(() => document.body.replaceChildren())

async function mountEmpty(appearance: 'light' | 'dark'): Promise<{ icon: HTMLElement; backdrop: string }> {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  theme.appearance = appearance
  const el = document.createElement('web-ui-empty') as WebUiEmpty
  el.title = '暂无内容'
  el.description = '当前区域还没有可展示的内容。'
  // 主题宿主自身不绘制背景，底面由嵌入方给；这里给它 page 色，图形背后才有确定的一张面。
  theme.style.background = 'var(--wui-color-page)'
  theme.append(el)
  document.body.append(theme)

  await waitForUpdate(theme)
  await waitForUpdate(el)
  await new Promise(resolve => requestAnimationFrame(resolve))

  const icon = el.shadowRoot?.querySelector<HTMLElement>('.empty-icon')
  if (!icon) throw new Error('web-ui-empty shadow root 缺少 .empty-icon')
  return { icon, backdrop: getComputedStyle(theme).backgroundColor }
}

/** WCAG 相对亮度比：两条计算色值的亮度之比，两侧顺序无关。 */
function contrastRatio(a: string, b: string): number {
  const luminance = (color: string) => {
    const parts = color.match(/[\d.]+/g)
    if (!parts) throw new Error(`无法解析颜色：${color}`)
    const [r, g, blue] = parts.slice(0, 3).map(Number)
    const channel = (v: number) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(blue)
  }
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** 全透明在两种序列化下都写作这四种形式之一。 */
const TRANSPARENT = new Set(['transparent', 'rgba(0, 0, 0, 0)', 'rgba(0,0,0,0)'])

describe('web-ui-empty icon 区不绘制底面（浏览器）', () => {
  for (const appearance of ['light', 'dark'] as const) {
    it(`${appearance} 下 icon 盒背景透明`, async () => {
      const { icon } = await mountEmpty(appearance)
      expect(TRANSPARENT.has(getComputedStyle(icon).backgroundColor)).toBe(true)
    })

    it(`${appearance} 下图形与它背后的表面对比度 ≥ 3:1`, async () => {
      const { icon, backdrop } = await mountEmpty(appearance)
      const ratio = contrastRatio(getComputedStyle(icon).color, backdrop)
      expect(ratio, `图形与背景对比度不足：${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
    })
  }
})
