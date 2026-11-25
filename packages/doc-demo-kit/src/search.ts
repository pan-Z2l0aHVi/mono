import { NAV_SECTIONS, type NavSection } from './nav'

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

/** 将任意导航树展平为搜索索引条目。 */
export function createNavSearchItems<Id extends string>(sections: readonly NavSection<Id>[]): SearchItem[] {
  return sections.flatMap(section =>
    section.items.map(item => ({
      path: item.path,
      zh: item.label,
      en: item.label,
      keywords: item.zhName
    }))
  )
}

const componentItems: SearchItem[] = createNavSearchItems(NAV_SECTIONS)

/** 搜索导航项目；空查询不产生结果。pages 缺省用壳页 + 组件导航的全集。 */
export function searchNavigation<Id extends string = never>(
  query: string,
  pages: readonly SearchItem[] = SHELL_NAV_PAGES,
  sections?: readonly NavSection<Id>[]
): SearchItem[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  const items = sections ? createNavSearchItems(sections) : componentItems
  return [...pages, ...items].filter(item =>
    [item.zh, item.en, item.keywords].some(value => value?.toLocaleLowerCase().includes(needle))
  )
}
