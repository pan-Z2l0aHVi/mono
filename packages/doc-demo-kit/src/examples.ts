import type { MetaNode } from '@greypan/md-to-meta'

/** demo 站的语种：中文是源语种，英文没有文件名后缀。 */
export type DemoLocale = 'zh-CN' | 'en'

/** 一个语种里按组件名索引的文档 meta。 */
export type MetaDocs = Map<string, MetaNode[]>

/** 宿主用 `import.meta.glob` 展开的生成物模块表；键由 `resolve` 给出。 */
export type MetaModuleMap = Record<string, () => Promise<{ default: MetaNode[] }>>

export interface MetaLoaderOptions {
  modules: MetaModuleMap
  /**
   * 把（语种, 组件）映射到 `modules` 的键。目录前缀是宿主自己的事实：生成器平铺，
   * 共享 core 只持有 `<component>.CN.meta.js` 命名契约，绝不 import app 内部路径。
   */
  resolve: (locale: DemoLocale, component: string) => string
}

/** 语料文件名契约：中文是源语种（`.CN`），英文没有后缀；目录前缀由宿主补。 */
export function metaFileOf(locale: DemoLocale, component: string): string {
  return locale === 'zh-CN' ? `${component}.CN.meta.js` : `${component}.meta.js`
}

export interface MetaLoader {
  /**
   * 按组件与语种装载 meta 模块。同一份模块只拉一次；失败不缓存，下次调用会重试。
   */
  loadMeta: (locale: DemoLocale, component: string) => Promise<MetaNode[]>
  /** 装载一组组件的 meta；返回的 Map 就是控制器的文档快照。 */
  loadMetaDocs: (locale: DemoLocale, components: string[]) => Promise<MetaDocs>
}

export function createMetaLoader({ modules, resolve }: MetaLoaderOptions): MetaLoader {
  const cache = new Map<string, Promise<MetaNode[]>>()
  function loadMeta(locale: DemoLocale, component: string): Promise<MetaNode[]> {
    const key = `${locale}/${component}`
    const cached = cache.get(key)
    if (cached) return cached
    const file = resolve(locale, component)
    const importModule = modules[file]
    if (!importModule) return Promise.reject(new Error(`Generated meta module is missing from glob: ${file}`))
    const pending = importModule().then(module => module.default)
    void pending.catch(() => cache.delete(key))
    cache.set(key, pending)
    return pending
  }
  async function loadMetaDocs(locale: DemoLocale, components: string[]): Promise<MetaDocs> {
    const entries = await Promise.all(
      components.map(async component => [component, await loadMeta(locale, component)] as const)
    )
    return new Map(entries)
  }
  return { loadMeta, loadMetaDocs }
}

/**
 * 预载当前文档里带 `load` 的代码块，切语种提交前先把运行示例拉下来。
 * 没有 `load` 的围栏只是源码，不需要额外请求。
 */
export async function prepareExamples(docs: MetaDocs): Promise<void> {
  const pending: Promise<unknown>[] = []
  for (const nodes of docs.values()) {
    for (const node of nodes) {
      if (node.label === 'codeblock' && node.load) pending.push(node.load())
    }
  }
  await Promise.all(pending)
}
