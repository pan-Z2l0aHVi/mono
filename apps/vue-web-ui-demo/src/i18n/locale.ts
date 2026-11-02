import { readonly, ref, shallowRef, type ShallowRef } from 'vue'
import { commitLocale, loadLocale } from 'wuchale/load-utils'

import { loadMetaDocs, prepareExamples, type MetaDocs } from './examples'

export type DemoLocale = 'zh-CN' | 'en'
interface Dependencies {
  loadCatalog: (locale: DemoLocale) => Promise<void>
  commitCatalog: (locale: DemoLocale) => void
  loadDocs: (locale: DemoLocale, components: string[]) => Promise<MetaDocs>
  prepareExamples: (docs: MetaDocs) => Promise<void>
  readPreference: () => string | null
  writePreference: (locale: DemoLocale) => void
  languages: () => readonly string[]
  setDocumentLanguage: (locale: DemoLocale) => void
}
const isLocale = (value: unknown): value is DemoLocale => value === 'zh-CN' || value === 'en'

/** 准备当前页面所需资源，再同步发布语种和文档；失败保留已提交的视图。 */
export function createLocaleController(deps: Dependencies) {
  const locale = ref<DemoLocale>('zh-CN')
  const docs = shallowRef<MetaDocs>(new Map())
  const pending = ref(false)
  const components = new Map<string, number>()
  let revision = 0
  let latest = 0
  let queue = Promise.resolve()
  let latestRequest = Promise.resolve()
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
    if (docs.value.has(component)) return
    const target = locale.value
    const loaded = await deps.loadDocs(target, [component])
    if (locale.value !== target) return
    const doc = loaded.get(component)
    if (!doc) return
    await deps.prepareExamples(new Map([[component, doc]]))
    if (locale.value !== target) return
    docs.value = new Map(docs.value).set(component, doc)
  }
  /*
   * 反复读 revision：注册发生在子组件的挂载期，可能晚于本次装载，收敛到「注册表不再变」为止。
   * `loadDocs` 与 `prepareExamples` 都按组件缓存，重复一轮只是几份已完成的 promise。
   */
  async function prepare(value: DemoLocale) {
    let version: number
    let loaded: MetaDocs = new Map()
    do {
      version = revision
      loaded = await deps.loadDocs(value, [...components.keys()])
      await deps.prepareExamples(loaded)
    } while (version !== revision)
    return { docs: loaded, version }
  }
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
      // 核心的 loadLocale(false) 仍改写共享 catalog，失败时也要等所有分支结束再推进队列。
      const [catalog, prepared] = await Promise.allSettled([deps.loadCatalog(value), prepare(value)])
      if (id !== latest) return
      if (catalog.status === 'rejected') throw catalog.reason
      if (prepared.status === 'rejected') throw prepared.reason
      // 等 catalog 的这段时间里可能又注册了新组件，提交前再收敛一轮。
      let result = prepared.value
      while (result.version !== revision) result = await prepare(value)
      if (id !== latest) return
      deps.commitCatalog(value)
      docs.value = result.docs
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
    // 记录最近一次切换请求，测试据此等待落定，不必轮询渲染文案猜加载是否结束。
    latestRequest = request
    try {
      await request
    } finally {
      if (id === latest) pending.value = false
    }
  }
  /*
   * 首帧只依赖源语种 catalog：挂载前组件注册表为空，文档装载必然空转；目标语种要等挂载后
   * 由 `bootstrap` 补载。失败原样抛出，由调用方保留原因。
   */
  async function loadShellLocale() {
    await deps.loadCatalog('zh-CN')
    deps.commitCatalog('zh-CN')
    deps.setDocumentLanguage('zh-CN')
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
  return {
    locale: readonly(locale),
    // `readonly()` 会把 `.value` 里的节点数组也深层只读化，渲染器只按 `MetaNode` 的形状取值；
    // 这里只保留 ref 层面的只读（外部不能改写 `.value`），节点本身仍由生成物与控制器封装保证。
    docs: readonly(docs) as Readonly<ShallowRef<MetaDocs>>,
    pending: readonly(pending),
    detect,
    change,
    settled: () => latestRequest,
    loadShellLocale,
    bootstrap,
    register,
    ensure
  }
}

const controller = createLocaleController({
  loadCatalog: locale => loadLocale(locale, false),
  commitCatalog: commitLocale,
  loadDocs: loadMetaDocs,
  prepareExamples,
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
export const localeSettled = controller.settled
export const loadShellLocale = controller.loadShellLocale
export const bootstrapLocale = controller.bootstrap
export const bootDegraded = ref(false)
export const registerExampleDoc = controller.register
export const ensureExampleDoc = controller.ensure
