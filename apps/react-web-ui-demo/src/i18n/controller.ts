import type { ExampleDoc } from '@/generated/zh-CN/examples'

import type { Locale } from './locale'

interface Dependencies {
  loadCatalog: (locale: Locale) => Promise<void>
  loadDocs: (locale: Locale) => Promise<ExampleDoc[]>
  prepareExamples: (locale: Locale, docs: ExampleDoc[], components: string[]) => Promise<void>
  commitCatalog: (locale: Locale) => void
  persist: (locale: Locale) => void
  setDocumentLanguage: (locale: Locale) => void
}

/** 准备当前页面所需资源，再同步发布语种和文档；失败保留已提交的视图。 */
export function createLocaleController(deps: Dependencies) {
  let snapshot = { locale: 'zh-CN' as Locale, docs: [] as ExampleDoc[], pending: false }
  const listeners = new Set<() => void>()
  const components = new Map<string, number>()
  let revision = 0
  let latest = 0
  let queue = Promise.resolve()
  function publish(next: typeof snapshot) {
    snapshot = next
    listeners.forEach(listener => listener())
  }
  function register(component: string) {
    components.set(component, (components.get(component) ?? 0) + 1)
    revision++
    return () => {
      const count = components.get(component)! - 1
      if (count) components.set(component, count)
      else components.delete(component)
      revision++
    }
  }
  async function prepare(locale: Locale, docs?: ExampleDoc[]) {
    docs ??= await deps.loadDocs(locale)
    let version: number
    do {
      version = revision
      await deps.prepareExamples(locale, docs, [...components.keys()])
    } while (version !== revision)
    return { docs, version }
  }
  async function change(locale: Locale, persist = true) {
    const id = ++latest
    publish({ ...snapshot, pending: true })
    const request = queue.then(async () => {
      if (id !== latest) return
      // 核心的 loadLocale(false) 仍改写共享 catalog，失败时也要等所有分支结束再推进队列。
      const [catalog, docs] = await Promise.allSettled([deps.loadCatalog(locale), prepare(locale)])
      if (id !== latest) return
      if (catalog.status === 'rejected') throw catalog.reason
      if (docs.status === 'rejected') throw docs.reason
      let prepared = docs.value
      while (prepared.version !== revision) prepared = await prepare(locale, prepared.docs)
      if (id !== latest) return
      deps.commitCatalog(locale)
      deps.setDocumentLanguage(locale)
      publish({ locale, docs: prepared.docs, pending: true })
      if (persist) deps.persist(locale)
    })
    queue = request.catch(() => {})
    try {
      await request
    } catch (error) {
      if (id === latest) throw error
    } finally {
      if (id === latest) publish({ ...snapshot, pending: false })
    }
  }
  return {
    change,
    register,
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}
