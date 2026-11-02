import type { MetaNode } from '@greypan/md-to-meta'
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { commitLocale, loadLocale } from 'wuchale/load-utils'

import { createLocaleController } from './controller'
import { loadMetaDocs, prepareExamples, type MetaDocs } from './examples'

/**
 * demo 站的语言以本机为准：localStorage 记着用户选过的那一档，没有就按 `navigator.languages`
 * 推一次——`zh*` 落到 `zh-CN`，`en*` 落到 `en`，其余一律 `en`。URL 不带语言，分享出去的
 * 链接在对方机器上按对方的习惯显示。
 */
export type Locale = 'zh-CN' | 'en'

const STORAGE_KEY = 'locale'
const LOCALES = new Set<Locale>(['zh-CN', 'en'])

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
  docs: MetaDocs
  pending: boolean
  setLocale: (locale: Locale) => Promise<void>
  register: (component: string) => () => void
  ensure: (component: string) => Promise<void>
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(() =>
    createLocaleController(
      {
        loadCatalog: locale => loadLocale(locale, false),
        loadDocs: loadMetaDocs,
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
      },
      // 首帧语种就按本机判定：子组件挂载时补载文档会直接命中正确语种，不会先拉一份再被切走。
      detectLocale()
    )
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
      register: controller.register,
      ensure: controller.ensure
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

/** 文档与语种来自同一次提交；注册当前页供切换时按需准备运行示例，页面切换后补载新组件。 */
export function useExampleDoc(component: string): MetaNode[] | null {
  const { docs, register, ensure } = useLocale()
  useEffect(() => register(component), [component, register])
  useEffect(() => {
    void ensure(component).catch(error => {
      console.error(`Unable to load example doc: ${component}`, error)
    })
  }, [component, ensure])
  return docs.get(component) ?? null
}
