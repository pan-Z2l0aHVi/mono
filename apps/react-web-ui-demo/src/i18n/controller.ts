import type { MetaDocs } from './examples'
import type { Locale } from './locale'

interface Dependencies {
  loadCatalog: (locale: Locale) => Promise<void>
  loadDocs: (locale: Locale, components: string[]) => Promise<MetaDocs>
  prepareExamples: (docs: MetaDocs) => Promise<void>
  commitCatalog: (locale: Locale) => void
  persist: (locale: Locale) => void
  setDocumentLanguage: (locale: Locale) => void
}

/** 准备当前页面所需资源，再同步发布语种和文档；失败保留已提交的视图。 */
export function createLocaleController(deps: Dependencies, initialLocale: Locale = 'zh-CN') {
  let snapshot = { locale: initialLocale, docs: new Map() as MetaDocs, pending: false }
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
  /*
   * 页面切换会带来已注册组件之外的新组件：语种提交只覆盖当时注册的那批，后来者由这里单独补齐。
   * 不在同一个语种里重复拉（缓存已经在 `loadMeta` 一层做过，这里只是避免无谓的发布）。
   */
  async function ensure(component: string) {
    if (snapshot.docs.has(component)) return
    const locale = snapshot.locale
    const loaded = await deps.loadDocs(locale, [component])
    if (snapshot.locale !== locale) return
    const docs = loaded.get(component)
    if (!docs) return
    await deps.prepareExamples(new Map([[component, docs]]))
    if (snapshot.locale !== locale) return
    publish({ ...snapshot, docs: new Map(snapshot.docs).set(component, docs) })
  }
  /*
   * 反复读 revision：注册发生在子组件的 effect 里，可能晚于本次装载，收敛到「注册表不再变」为止。
   * `loadDocs` 与 `prepareExamples` 都按组件缓存，重复一轮只是几份已完成的 promise。
   */
  async function prepare(locale: Locale) {
    let version: number
    let docs: MetaDocs = new Map()
    do {
      version = revision
      docs = await deps.loadDocs(locale, [...components.keys()])
      await deps.prepareExamples(docs)
    } while (version !== revision)
    return { docs, version }
  }
  async function change(locale: Locale, persist = true) {
    const id = ++latest
    publish({ ...snapshot, pending: true })
    const request = queue.then(async () => {
      if (id !== latest) return
      // 核心的 loadLocale(false) 仍改写共享 catalog，失败时也要等所有分支结束再推进队列。
      const [catalog, prepared] = await Promise.allSettled([deps.loadCatalog(locale), prepare(locale)])
      if (id !== latest) return
      if (catalog.status === 'rejected') throw catalog.reason
      if (prepared.status === 'rejected') throw prepared.reason
      // 等 catalog 的这段时间里可能又注册了新组件，提交前再收敛一轮。
      let result = prepared.value
      while (result.version !== revision) result = await prepare(locale)
      if (id !== latest) return
      deps.commitCatalog(locale)
      deps.setDocumentLanguage(locale)
      publish({ locale, docs: result.docs, pending: true })
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
    ensure,
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
