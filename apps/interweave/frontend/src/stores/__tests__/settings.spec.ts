import { describe, expect, it } from 'vite-plus/test'

import { ACCENT_PRESETS, onAccentFor } from '../settings'

/** WCAG relative luminance; the palette values are #rrggbb. */
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

describe('accent foreground', () => {
  it('prefers white in both appearances and flips to black only below 3:1', () => {
    for (const preset of ACCENT_PRESETS) {
      const foreground = onAccentFor(preset.value)
      const expected = contrastRatio('#ffffff', preset.value) >= 3 ? '#ffffff' : '#000000'

      expect(foreground).toBe(expected)
      expect(contrastRatio(foreground, preset.value)).toBeGreaterThanOrEqual(3)
    }
  })

  it('falls back to the default preset for unknown accent values', () => {
    expect(onAccentFor('#123456')).toBe(onAccentFor(ACCENT_PRESETS[0].value))
  })
})
