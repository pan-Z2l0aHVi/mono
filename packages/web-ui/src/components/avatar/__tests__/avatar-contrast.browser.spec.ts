import '..'
import '@/components/theme'

import { afterEach, describe, expect, it } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import type { WebUiTheme } from '@/components/theme'
import { afterRenderStep, waitForUpdate } from '@/shared/test-utils'

import type { WebUiAvatar } from '..'

afterEach(() => document.body.replaceChildren())

type Rgb = [number, number, number]

/** 截图采样带光栅化/色彩剖面误差，逐通道允许 ±1。 */
const channelsClose = (actual: Rgb, expected: Rgb): boolean =>
  actual.every((channel, index) => Math.abs(channel - expected[index]!) <= 1)

/** WCAG 相对亮度比。 */
function contrastRatio(foreground: Rgb, background: Rgb): number {
  const luminance = (color: Rgb) => {
    const [red, green, blue] = color.map(channel => {
      const normalized = channel / 255
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
    })

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue
  }

  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

/** 从公开 avatar 元素截图的中央区域采样，读取实际底色与图标/文字的最大对比度。 */
async function renderedColors(avatar: WebUiAvatar): Promise<{ background: Rgb; contrastRatio: number }> {
  const { base64 } = await page.elementLocator(avatar).screenshot({ base64: true })
  const image = new Image()
  image.src = `data:image/png;base64,${base64}`
  await image.decode()

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法读取 avatar 截图像素')
  context.drawImage(image, 0, 0)

  const xStart = Math.floor(canvas.width * 0.25)
  const xEnd = Math.ceil(canvas.width * 0.75)
  const yStart = Math.floor(canvas.height * 0.25)
  const yEnd = Math.ceil(canvas.height * 0.75)
  const pixels = context.getImageData(xStart, yStart, xEnd - xStart, yEnd - yStart).data
  const counts = new Map<string, { color: Rgb; count: number }>()

  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 250) continue
    const color: Rgb = [pixels[index], pixels[index + 1], pixels[index + 2]]
    const key = color.join(',')
    const sample = counts.get(key)
    if (sample) sample.count++
    else counts.set(key, { color, count: 1 })
  }

  const colors = [...counts.values()].sort((a, b) => b.count - a.count)
  const background = colors[0]?.color
  if (!background || colors.length < 2) throw new Error('avatar 截图中没有可辨识的前景与背景像素')

  return {
    background,
    contrastRatio: Math.max(...colors.slice(1).map(({ color }) => contrastRatio(color, background)))
  }
}

/** 将主题 surface token 绘制为计算色，作为公开主题下实际回退底色的参照。 */
function themeSurfaceRaisedColor(parent: HTMLElement): Rgb {
  const swatch = document.createElement('span')
  swatch.style.backgroundColor = 'var(--wui-color-surface-raised)'
  parent.append(swatch)
  const backgroundColor = getComputedStyle(swatch).backgroundColor
  swatch.remove()

  const channels = backgroundColor.match(/\d+/g)?.slice(0, 3).map(Number)
  if (!channels || channels.length !== 3) throw new Error(`无法读取主题 surface-raised 颜色：${backgroundColor}`)
  return channels as Rgb
}

describe('avatar 回退内容对比度（浏览器）', () => {
  it.each(['light', 'dark'] as const)('%s appearance 下图标与首字母都达到 WCAG AA', async appearance => {
    const plainParent = document.createElement('div')
    plainParent.style.color = '#000'

    const theme = document.createElement('web-ui-theme') as WebUiTheme
    theme.appearance = appearance

    const themedPage = document.createElement('div')
    themedPage.style.cssText =
      'display: flex; align-items: center; gap: 8px; padding: 12px; background: var(--wui-color-page);'

    const iconAvatar = document.createElement('web-ui-avatar') as WebUiAvatar
    const initialsAvatar = document.createElement('web-ui-avatar') as WebUiAvatar
    initialsAvatar.name = 'Alice'

    themedPage.append(iconAvatar, initialsAvatar)
    theme.append(themedPage)
    plainParent.append(theme)
    document.body.append(plainParent)

    // 首字母的像素取决于字体是否就位，先等字体，再等一个渲染步进落定。
    await document.fonts.ready
    await waitForUpdate(theme)
    await Promise.all([waitForUpdate(iconAvatar), waitForUpdate(initialsAvatar)])
    await afterRenderStep()

    const expectedBackground = themeSurfaceRaisedColor(themedPage)
    const icon = await renderedColors(iconAvatar)
    const initials = await renderedColors(initialsAvatar)

    expect(
      channelsClose(icon.background, expectedBackground),
      `${appearance} 默认图标回退底色应匹配主题 surface-raised（实测 ${icon.background.join(',')}）`
    ).toBe(true)
    expect(
      channelsClose(initials.background, expectedBackground),
      `${appearance} 首字母回退底色应匹配主题 surface-raised（实测 ${initials.background.join(',')}）`
    ).toBe(true)
    expect(icon.contrastRatio, `${appearance} 默认图标对比度应达到 4.5:1`).toBeGreaterThanOrEqual(4.5)
    expect(initials.contrastRatio, `${appearance} 首字母对比度应达到 4.5:1`).toBeGreaterThanOrEqual(4.5)
  })
})
