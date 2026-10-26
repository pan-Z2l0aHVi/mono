import { readonly, ref, shallowRef } from 'vue'
import { commitLocale, loadLocale } from 'wuchale/load-utils'

import type { ExampleDoc } from '@/generated/examples'

export type DemoLocale = 'zh-CN' | 'en'
interface Dependencies {
  loadCatalog: (locale: DemoLocale) => Promise<void>
  commitCatalog: (locale: DemoLocale) => void
  loadDocs: (locale: DemoLocale) => Promise<ExampleDoc[]>
  readPreference: () => string | null
  writePreference: (locale: DemoLocale) => void
  languages: () => readonly string[]
  setDocumentLanguage: (locale: DemoLocale) => void
}
const isLocale = (value: unknown): value is DemoLocale => value === 'zh-CN' || value === 'en'

/** 串行准备 catalog 与文档，只提交最新的完整结果；原始加载错误向调用方传播。 */
export function createLocaleController(deps: Dependencies) {
  const locale = ref<DemoLocale>('zh-CN')
  const docs = shallowRef<ExampleDoc[]>([])
  const pending = ref(false)
  let latest = 0
  let queue = Promise.resolve()
  function detect(): DemoLocale {
    try {
      const stored = deps.readPreference()
      if (isLocale(stored)) return stored
    } catch (error) {
      console.warn('Unable to read language preference', error)
    }
    for (const language of deps.languages()) {
      if (language.toLowerCase().startsWith('zh')) return 'zh-CN'
      if (language.toLowerCase().startsWith('en')) return 'en'
    }
    return 'en'
  }
  async function change(value: DemoLocale, persist = true) {
    const id = ++latest
    pending.value = true
    const request = queue.then(async () => {
      if (id !== latest) return
      // loadLocale(false) 仍改写上游共享 catalog；必须等两个分支都结束，失败也不能提前推进队列。
      const [catalog, document] = await Promise.allSettled([deps.loadCatalog(value), deps.loadDocs(value)])
      if (id !== latest) return
      if (catalog.status === 'rejected') throw catalog.reason
      if (document.status === 'rejected') throw document.reason
      deps.commitCatalog(value)
      docs.value = document.value
      locale.value = value
      deps.setDocumentLanguage(value)
      if (persist) {
        try {
          deps.writePreference(value)
        } catch (error) {
          console.warn('Unable to persist language preference', error)
        }
      }
    })
    queue = request.catch(() => {}) // 仅恢复队列；下面 await 仍传播本次错误。
    try {
      await request
    } finally {
      if (id === latest) pending.value = false
    }
  }
  async function bootstrap() {
    const target = detect()
    try {
      await change(target, false)
      return { degraded: false as const }
    } catch (error) {
      if (target === 'zh-CN') throw error
      try {
        await change('zh-CN', false)
        return { degraded: true as const, error }
      } catch (fallbackError) {
        throw new AggregateError([error, fallbackError], 'Language initialization failed')
      }
    }
  }
  return { locale: readonly(locale), docs: readonly(docs), pending: readonly(pending), detect, change, bootstrap }
}

const controller = createLocaleController({
  loadCatalog: locale => loadLocale(locale, false),
  commitCatalog: commitLocale,
  loadDocs: async locale =>
    (locale === 'en' ? await import('@/generated/en/examples') : await import('@/generated/examples')).exampleDocs,
  readPreference: () => localStorage.getItem('locale'),
  writePreference: locale => localStorage.setItem('locale', locale),
  languages: () => (navigator.languages?.length ? navigator.languages : [navigator.language]),
  setDocumentLanguage: locale => {
    document.documentElement.lang = locale
  }
})
export const currentLocale = controller.locale
export const currentDocs = controller.docs
export const localePending = controller.pending
export const loadDemoLocale = controller.change
export const bootstrapLocale = controller.bootstrap
export const bootDegraded = ref(false)
