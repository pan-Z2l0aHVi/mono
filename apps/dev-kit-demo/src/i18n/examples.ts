import {
  createMetaLoader,
  metaFileOf,
  prepareExamples,
  resolveReadmeLinks,
  type DemoLocale,
  type MetaDocs
} from '@greypan/doc-demo-kit'
import type { MetaNode } from '@greypan/md-to-meta'

export { prepareExamples, type MetaDocs }

const docModules = import.meta.glob<{ default: MetaNode[] }>('../generated/{js-kit,browser-kit}/*.meta.js')
const changelogModules = import.meta.glob<{ default: MetaNode[] }>(
  '../generated/changelog/{js-kit,browser-kit}/*.meta.js'
)
const readmeModules = import.meta.glob<{ default: MetaNode[] }>('../generated/readme/{js-kit,browser-kit}/*.meta.js')

const allModules = {
  ...docModules,
  ...changelogModules,
  ...readmeModules
}

const README_BASE: Record<string, string> = {
  'js-kit': 'https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/js-kit/docs',
  'browser-kit': 'https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/browser-kit/docs'
}

const PKG_ROOT_BASE: Record<string, string> = {
  'js-kit': 'https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/js-kit',
  'browser-kit': 'https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/browser-kit'
}

/**
 * 命名空间文档键解析：
 * - `<pkg>/CHANGELOG` -> `../generated/changelog/<pkg>/CHANGELOG.meta.js`（无 .CN 后缀）
 * - `<pkg>/README`    -> `../generated/readme/<pkg>/${metaFileOf(locale, 'README')}`
 * - `<pkg>/<module>`  -> `../generated/<pkg>/${metaFileOf(locale, module)}`
 */
export function resolveGeneratedMetaPath(locale: DemoLocale, key: string): string {
  const slash = key.indexOf('/')
  if (slash <= 0) return `../generated/${metaFileOf(locale, key)}`
  const pkg = key.slice(0, slash)
  const name = key.slice(slash + 1)
  if (name === 'CHANGELOG') return `../generated/changelog/${pkg}/CHANGELOG.meta.js`
  if (name === 'README') return `../generated/readme/${pkg}/${metaFileOf(locale, 'README')}`
  return `../generated/${pkg}/${metaFileOf(locale, name)}`
}

const loader = createMetaLoader({
  modules: allModules,
  resolve: resolveGeneratedMetaPath
})

export const loadMeta = loader.loadMeta
export const loadMetaDocs = loader.loadMetaDocs

export function resolveDocLinks(key: string, nodes: readonly MetaNode[]): MetaNode[] {
  const slash = key.indexOf('/')
  const pkg = slash > 0 ? key.slice(0, slash) : ''
  const name = slash > 0 ? key.slice(slash + 1) : key
  const base = name === 'README' ? PKG_ROOT_BASE[pkg] : README_BASE[pkg]
  return base ? resolveReadmeLinks(nodes, base) : [...nodes]
}
