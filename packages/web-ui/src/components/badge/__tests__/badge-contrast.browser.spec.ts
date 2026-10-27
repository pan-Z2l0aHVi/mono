import '@/components/badge'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { waitForUpdate } from '@/shared/test-utils'

function relativeLuminance(color: string): number {
  const channels = color
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number)
  if (!channels || channels.length !== 3) throw new Error(`无法解析计算色值：${color}`)

  const [red, green, blue] = channels.map(channel => {
    const normalized = channel / 255
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('badge 计数文字对比度（浏览器）', () => {
  it.each(['light', 'dark'] as const)('%s appearance 的 count 达到 WCAG AA 常规文字对比度', async appearance => {
    const theme = document.createElement('web-ui-theme')
    theme.setAttribute('appearance', appearance)

    const badge = document.createElement('web-ui-badge')
    badge.count = 100
    theme.append(badge)
    document.body.append(theme)
    await waitForUpdate(theme)
    await waitForUpdate(badge)

    const count = badge.shadowRoot?.querySelector<HTMLElement>('[role="status"]')
    if (!count) throw new Error(`${appearance} theme 下没有渲染 badge count`)

    const style = getComputedStyle(count)
    // 不钉字号本身：钉住「仍是 WCAG 常规文字」（< 18px），因为 4.5:1 阈值只在
    // 常规文字档成立；将来字号升到大号文字档，这条会逼着判据换成 3:1 而不是悄悄错档。
    expect(parseFloat(style.fontSize), `${appearance} badge count 应停留在 WCAG 常规文字档位`).toBeLessThan(18)
    expect(
      contrastRatio(style.color, style.backgroundColor),
      `${appearance} badge count 应达到 4.5:1`
    ).toBeGreaterThanOrEqual(4.5)
  })
})
