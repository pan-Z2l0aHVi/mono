import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { commitLocale, loadLocale } from 'wuchale/load-utils'

import type { ExampleDoc } from '@/generated/zh-CN/examples'

import { createLocaleController } from './controller'
import { prepareExamples } from './examples'

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
  docs: ExampleDoc[]
  pending: boolean
  setLocale: (locale: Locale) => Promise<void>
  register: (component: string) => () => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(() =>
    createLocaleController({
      loadCatalog: locale => loadLocale(locale, false),
      loadDocs: loadExampleDocs,
      prepareExamples,
      commitCatalog: commitLocale,
      setDocumentLanguage: locale => {
        document.documentElement.lang = locale
      },
      persist: locale => {
        try {
          localStorage.setItem(STORAGE_KEY, locale)
        } catch (error) {
          console.warn('Unable to persist language preference', error)
        }
      }
    })
  )
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)

  useEffect(() => {
    let active = true
    const target = detectLocale()
    void controller.change(target, false).catch(async error => {
      console.error('Unable to initialize preferred language', error)
      if (active && target !== 'zh-CN') {
        await controller.change('zh-CN', false).catch(fallbackError => {
          console.error('Unable to load fallback language', fallbackError)
        })
      }
    })
    return () => {
      active = false
    }
  }, [controller])

  const value = useMemo<LocaleContextValue>(
    () => ({
      ...snapshot,
      setLocale: controller.change,
      register: controller.register
    }),
    [controller, snapshot]
  )
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale 必须在 LocaleProvider 内使用')
  return value
}

/** 文档与语种来自同一次提交；注册当前页供切换时按需准备运行示例。 */
export function useExampleDoc(component: string): ExampleDoc | null {
  const { docs, register } = useLocale()
  useEffect(() => register(component), [component, register])
  return docs.find(doc => doc.component === component) ?? null
}
