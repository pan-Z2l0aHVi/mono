import type { DemoLocale } from './examples'

export interface LocaleDetectDependencies {
  readPreference: () => string | null
  languages: () => readonly string[]
}

/**
 * demo 站的语言以本机为准：用户选过的那一档优先（localStorage 记录），没有就按 `navigator.languages`
 * 推一次——`zh*` 落到 `zh-CN`，`en*` 落到 `en`，其余一律 `en`。URL 不带语言，分享出去的
 * 链接在对方机器上按对方的习惯显示。
 */
export function detectLocale({ readPreference, languages }: LocaleDetectDependencies): DemoLocale {
  try {
    const stored = readPreference()
    if (stored === 'zh-CN' || stored === 'en') return stored
  } catch (error) {
    console.warn('Unable to read language preference', error)
  }
  for (const language of languages()) {
    if (language.toLowerCase().startsWith('zh')) return 'zh-CN'
    if (language.toLowerCase().startsWith('en')) return 'en'
  }
  return 'en'
}
