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

/** 创建串行提交 catalog 的 loader，确保最后请求的语种最终生效。 */
export function createShellLocaleLoader(loadLocale: (locale: Locale) => Promise<void>) {
  let shellLocale: Locale | null = null
  let shellLoadQueue: Promise<void> = Promise.resolve()
  let pendingLoads = 0
  let latestRequest: { locale: Locale; promise: Promise<void> } | null = null

  return function loadShellLocale(locale: Locale): Promise<void> {
    if (latestRequest?.locale === locale) return latestRequest.promise
    if (pendingLoads === 0 && shellLocale === locale) return Promise.resolve()

    pendingLoads += 1
    const pending = shellLoadQueue
      .then(() => loadLocale(locale))
      .then(() => {
        shellLocale = locale
      })
    shellLoadQueue = pending.then(
      () => {
        pendingLoads -= 1
      },
      () => {
        pendingLoads -= 1
      }
    )
    latestRequest = { locale, promise: pending }
    void pending.catch(() => {
      if (latestRequest?.promise === pending) latestRequest = null
    })
    return pending
  }
}

const loadShellLocale = createShellLocaleLoader(loadLocale)

/**
 * 串行提交壳文案 catalog。快速切换时把新请求排在旧请求之后，保证最后提交的是当前选择；
 * 同一语种的重复调用共用同一个 promise。
 */
export { loadShellLocale }

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
