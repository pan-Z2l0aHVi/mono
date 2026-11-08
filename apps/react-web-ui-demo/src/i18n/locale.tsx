import {
  createBrowserLocaleDependencies,
  createLocaleController,
  createShellLocaleLoader,
  detectLocale as detectDemoLocale,
  type DemoLocale,
  type LocaleController,
  type LocaleDependencies
} from '@greypan/doc-demo-kit'
import type { MetaNode } from '@greypan/md-to-meta'
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { commitLocale, loadLocale } from 'wuchale/load-utils'

import { loadMetaDocs, prepareExamples, type MetaDocs } from './examples'

/** demo 站的语种：中文是源语种，英文没有文件名后缀（契约在 `@greypan/doc-demo-kit`）。 */
export type Locale = DemoLocale
export type { DemoLocale }

const STORAGE_KEY = 'locale'

/** 本机语种判定：kit 的 `detectLocale` 接本 demo 的偏好存储与浏览器语言（判据见 kit 的用例）。 */
export function detectLocale(): Locale {
  return detectDemoLocale(createBrowserLocaleDependencies({ storageKey: STORAGE_KEY }))
}

export { createShellLocaleLoader }

/**
 * 串行提交壳文案 catalog。快速切换时把新请求排在旧请求之后，保证最后提交的是当前选择；
 * 同一语种的重复调用共用同一个 promise。
 */
export const loadShellLocale = createShellLocaleLoader(loadLocale)

interface LocaleContextValue {
  locale: Locale
  docs: MetaDocs
  pending: boolean
  setLocale: (locale: Locale) => Promise<void>
  register: (component: string) => () => void
  ensure: (component: string) => Promise<void>
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

/**
 * 壳文案 catalog 来自 wuchale，语料装载来自 `./examples` 的 kit meta loader；引擎的并发、
 * 降级与提交顺序在 kit（`@greypan/doc-demo-kit`）里，这里只剩依赖接线与 React 快照绑定。
 * 偏好读写、navigator 语言与 document.lang 是两端共同的浏览器默认值，来自 kit。
 */
function createDemoDependencies(): LocaleDependencies {
  return {
    ...createBrowserLocaleDependencies({ storageKey: STORAGE_KEY }),
    loadCatalog: locale => loadLocale(locale, false),
    commitCatalog: commitLocale,
    loadDocs: loadMetaDocs,
    prepareExamples
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  // 首帧语种就按本机判定：子组件挂载时补载文档会直接命中正确语种，不会先拉一份再被切走。
  const [controller] = useState<LocaleController>(() =>
    createLocaleController(createDemoDependencies(), detectLocale())
  )
  // kit 约定：snapshot 整体引用只在 publish 时更换，`useSyncExternalStore` 按引用相等跳过无关渲染。
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)

  useEffect(() => {
    // 挂载后按本机偏好换入目标语种；失败降级回源语种，原因留在控制台。
    void controller.bootstrap().catch(error => {
      console.error('Unable to initialize preferred language', error)
    })
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
