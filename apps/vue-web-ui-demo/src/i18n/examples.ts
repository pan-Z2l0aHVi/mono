import type { MetaNode } from '@greypan/md-to-meta'

import type { DemoLocale } from './locale'

/** 一个语种里按组件名索引的文档 meta。 */
export type MetaDocs = Map<string, MetaNode[]>

/*
 * 生成器把所有文档平铺在同一个目录里，语种只体现在文件名后缀（中文 `.CN`、英文无后缀）。
 * 引擎不做语种解释，`.CN` 是宿主这一侧的约定。
 */
const modules = import.meta.glob<{ default: MetaNode[] }>('../generated/*.meta.js')
const cache = new Map<string, Promise<MetaNode[]>>()

export function metaFileOf(locale: DemoLocale, component: string): string {
  return `../generated/${locale === 'zh-CN' ? `${component}.CN` : component}.meta.js`
}

/**
 * 按组件与语种装载 meta 模块。同一份模块只拉一次；失败不缓存，下次调用会重试。
 */
export function loadMeta(locale: DemoLocale, component: string): Promise<MetaNode[]> {
  const key = `${locale}/${component}`
  let pending = cache.get(key)
  if (!pending) {
    const file = metaFileOf(locale, component)
    const importModule = modules[file]
    if (!importModule) throw new Error(`Generated meta module is missing from glob: ${file}`)
    pending = importModule().then(module => module.default)
    void pending.catch(() => cache.delete(key))
    cache.set(key, pending)
  }
  return pending
}

/** 装载一组组件的 meta；返回的 Map 就是控制器的文档快照。 */
export async function loadMetaDocs(locale: DemoLocale, components: string[]): Promise<MetaDocs> {
  const entries = await Promise.all(
    components.map(async component => [component, await loadMeta(locale, component)] as const)
  )
  return new Map(entries)
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
