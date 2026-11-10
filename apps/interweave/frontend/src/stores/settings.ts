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
  /**
   * 与 value 一起写进 --wui-color-on-accent 的前景色。
   *
   * theme 在 light / dark 下分别给白与黑，直接沿用会让多数预设在 primary button 上
   * 达不到 4.5:1：色板按 macOS 观感挑，深浅都有。每个预设自带前景色，宿主不用按
   * appearance 分支猜，也不用为了对比度改掉用户选的颜色。判定见 settings.spec.ts。
   */
  onAccent: string
  label: string
}

const APPEARANCE_STORAGE_KEY = 'theme-appearance'
const ACCENT_STORAGE_KEY = 'theme-accent'
const REDUCED_MOTION_STORAGE_KEY = 'theme-reduced-motion'

const THEME_APPEARANCES = new Set<ThemeAppearance>(['light', 'dark', 'system'])

/** 与 macOS 色板一致的强调色；每个 onAccent 都按 WCAG AA（≥4.5:1）逐色挑定。 */
export const ACCENT_PRESETS: readonly AccentPreset[] = [
  { value: '#0071e3', onAccent: '#ffffff', label: '蓝' },
  { value: '#a54ca4', onAccent: '#ffffff', label: '紫' },
  { value: '#f54096', onAccent: '#000000', label: '粉' },
  { value: '#ff4b53', onAccent: '#000000', label: '红' },
  { value: '#ff8616', onAccent: '#000000', label: '橙' },
  { value: '#ffbe00', onAccent: '#000000', label: '黄' },
  { value: '#61bf45', onAccent: '#000000', label: '绿' },
  { value: '#8c8c8c', onAccent: '#000000', label: '灰' }
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
const DEFAULT_ON_ACCENT = ACCENT_PRESETS[0].onAccent

/** accent 与 on-accent 必须成对覆盖，否则 theme 的 light/dark 默认值会破坏对比度。 */
export function onAccentFor(accent: string): string {
  return ACCENT_PRESETS.find(preset => preset.value === accent)?.onAccent ?? DEFAULT_ON_ACCENT
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
