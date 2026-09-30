/**
 * 应用外观设置（主题模式 + accent 预设色）。
 *
 * 只存「用户选了什么」，不存派生结果：resolved appearance 由 web-ui-theme 自己算，
 * 宿主读它就够，存一份派生值只会带来两份真相。
 *
 * 持久化走 @greypan/browser-kit 的 local，与两个 demo（react/vue-web-ui-demo）同一套读写，
 * 不再手写第三份裸 localStorage 包装。两个 demo 都在用 `watch` 之外的读 + 写两段式，
 * 这里跟着走：设置是本标签页的即时偏好，跨 tab 联动不是本应用的需求。
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

const THEME_APPEARANCES = new Set<ThemeAppearance>(['light', 'dark', 'system'])

/**
 * accent 预设色板。
 *
 * 前景统一是白（--wui-color-on-accent，theme 在 light 与 dark 两档下都已定为 #fff，不在这里覆盖），
 * 所以每个色值都要对白字过 WCAG AA 4.5:1。消费点是 button / badge / option / dropdown-item 的
 * 14–15px 常规字重正文，不是大字，4.5:1 才是该用的门槛。
 *
 * 绿与橙因此**不是** Apple system 色：#30d158 只有 2.02:1、#ff9f0a 只有 2.06:1，都不达标，
 * 换成同色相的深一档 #1d8348（4.78:1）与 #c64600（4.91:1）。其余四色保留 Apple 原色——
 * 它们在 3.4–3.7:1，与 web-ui 既有的 accent（light #08f 3.52:1、dark #0a84ff 3.65:1）
 * 是同一档，属于既有状态，不在这一笔里一并抬高。
 *
 * 「蓝」取 #0a84ff 而非 light 档的 #08f，是与 web-ui dark appearance 的默认 accent 同源，
 * 于是这一档在亮暗两档下与不设 accent 时视觉一致。
 */
export const ACCENT_PRESETS: readonly AccentPreset[] = [
  { value: '#0a84ff', label: '蓝' },
  { value: '#1d8348', label: '绿' },
  { value: '#c64600', label: '橙' },
  { value: '#ff453a', label: '红' },
  { value: '#bf5af2', label: '紫' },
  { value: '#ff375f', label: '粉' }
] as const

const DEFAULT_ACCENT = ACCENT_PRESETS[0].value

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
