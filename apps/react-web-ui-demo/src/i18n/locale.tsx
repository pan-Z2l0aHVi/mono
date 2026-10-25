import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadLocale } from 'wuchale/load-utils'

import type { ExampleDoc } from '@/generated/zh-CN/examples'

/**
 * demo 站的语言以本机为准：localStorage 记着用户选过的那一档，没有就按 `navigator.languages`
 * 推一次——`zh*` 落到 `zh-CN`，`en*` 落到 `en`，其余一律 `en`。URL 不带语言，分享出去的
 * 链接在对方机器上按对方的习惯显示。
 */
export type Locale = 'zh-CN' | 'en'

const STORAGE_KEY = 'locale'
const LOCALES = new Set<Locale>(['zh-CN', 'en'])

const docsLoaders: Record<Locale, () => Promise<{ exampleDocs: ExampleDoc[] }>> = {
  'zh-CN': () => import('@/generated/zh-CN/examples'),
  en: () => import('@/generated/en/examples')
}

function readStoredLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return LOCALES.has(stored as Locale) ? (stored as Locale) : null
  } catch {
    return null
  }
}

export function detectLocale(): Locale {
  const stored = readStoredLocale()
  if (stored) return stored

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const language of languages) {
    const tag = language.toLowerCase()
    if (tag.startsWith('zh')) return 'zh-CN'
    if (tag.startsWith('en')) return 'en'
  }
  return 'en'
}

/** 当前语种的文档数据；模块按语种拆开，切语言只把新语种那一份拉进来。 */
export function loadExampleDocs(locale: Locale): Promise<ExampleDoc[]> {
  return docsLoaders[locale]().then(module => module.exampleDocs)
}

let shellLocale: Locale | null = null
const shellLoads = new Map<Locale, Promise<void>>()

/**
 * 装壳文案的 catalog。同一语种只提交一次：重复调用会在 Provider 挂载后多换一次语种，
 * 把运行时订阅者一起重渲染。
 */
export function loadShellLocale(locale: Locale): Promise<void> {
  if (shellLocale === locale) return Promise.resolve()
  let pending = shellLoads.get(locale)
  if (!pending) {
    pending = loadLocale(locale).then(
      () => {
        shellLocale = locale
        shellLoads.delete(locale)
      },
      error => {
        shellLoads.delete(locale)
        throw error
      }
    )
    shellLoads.set(locale, pending)
  }
  return pending
}

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    // 中文源 catalog 已在入口预载；这里负责首帧之后的换语种。
    void loadShellLocale(locale)
  }, [locale])

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: next => {
        setLocaleState(next)
        try {
          localStorage.setItem(STORAGE_KEY, next)
        } catch {
          // 存储被禁时只丢持久化，切换本身照常生效。
        }
      }
    }),
    [locale]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale 必须在 LocaleProvider 内使用')
  return value
}

/**
 * 文档随语种异步到达。语种与数据一起存：切换那一帧在渲染里就判定「这一语种还没有文档」，
 * 不必在 effect 里同步清空，上一语种的正文因此闪不了一帧；在途的慢请求落地时语种已不符，
 * 同样不采信。
 */
export function useExampleDoc(component: string): ExampleDoc | null {
  const { locale } = useLocale()
  const [docs, setDocs] = useState<{ locale: Locale; items: ExampleDoc[] } | null>(null)

  useEffect(() => {
    if (docs?.locale === locale) return
    let cancelled = false
    void loadExampleDocs(locale).then(items => {
      if (!cancelled) setDocs({ locale, items })
    })
    return () => {
      cancelled = true
    }
  }, [locale, docs])

  const items = docs?.locale === locale ? docs.items : null
  return items?.find(doc => doc.component === component) ?? null
}
