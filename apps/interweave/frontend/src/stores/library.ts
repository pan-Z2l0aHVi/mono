/**
 * Library headless view-model store。
 *
 * 职责边界（ADR-0015：Pinia 不复制 Go 内部规则）：这里只做两类事——
 * 1. DTO → view-model 翻译：与后端契约的词汇在此一次性对齐。prototype 页面
 *    曾使用 name / broken / sourceType: 'local'|'link' 等分歧词汇，对应关系为
 *    name→title、broken→!available、local/link→file/url；页面不得再各自翻译 DTO。
 * 2. 列表展示语义：搜索、过滤、排序与派生标签集合，恰好实现一次。
 * preferred 基数、唯一 Source 删除约束等领域不变量留在 Go core，前端只读。
 *
 * 与 generated bindings 的关系：仅类型导入（import type），运行时零 Wails 依赖，
 * store 可在 Node 环境单测。
 */
import { defineStore } from 'pinia'

import type { ResourceDTO } from '../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'

export type SourceType = 'file' | 'url'

/** 资源展示分类：url 一律为 web；文件按扩展名粗分类，未知扩展归入 file。 */
export type ResourceKind = 'pdf' | 'document' | 'data' | 'web' | 'file'

const KIND_BY_EXTENSION: Record<string, ResourceKind> = {
  pdf: 'pdf',
  doc: 'document',
  docx: 'document',
  md: 'document',
  txt: 'document',
  rtf: 'document',
  json: 'data',
  csv: 'data',
  yaml: 'data',
  yml: 'data'
}

export interface ResourceSourceView {
  id: string
  type: SourceType
  location: string
  available: boolean
  isPreferred: boolean
  orderIndex: number
  /** 抓取到的展示元数据；本地文件或抓取失败时为 null（service 层已解析，前端不再碰 JSON）。 */
  metadata: {
    title: string
    siteName: string
    description: string
    faviconUrl: string
  } | null
}

export interface ResourceView {
  id: string
  title: string
  note: string
  createdAt: number
  updatedAt: number
  sources: ResourceSourceView[]
  /** 首选入口；DTO 契约保证恰有一个，view 只做派生快照。 */
  preferred: ResourceSourceView | null
  tagNames: string[]
  /** 至少一个入口可用即为可用；对应 prototype 的 broken 取反。 */
  available: boolean
  kind: ResourceKind
}

export type AvailabilityFilter = 'all' | 'available' | 'unavailable'
export type SortOption = 'latest' | 'earliest' | 'name' | 'tagName'

export interface ListCriteria {
  searchQuery: string
  filterSource: SourceType | 'all'
  filterKind: ResourceKind | 'all'
  filterAvailability: AvailabilityFilter
  filterTag: string
  sort: SortOption
}

function toSourceView(source: ResourceDTO['sources'][number]): ResourceSourceView {
  const metadata = source.metadata
  return {
    id: source.id,
    type: source.type as SourceType,
    location: source.location,
    available: source.available,
    isPreferred: source.is_preferred,
    orderIndex: source.order_index,
    metadata: metadata
      ? {
          title: metadata.title,
          siteName: metadata.site_name,
          description: metadata.description,
          faviconUrl: metadata.favicon_url
        }
      : null
  }
}

function kindOf(source: ResourceSourceView | null): ResourceKind {
  if (!source || source.type === 'url') return 'web'
  const dot = source.location.lastIndexOf('.')
  if (dot < 0 || dot === source.location.length - 1) return 'file'
  return KIND_BY_EXTENSION[source.location.slice(dot + 1).toLowerCase()] ?? 'file'
}

/** DTO → view-model；preferred 派生自 is_preferred，available 由各入口聚合。 */
export function toResourceView(dto: ResourceDTO): ResourceView {
  const sources = dto.sources.map(toSourceView)
  const preferred = sources.find(source => source.isPreferred) ?? null
  return {
    id: dto.id,
    title: dto.title,
    note: dto.note,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    sources,
    preferred,
    tagNames: dto.tags.map(tag => tag.name),
    available: sources.some(source => source.available),
    kind: kindOf(preferred ?? sources[0] ?? null)
  }
}

/** 过滤 + 排序；语义与 prototype 一致，词汇已对齐 view-model。 */
export function filterAndSort(resources: ResourceView[], criteria: ListCriteria): ResourceView[] {
  const query = criteria.searchQuery.trim().toLowerCase()

  const filtered = resources.filter(resource => {
    if (query && !resource.title.toLowerCase().includes(query)) return false
    if (criteria.filterSource !== 'all' && !resource.sources.some(source => source.type === criteria.filterSource))
      return false
    if (criteria.filterKind !== 'all' && resource.kind !== criteria.filterKind) return false
    if (criteria.filterAvailability === 'available' && !resource.available) return false
    if (criteria.filterAvailability === 'unavailable' && resource.available) return false
    if (criteria.filterTag && !resource.tagNames.includes(criteria.filterTag)) return false
    return true
  })

  const byName = (a: ResourceView, b: ResourceView) => a.title.toLowerCase().localeCompare(b.title.toLowerCase())
  const byTagName = (a: ResourceView, b: ResourceView) => {
    const tag = (a.tagNames[0] ?? '').localeCompare(b.tagNames[0] ?? '')
    return tag || byName(a, b)
  }
  const byTime = (a: ResourceView, b: ResourceView) => (a.updatedAt || a.createdAt) - (b.updatedAt || b.createdAt)

  return filtered.sort((a, b) => {
    if (criteria.sort === 'name') return byName(a, b)
    if (criteria.sort === 'tagName') return byTagName(a, b)
    if (criteria.sort === 'earliest') return byTime(a, b)
    return byTime(b, a)
  })
}

interface LibraryState {
  resources: ResourceView[]
  searchQuery: string
  filterSource: SourceType | 'all'
  filterKind: ResourceKind | 'all'
  filterAvailability: AvailabilityFilter
  filterTag: string
  sort: SortOption
}

export const useLibraryStore = defineStore('library', {
  state: (): LibraryState => ({
    resources: [],
    searchQuery: '',
    filterSource: 'all',
    filterKind: 'all',
    filterAvailability: 'all',
    filterTag: '',
    sort: 'latest'
  }),
  getters: {
    allTagNames(state): string[] {
      return [...new Set(state.resources.flatMap(resource => resource.tagNames))].sort()
    },
    hasActiveFilter(state): boolean {
      return (
        state.searchQuery.trim() !== '' ||
        state.filterSource !== 'all' ||
        state.filterKind !== 'all' ||
        state.filterAvailability !== 'all' ||
        state.filterTag !== ''
      )
    },
    filteredResources(state): ResourceView[] {
      return filterAndSort(state.resources, {
        searchQuery: state.searchQuery,
        filterSource: state.filterSource,
        filterKind: state.filterKind,
        filterAvailability: state.filterAvailability,
        filterTag: state.filterTag,
        sort: state.sort
      })
    }
  },
  actions: {
    /** 整表替换视图；由 service 调用方（页面/composable）喂数据，store 不直接触达 Wails。 */
    setResources(resources: ResourceDTO[]) {
      this.resources = resources.map(toResourceView)
    },
    resetFilters() {
      this.searchQuery = ''
      this.filterSource = 'all'
      this.filterKind = 'all'
      this.filterAvailability = 'all'
      this.filterTag = ''
    }
  }
})
