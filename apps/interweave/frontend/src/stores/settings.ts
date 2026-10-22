/**
 * 应用外观设置（主题模式 + accent 预设色）。
 *
 * 只存「用户选了什么」，不存派生结果：resolved appearance 由 web-ui-theme 自己算，
 * 宿主读它就够，存一份派生值只会带来两份真相。
 *
 * 持久化走 @greypan/browser-kit 的 local，与两个 demo（react/vue-web-ui-demo）同一套读写，
 * 不再手写第三份裸 localStorage 包装。两个 demo 都在用 `watch` 之外的读 + 写两段式，
 * 这里跟着走：设置是本 tab 的即时偏好，跨 tab 联动不是本应用的需求。
 */
import { local } from '@greypan/browser-kit'
import { defineStore } from 'pinia'

export type ThemeAppearance = 'light' | 'dark' | 'system'

export interface AccentPreset {
  /** 写进 --wui-color-accent 的字面量。 */
  value: string
  label: string
  /** 覆盖 --wui-color-on-accent；未设置时沿用 web-ui-theme 的外观默认值。 */
  onAccent?: string
}

const APPEARANCE_STORAGE_KEY = 'theme-appearance'
const ACCENT_STORAGE_KEY = 'theme-accent'

const THEME_APPEARANCES = new Set<ThemeAppearance>(['light', 'dark', 'system'])

/**
 * accent 预设色板。
 *
 * web-ui 默认的 --wui-color-on-accent 随外观变化：light 为 #fff，dark 为 #000。Interweave
 * 里覆在这些预设色上的 14–15px 白字应达到 WCAG AA 4.5:1；这些是常规字重正文，不是大字。
 *
 * 绿与橙因此**不是** Apple system 色：#30d158 只有 2.02:1、#ff9f0a 只有 2.06:1，都不达标，
 * 换成同色相的深一档 #1d8348 与 #c64600。深色主题的默认黑字在这两种颜色上仍低于 4.5:1，
 * 所以它们明确配白字；白字在浅色和深色主题都达标，按钮 hover / active 的背景还会进一步变深。
 *
 * 「蓝」保留 #0a84ff。web-ui 的 light 默认值现为 #0071e3，dark 默认值仍为 #0a84ff。
 */
export const ACCENT_PRESETS: readonly AccentPreset[] = [
  { value: '#0a84ff', label: '蓝' },
  { value: '#1d8348', label: '绿', onAccent: '#fff' },
  { value: '#c64600', label: '橙', onAccent: '#fff' },
  { value: '#ff453a', label: '红' },
  { value: '#bf5af2', label: '紫' },
  { value: '#ff375f', label: '粉' }
] as const

const DEFAULT_ACCENT = ACCENT_PRESETS[0].value

export function getAccentThemeStyle(accent: string): Record<string, string> {
  const preset = ACCENT_PRESETS.find(candidate => candidate.value === accent) ?? ACCENT_PRESETS[0]

  return {
    '--wui-color-accent': preset.value,
    ...(preset.onAccent ? { '--wui-color-on-accent': preset.onAccent } : {})
  }
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
  return isAccentPreset(accent) ? accent : DEFAULT_ACCENT
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    appearance: readAppearance(),
    accent: readAccent()
  }),
  actions: {
    setAppearance(appearance: ThemeAppearance) {
      this.appearance = appearance
      local.set(APPEARANCE_STORAGE_KEY, appearance)
    },
    setAccent(accent: string) {
      if (!isAccentPreset(accent)) return
      this.accent = accent
      local.set(ACCENT_STORAGE_KEY, accent)
    }
  }
})
