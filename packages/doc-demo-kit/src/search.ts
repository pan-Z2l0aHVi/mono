import { NAV_SECTIONS } from './nav'

export interface SearchItem {
  path: string
  zh: string
  en: string
  keywords?: string
}

/**
 * 壳页（首页 / 快速开始 / 更新日志）的搜索条目：两端曾各硬编码一份，收进 kit 后
 * `searchNavigation` 直接以此为默认 pages，接线只剩一次调用。中文是数据（搜索索引），
 * 不进 wuchale。
 */
export const SHELL_NAV_PAGES: readonly SearchItem[] = Object.freeze([
  { path: '/home', zh: '组件总览', en: 'Components' },
  { path: '/getting-started', zh: '快速开始', en: 'Getting Started', keywords: 'quick start' },
  { path: '/changelog', zh: '更新日志', en: 'Changelog' }
])

const componentItems: SearchItem[] = NAV_SECTIONS.flatMap(section =>
  section.items.map(item => ({
    path: item.path,
    zh: item.label,
    en: item.label,
    keywords: item.zhName
  }))
)

/** 搜索导航项目；空查询不产生结果。pages 缺省用壳页 + 组件导航的全集。 */
export function searchNavigation(query: string, pages: readonly SearchItem[] = SHELL_NAV_PAGES): SearchItem[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  return [...pages, ...componentItems].filter(item =>
    [item.zh, item.en, item.keywords].some(value => value?.toLocaleLowerCase().includes(needle))
  )
}
