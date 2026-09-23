import { afterEach, describe, expect, it } from 'vite-plus/test'
import { cdp } from 'vite-plus/test/browser'

import type { ThemeAppearance, WebUiTheme } from '..'
import '..'

interface CdpSession {
  send: (method: string, params?: Record<string, unknown>) => Promise<unknown>
}

async function emulateColorScheme(value: 'light' | 'dark'): Promise<void> {
  const session = cdp() as unknown as CdpSession
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value }] })
}

async function mountTheme(appearance?: ThemeAppearance): Promise<WebUiTheme> {
  const theme = document.createElement('web-ui-theme') as WebUiTheme
  if (appearance) theme.setAttribute('appearance', appearance)
  theme.setAttribute('motion', 'reduced')
  document.body.append(theme)
  await theme.updateComplete
  return theme
}

async function waitForResolvedAppearance(theme: WebUiTheme, expected: 'light' | 'dark'): Promise<void> {
  const deadline = performance.now() + 2000
  while (performance.now() < deadline) {
    if (theme.getAttribute('resolved-appearance') === expected) return
    await new Promise(resolve => requestAnimationFrame(resolve))
  }
  throw new Error(`resolved appearance did not become ${expected}, still ${theme.getAttribute('resolved-appearance')}`)
}

afterEach(async () => {
  document.body.replaceChildren()
  await emulateColorScheme('light')
})

describe('theme resolved-appearance（浏览器）', () => {
  it('显式、system 与缺省 appearance 在 OS 配色矩阵下保持解析值', async () => {
    const cases = [
      { appearance: 'light' as const, os: 'light' as const, resolved: 'light' as const },
      { appearance: 'light' as const, os: 'dark' as const, resolved: 'light' as const },
      { appearance: 'dark' as const, os: 'light' as const, resolved: 'dark' as const },
      { appearance: 'dark' as const, os: 'dark' as const, resolved: 'dark' as const },
      { appearance: 'system' as const, os: 'light' as const, resolved: 'light' as const },
      { appearance: 'system' as const, os: 'dark' as const, resolved: 'dark' as const },
      { appearance: undefined, os: 'light' as const, resolved: 'light' as const },
      { appearance: undefined, os: 'dark' as const, resolved: 'light' as const }
    ]

    for (const { appearance, os, resolved } of cases) {
      await emulateColorScheme(os)
      const theme = await mountTheme(appearance)
      expect(theme.resolvedAppearance).toBe(resolved)
      expect(theme.getAttribute('resolved-appearance')).toBe(resolved)
      theme.remove()
    }
  })

  it('appearance=system 随真实 Chromium 的 OS 翻转双向实时更新', async () => {
    await emulateColorScheme('light')
    const theme = await mountTheme('system')
    expect(theme.getAttribute('resolved-appearance')).toBe('light')

    await emulateColorScheme('dark')
    await waitForResolvedAppearance(theme, 'dark')
    expect(theme.resolvedAppearance).toBe('dark')

    await emulateColorScheme('light')
    await waitForResolvedAppearance(theme, 'light')
    expect(theme.resolvedAppearance).toBe('light')
    theme.remove()
  })
})
