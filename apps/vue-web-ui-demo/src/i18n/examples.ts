import { createMetaLoader, metaFileOf } from '@greypan/doc-demo-kit'
import type { MetaNode } from '@greypan/md-to-meta'

export { prepareExamples, type MetaDocs } from '@greypan/doc-demo-kit'

/*
 * 生成器把所有文档平铺在同一个目录里，语种只体现在文件名后缀（中文 `.CN`、英文无后缀）。
 * 引擎不做语种解释：kit 的 `metaFileOf` 只给文件名，目录前缀由这里的 `resolve` 补。
 */
const modules = import.meta.glob<{ default: MetaNode[] }>('../generated/*.meta.js')

const loader = createMetaLoader({
  modules,
  resolve: (locale, component) => `../generated/${metaFileOf(locale, component)}`
})

/**
 * 按组件与语种装载 meta 模块。同一份模块只拉一次；失败不缓存，下次调用会重试。
 */
export const loadMeta = loader.loadMeta

/** 装载一组组件的 meta；返回的 Map 就是控制器的文档快照。 */
export const loadMetaDocs = loader.loadMetaDocs
