import { detectLocale } from './detect'
import type { DemoLocale, MetaDocs } from './examples'

export type { DemoLocale }

export interface LocaleSnapshot {
  locale: DemoLocale
  docs: MetaDocs
  pending: boolean
}

export interface LocaleDependencies {
  loadCatalog: (locale: DemoLocale) => Promise<void>
  commitCatalog: (locale: DemoLocale) => void
  loadDocs: (locale: DemoLocale, components: string[]) => Promise<MetaDocs>
  prepareExamples: (docs: MetaDocs) => Promise<void>
  readPreference: () => string | null
  writePreference: (locale: DemoLocale) => void
  languages: () => readonly string[]
  setDocumentLanguage: (locale: DemoLocale) => void
}

export interface LocaleController {
  /**
   * 状态快照：整体引用只在 `publish` 时更换，框架侧按引用相等跳过无关渲染
   * （React `useSyncExternalStore` 要求 getSnapshot 稳定，Vue 侧按同一约定同步 ref）。
   */
  getSnapshot: () => LocaleSnapshot
  subscribe: (listener: () => void) => () => void
  detect: () => DemoLocale
  /** 切换语种：catalog、文档与当前页示例全部就绪后统一提交；失败保留已提交的视图。 */
  change: (locale: DemoLocale, persist?: boolean) => Promise<void>
  /** 最近一次切换请求的 promise：测试据此等待落定，不必轮询渲染文案猜加载是否结束。 */
  settled: () => Promise<void>
  /** 首帧只依赖源语种 catalog；文档与目标语种等挂载后由 `bootstrap` 补载。 */
  loadShellLocale: () => Promise<void>
  /** 按本机偏好初始化语种；目标失败时降级回源语种，双重失败抛 `AggregateError`。 */
  bootstrap: () => Promise<{ degraded: boolean; error?: unknown }>
  /** 注册当前页组件供切换时准备运行示例；返回注销函数（引用计数）。 */
  register: (component: string) => () => void
  /** 页面切换后只为当前语种补载新组件。 */
  ensure: (component: string) => Promise<void>
}

/** 准备当前页面所需资源，再同步发布语种和文档；失败保留已提交的视图。 */
export function createLocaleController(
  deps: LocaleDependencies,
  initialLocale: DemoLocale = 'zh-CN'
): LocaleController {
  let snapshot: LocaleSnapshot = { locale: initialLocale, docs: new Map(), pending: false }
  const listeners = new Set<() => void>()
  const components = new Map<string, number>()
  let revision = 0
  let latest = 0
  let queue = Promise.resolve()
  let latestRequest: Promise<void> = Promise.resolve()
  function publish(next: LocaleSnapshot) {
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
   * 不在同一个语种里重复拉（缓存已经在 meta loader 一层做过，这里只是避免无谓的发布）。
   */
  async function ensure(component: string) {
    if (snapshot.docs.has(component)) return
    const locale = snapshot.locale
    const loaded = await deps.loadDocs(locale, [component])
    if (snapshot.locale !== locale) return
    const doc = loaded.get(component)
    if (!doc) return
    await deps.prepareExamples(new Map([[component, doc]]))
    if (snapshot.locale !== locale) return
    publish({ ...snapshot, docs: new Map(snapshot.docs).set(component, doc) })
  }
  /*
   * 反复读 revision：注册发生在子组件的挂载期（React effect / Vue watchEffect），可能晚于本次装载，
   * 收敛到「注册表不再变」为止。`loadDocs` 与 `prepareExamples` 都按组件缓存，重复一轮只是几份已完成的 promise。
   */
  async function prepare(locale: DemoLocale) {
    let version: number
    let docs: MetaDocs = new Map()
    do {
      version = revision
      docs = await deps.loadDocs(locale, [...components.keys()])
      await deps.prepareExamples(docs)
    } while (version !== revision)
    return { docs, version }
  }
  function detect(): DemoLocale {
    return detectLocale(deps)
  }
  async function change(locale: DemoLocale, persist = true) {
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
      if (persist) {
        try {
          deps.writePreference(locale)
        } catch (error) {
          console.warn('Unable to persist language preference', error)
        }
      }
    })
    queue = request.catch(() => {}) // 仅恢复队列；await request 仍把本次错误传播给调用方。
    latestRequest = request
    try {
      await request
    } catch (error) {
      // 过期请求的错误不属于当前调用方：最新一次 change 的 await 已经收到了同一份错误。
      if (id !== latest) return
      throw error
    } finally {
      if (id === latest) publish({ ...snapshot, pending: false })
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
    getSnapshot: () => snapshot,
    subscribe: listener => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    detect,
    change,
    settled: () => latestRequest,
    loadShellLocale,
    bootstrap,
    register,
    ensure
  }
}

/** 创建串行提交 catalog 的 loader，确保最后请求的语种最终生效。 */
export function createShellLocaleLoader(loadLocale: (locale: DemoLocale) => Promise<void>) {
  let shellLocale: DemoLocale | null = null
  let shellLoadQueue: Promise<void> = Promise.resolve()
  let pendingLoads = 0
  let latestRequest: { locale: DemoLocale; promise: Promise<void> } | null = null

  return function loadShellLocale(locale: DemoLocale): Promise<void> {
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
