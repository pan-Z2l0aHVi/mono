import { describe, expect, it } from 'vite-plus/test'

import { ACCENT_PRESETS, onAccentFor } from '../settings'

/** WCAG 相对亮度；只认 #rrggbb，色板里的字面量都是这个形状。 */
function relativeLuminance(hex: string): number {
  const channel = (offset: number): number => {
    const raw = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
    return raw <= 0.04045 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}

function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  return (hi + 0.05) / (lo + 0.05)
}

describe('accent presets', () => {
  it('keeps primary button text at WCAG AA contrast for every preset', () => {
    for (const preset of ACCENT_PRESETS) {
      expect(contrastRatio(preset.onAccent, preset.value), `${preset.label} ${preset.value}`).toBeGreaterThanOrEqual(
        4.5
      )
    }
  })

  it('resolves the on-accent color from the same preset as the accent', () => {
    for (const preset of ACCENT_PRESETS) {
      expect(onAccentFor(preset.value)).toBe(preset.onAccent)
    }
  })

  it('falls back to the default preset for unknown accent values', () => {
    expect(onAccentFor('#123456')).toBe(ACCENT_PRESETS[0].onAccent)
  })
})
