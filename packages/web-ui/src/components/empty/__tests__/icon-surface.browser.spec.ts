import '@/components/empty'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import type { WebUiEmpty } from '@/components/empty'
import type { WebUiTheme } from '@/components/theme'
import { waitForUpdate } from '@/shared/test-utils'

/**
 * 空态默认图形与它背后表面的可辨度（WCAG 对比度 ≥ 3:1）。
 *
 * 图形深浅走 group opacity，颜色按自身 alpha 先与背景合成；两侧都由主题 token 决定，
 * 本用例不含颜色字面量，主题改调色板时关系仍然成立。
 */
afterEach(() => document.body.replaceChildren())

interface Mounted {
  backdrop: string
  color: string
  opacity: number
}

async function mountEmpty(appearance: 'light' | 'dark'): Promise<Mounted> {
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
  const glyph = el.shadowRoot?.querySelector<SVGSVGElement>('.empty-glyph')
  if (!icon || !glyph) throw new Error('web-ui-empty shadow root 缺少 .empty-icon / .empty-glyph')
  return {
    backdrop: getComputedStyle(theme).backgroundColor,
    color: getComputedStyle(icon).color,
    opacity: Number(getComputedStyle(glyph).opacity)
  }
}

/**
 * 解析计算色。两种序列化都要认：`rgb()` / `rgba()`，以及 `color-mix()` 落到计算值上的
 * `color(srgb r g b / a)`（分量是 0~1 的小数，不是 0~255）。第四个分量是 alpha。
 */
function parseColor(color: string): [number, number, number, number] {
  const srgb = color.match(/^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/)
  if (srgb) {
    const [r, g, b] = srgb.slice(1, 4).map(v => Number(v) * 255)
    return [r, g, b, srgb[4] === undefined ? 1 : Number(srgb[4])]
  }
  const parts = color.match(/[\d.]+/g)
  if (!parts) throw new Error(`无法解析颜色：${color}`)
  const [r, g, b] = parts.slice(0, 3).map(Number)
  return [r, g, b, parts[3] === undefined ? 1 : Number(parts[3])]
}

/**
 * WCAG 相对亮度比：两侧都先合成成不透明色再比，顺序无关。
 *
 * 前景要乘两道透明度才是"实际看到的颜色"：颜色自身的 alpha，以及施加在整颗图形上的
 * group opacity。漏掉任何一道都会把比实际更重的色拿去比，等于放过真正变浅后的可辨度。
 */
function contrastRatio(foreground: string, backdrop: string, extraOpacity = 1): number {
  const luminance = ([r, g, b]: [number, number, number]) => {
    const channel = (v: number) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  }

  const [r, g, b, alpha] = parseColor(foreground)
  const [br, bg, bb] = parseColor(backdrop)
  const effective = alpha * extraOpacity
  const composited: [number, number, number] = [
    r * effective + br * (1 - effective),
    g * effective + bg * (1 - effective),
    b * effective + bb * (1 - effective)
  ]

  const [hi, lo] = [luminance(composited), luminance([br, bg, bb])].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('web-ui-empty 默认图形的可辨度（浏览器）', () => {
  for (const appearance of ['light', 'dark'] as const) {
    it(`${appearance} 下图形与它背后的表面对比度 ≥ 3:1`, async () => {
      const { color, opacity, backdrop } = await mountEmpty(appearance)
      const ratio = contrastRatio(color, backdrop, opacity)
      expect(ratio, `图形与背景对比度不足：${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
    })
  }
})
