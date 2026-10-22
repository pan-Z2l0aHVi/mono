import '@/assets/global.css'
import '@greypan/web-ui'

import { afterEach, describe, expect, it } from 'vite-plus/test'

import { getAccentThemeStyle } from '@/stores/settings'

const hosts: HTMLElement[] = []

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove()
})

function luminance(color: string): number {
  const channels = color
    .match(/\d+(?:\.\d+)?/g)
    ?.slice(0, 3)
    .map(Number)
  if (!channels || channels.length !== 3) throw new Error(`无法解析颜色：${color}`)

  const linear = channels.map(channel => {
    const normalized = channel / 255
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrastRatio(foreground: string, background: string): number {
  const luminanceValues = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (luminanceValues[0] + 0.05) / (luminanceValues[1] + 0.05)
}

async function waitForDarkTheme(theme: HTMLElement): Promise<void> {
  for (let frame = 0; frame < 120; frame++) {
    if (theme.getAttribute('resolved-appearance') === 'dark') return
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
  }

  throw new Error('web-ui-theme 未解析为 dark')
}

describe('Interweave accent contrast', () => {
  for (const accent of ['#1d8348', '#c64600']) {
    it(`dark mode ${accent} primary button text meets WCAG AA`, async () => {
      const host = document.createElement('div')
      const theme = document.createElement('web-ui-theme')
      theme.setAttribute('appearance', 'dark')
      for (const [property, value] of Object.entries(getAccentThemeStyle(accent))) {
        theme.style.setProperty(property, value)
      }

      const button = document.createElement('web-ui-button')
      button.setAttribute('variant', 'primary')
      button.textContent = '保存'
      theme.append(button)
      host.append(theme)
      document.body.append(host)
      hosts.push(host)

      await waitForDarkTheme(theme)

      const nativeButton = button.shadowRoot?.querySelector('button')
      if (!nativeButton) throw new Error('primary button 的原生 button 未渲染')

      const foreground = getComputedStyle(nativeButton).color
      const background = getComputedStyle(nativeButton).backgroundColor

      expect(foreground).toBe('rgb(255, 255, 255)')
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5)
    })
  }
})
