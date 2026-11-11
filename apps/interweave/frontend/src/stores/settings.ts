/**
 * 应用外观设置（主题模式 + accent 预设色）。
 *
 * 只存「用户选了什么」，不存派生结果：resolved appearance 由 web-ui-theme 自己算，
 * 宿主读它就够，存一份派生值只会带来两份真相。
 *
 * 持久化走 @greypan/browser-kit 的 local，与两个 demo（react/vue-web-ui-demo）同一套读写，
 * 不另写一份裸 localStorage 包装。两个 demo 都在用 `watch` 之外的读 + 写两段式，
 * 这里跟着走：设置是本 tab 的即时偏好，跨 tab 联动不是本应用的需求。
 */
import { local } from '@greypan/browser-kit'
import { defineStore } from 'pinia'

export type ThemeAppearance = 'light' | 'dark' | 'system'

export interface AccentPreset {
  /** 写进 --wui-color-accent 的字面量。 */
  value: string
  label: string
}

const APPEARANCE_STORAGE_KEY = 'theme-appearance'
const ACCENT_STORAGE_KEY = 'theme-accent'
const REDUCED_MOTION_STORAGE_KEY = 'theme-reduced-motion'

const THEME_APPEARANCES = new Set<ThemeAppearance>(['light', 'dark', 'system'])

/** 与 macOS 色板一致的强调色。 */
export const ACCENT_PRESETS: readonly AccentPreset[] = [
  { value: '#0071e3', label: '蓝' },
  { value: '#a54ca4', label: '紫' },
  { value: '#f54096', label: '粉' },
  { value: '#ff4b53', label: '红' },
  { value: '#ff8616', label: '橙' },
  { value: '#ffbe00', label: '黄' },
  { value: '#61bf45', label: '绿' },
  { value: '#8c8c8c', label: '灰' }
] as const

const LEGACY_ACCENTS: Record<string, string> = {
  '#0a84ff': '#0071e3',
  '#007aff': '#0071e3',
  '#1d8348': '#61bf45',
  '#c64600': '#ff8616',
  '#ff453a': '#ff4b53',
  '#bf5af2': '#a54ca4',
  '#ff375f': '#f54096'
}

const DEFAULT_ACCENT = ACCENT_PRESETS[0].value
const WHITE = '#ffffff'
const BLACK = '#000000'
/** 低于图标与大号标记的 3:1 对比度时，改用另一侧前景色。 */
const MIN_ACCENT_FOREGROUND_CONTRAST = 3

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

/**
 * Apple-style accent fills use a white label by default in both appearances, with black as a fallback
 * when white would have less than 3:1 contrast. Unknown values use the default preset.
 */
export function onAccentFor(accent: string): string {
  const color = ACCENT_PRESETS.find(preset => preset.value === accent)?.value ?? DEFAULT_ACCENT

  return contrastRatio(WHITE, color) >= MIN_ACCENT_FOREGROUND_CONTRAST ? WHITE : BLACK
}

function isThemeAppearance(appearance: unknown): appearance is ThemeAppearance {
  return typeof appearance === 'string' && THEME_APPEARANCES.has(appearance as ThemeAppearance)
}

/**
 * 只认色板内的字面量。
 *
 * 这条白名单不是洁癖：读到的值最终会进 --wui-color-accent，认不出的字面量一律回落默认色，
 * 免得旧版本遗留或手改过的存储把任意外部字符串带进内联样式。
 */
function isAccentPreset(accent: unknown): accent is string {
  return typeof accent === 'string' && ACCENT_PRESETS.some(preset => preset.value === accent)
}

function readAppearance(): ThemeAppearance {
  const appearance = local.get<unknown>(APPEARANCE_STORAGE_KEY)
  return isThemeAppearance(appearance) ? appearance : 'system'
}

function readAccent(): string {
  const accent = local.get<unknown>(ACCENT_STORAGE_KEY)
  if (isAccentPreset(accent)) return accent
  return typeof accent === 'string' ? (LEGACY_ACCENTS[accent] ?? DEFAULT_ACCENT) : DEFAULT_ACCENT
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    appearance: readAppearance(),
    accent: readAccent(),
    reducedMotion: local.get<unknown>(REDUCED_MOTION_STORAGE_KEY) === true
  }),
  actions: {
    setAppearance(appearance: ThemeAppearance) {
      this.appearance = appearance
      local.set(APPEARANCE_STORAGE_KEY, appearance)
    },
    setReducedMotion(reduced: boolean) {
      this.reducedMotion = reduced
      local.set(REDUCED_MOTION_STORAGE_KEY, reduced)
    },
    setAccent(accent: string) {
      if (!isAccentPreset(accent)) return
      this.accent = accent
      local.set(ACCENT_STORAGE_KEY, accent)
    }
  }
})
