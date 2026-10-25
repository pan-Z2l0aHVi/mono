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
 * 可辨度守卫同样走关系：图形色按自身 alpha 与 group opacity 合成到它背后实际那张表面，
 * 再算 WCAG 对比度，要求 ≥ 3。两侧都由主题 token 决定，本用例不含颜色字面量。
 *
 * 另有两道守卫针对线框图形的同名坑（透明色导致笔画重叠处发黑）：颜色本身必须不透明，
 * 且渲染后最深像素不得深于描边色。
 */
afterEach(() => document.body.replaceChildren())

interface Mounted {
  icon: HTMLElement
  glyph: SVGSVGElement
  backdrop: string
  /** `.empty-icon` 的计算色，以及对它施加的 group opacity。 */
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
    icon,
    glyph,
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

/** 全透明在两种序列化下都写作这四种形式之一。 */
const TRANSPARENT = new Set(['transparent', 'rgba(0, 0, 0, 0)', 'rgba(0,0,0,0)'])

/**
 * 把默认图形画到它背后那张表面上，返回整张图的像素。
 *
 * `currentColor` 在脱离文档的 SVG 图片里没有继承上下文，序列化前先换成算好的颜色，
 * 否则整颗图形会按默认黑渲染，量出来的深度与真实无关。底色取实际表面色，
 * 因此亮色与暗色主题量出来的是同一套语义。
 *
 * 透明度按 `颜色 alpha × group opacity` 一起施加：颜色若自带 alpha，SVG 内部每条绘制
 * 指令会各自带上它、在笔画重叠处叠加；group opacity 则只作用在整颗图形合成之后。
 * 只有把这两条分开照原样施加，"会不会叠色"才测得准。
 */
async function renderGlyph(
  mounted: Mounted,
  size = 384
): Promise<{ data: Uint8ClampedArray; size: number; effective: number }> {
  const [, , , colorAlpha] = parseColor(mounted.color)
  const effective = colorAlpha * mounted.opacity
  const markup = mounted.glyph.outerHTML
    .replace(/currentColor/g, mounted.color)
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`)
    .replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')

  const image = new Image()
  image.width = size
  image.height = size
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('默认图形无法作为 SVG 图片加载'))
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
  })

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法获取 2d 上下文')
  ctx.fillStyle = mounted.backdrop
  ctx.fillRect(0, 0, size, size)
  ctx.globalAlpha = mounted.opacity
  ctx.drawImage(image, 0, 0, size, size)
  return { data: ctx.getImageData(0, 0, size, size).data, size, effective }
}

describe('web-ui-empty icon 区不绘制底面（浏览器）', () => {
  for (const appearance of ['light', 'dark'] as const) {
    it(`${appearance} 下 icon 盒背景透明`, async () => {
      const { icon } = await mountEmpty(appearance)
      expect(TRANSPARENT.has(getComputedStyle(icon).backgroundColor)).toBe(true)
    })

    it(`${appearance} 下图形与它背后的表面对比度 ≥ 3:1`, async () => {
      const { color, opacity, backdrop } = await mountEmpty(appearance)
      const ratio = contrastRatio(color, backdrop, opacity)
      expect(ratio, `图形与背景对比度不足：${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
    })

    // 线框图形的笔画在转角、端点与填底处本来互相压着，只有颜色不透明时才看不出来。
    // 颜色一旦带 alpha，重叠处会二次合成变深，视觉上就是"角上笔画发黑"。
    // 淡一档必须走 group opacity，它作用于整颗图形合成之后，重叠处不起变化。
    it(`${appearance} 下图形色本身不透明，深浅只由 group opacity 提供`, async () => {
      const { color } = await mountEmpty(appearance)
      expect(parseColor(color)[3], `图形色带了 alpha，笔画重叠处会发黑：${color}`).toBe(1)
    })

    // 判据是"离背景多远"而不是"多深"：浅色下叠色发黑、深色下发亮，方向相反但都离背景更远。
    // 填底那层 0.2 离背景更近，落在描边之内，不会误判。
    it(`${appearance} 下没有任何像素比描边色离背景更远（笔画重叠不叠色）`, async () => {
      const mounted = await mountEmpty(appearance)
      const { data, effective } = await renderGlyph(mounted)

      const [r, g, b] = parseColor(mounted.color)
      const backdrop = parseColor(mounted.backdrop)
      const stroke = [r, g, b].map((channel, index) => channel * effective + backdrop[index]! * (1 - effective))
      const distance = (pixel: [number, number, number], base: [number, number, number]) =>
        Math.hypot(pixel[0] - base[0], pixel[1] - base[1], pixel[2] - base[2])

      const strokeDistance = distance(stroke as [number, number, number], [backdrop[0], backdrop[1], backdrop[2]])
      let farthest = 0
      for (let i = 0; i < data.length; i += 4) {
        const d = distance([data[i]!, data[i + 1]!, data[i + 2]!], [backdrop[0], backdrop[1], backdrop[2]])
        if (d > farthest) farthest = d
      }

      // 容差按比例给：抗锯齿边缘会让个别像素比描边色略微超出零点几个单位，而叠色会多出
      // 整整一道 0.75 的 alpha，距离差接近 40——两者不在一个量级，3% 足以分开。
      const tolerance = strokeDistance * 1.03 + 1
      expect(
        farthest,
        `出现比描边离背景更远的像素（${farthest.toFixed(1)} > ${strokeDistance.toFixed(1)}），说明笔画重叠处发生了叠色`
      ).toBeLessThanOrEqual(tolerance)
    })
  }
})
