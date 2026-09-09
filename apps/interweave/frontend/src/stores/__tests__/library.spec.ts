import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vite-plus/test'

import type {
  ResourceDTO,
  SourceDTO
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import { SourceType } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import { filterAndSort, toResourceView, useLibraryStore } from '../library'

type ResourceDTOOverride = Omit<Partial<ResourceDTO>, 'sources'> & { sources?: Array<Partial<SourceDTO>> }

function dto(overrides: ResourceDTOOverride = {}): ResourceDTO {
  return {
    id: 'r1',
    title: 'Design Spec',
    note: '',
    created_at: 100,
    updated_at: 200,
    sources: [
      {
        id: 's1',
        resource_id: 'r1',
        type: SourceType.SourceTypeURL,
        location: 'https://example.com/spec',
        available: true,
        is_preferred: true,
        order_index: 0,
        metadata: { title: 'Spec', site_name: 'Example', description: 'd', favicon_url: 'f.png' },
        created_at: 100,
        updated_at: 200
      }
    ],
    tags: [{ id: 't1', name: 'design', created_at: 1 }],
    preferred_source_id: 's1',
    ...overrides
  } as ResourceDTO
}

describe('toResourceView（DTO → view-model 翻译）', () => {
  it('词汇对齐：metadata_json 解析为对象、is_preferred 派生 preferred、tags 取名称', () => {
    const view = toResourceView(dto())
    expect(view.title).toBe('Design Spec')
    expect(view.preferred?.id).toBe('s1')
    expect(view.preferred?.metadata?.siteName).toBe('Example')
    expect(view.tagNames).toEqual(['design'])
  })

  it('available 由各入口聚合：全部不可用才不可用（prototype 的 broken 取反）', () => {
    const unavailable = { available: false }
    const two = toResourceView(
      dto({
        sources: [
          {
            id: 's1',
            type: SourceType.SourceTypeURL,
            location: 'https://a',
            available: false,
            is_preferred: true,
            order_index: 0
          },
          {
            id: 's2',
            type: SourceType.SourceTypeFile,
            location: '/tmp/a.pdf',
            available: true,
            is_preferred: false,
            order_index: 1
          }
        ]
      })
    )
    expect(two.available).toBe(true)
    const none = toResourceView(
      dto({
        sources: [
          {
            id: 's1',
            type: SourceType.SourceTypeFile,
            location: '/a',
            ...unavailable,
            is_preferred: true,
            order_index: 0
          }
        ]
      })
    )
    expect(none.available).toBe(false)
  })

  it('kind 派生：url 为 web，文件按扩展名分类，未知扩展为 file', () => {
    expect(toResourceView(dto()).kind).toBe('web')
    expect(
      toResourceView(
        dto({
          sources: [
            {
              id: 's1',
              type: SourceType.SourceTypeFile,
              location: '/a/b.pdf',
              available: true,
              is_preferred: true,
              order_index: 0
            }
          ]
        })
      ).kind
    ).toBe('pdf')
    expect(
      toResourceView(
        dto({
          sources: [
            {
              id: 's1',
              type: SourceType.SourceTypeFile,
              location: '/a/b.weird',
              available: true,
              is_preferred: true,
              order_index: 0
            }
          ]
        })
      ).kind
    ).toBe('file')
  })

  it('无 metadata（本地文件）时 metadata 为 null', () => {
    const view = toResourceView(
      dto({
        sources: [
          {
            id: 's1',
            type: SourceType.SourceTypeFile,
            location: '/a',
            available: true,
            is_preferred: true,
            order_index: 0
          }
        ]
      })
    )
    expect(view.preferred?.metadata).toBeNull()
  })
})

describe('filterAndSort（列表语义）', () => {
  const resources = [
    toResourceView(
      dto({ id: 'r1', title: 'Alpha Spec', updated_at: 300, tags: [{ id: 't1', name: 'design', created_at: 1 }] })
    ),
    toResourceView(
      dto({
        id: 'r2',
        title: 'Beta Notes',
        updated_at: 100,
        sources: [
          {
            id: 's2',
            type: SourceType.SourceTypeFile,
            location: '/b.json',
            available: false,
            is_preferred: true,
            order_index: 0
          }
        ],
        tags: [{ id: 't2', name: 'code', created_at: 2 }]
      })
    ),
    toResourceView(
      dto({
        id: 'r3',
        title: 'Gamma PDF',
        updated_at: 200,
        sources: [
          {
            id: 's3',
            type: SourceType.SourceTypeFile,
            location: '/c.pdf',
            available: true,
            is_preferred: true,
            order_index: 0
          }
        ],
        tags: [{ id: 't3', name: 'docs', created_at: 3 }]
      })
    )
  ]
  const base: Parameters<typeof filterAndSort>[1] = {
    searchQuery: '',
    filterSource: 'all',
    filterKind: 'all',
    filterAvailability: 'all',
    filterTag: '',
    sort: 'latest'
  }

  it('搜索命中 title（大小写不敏感）', () => {
    expect(filterAndSort(resources, { ...base, searchQuery: 'beta' }).map(r => r.id)).toEqual(['r2'])
  })

  it('来源/可用性/分类/标签过滤', () => {
    expect(filterAndSort(resources, { ...base, filterSource: 'url' }).map(r => r.id)).toEqual(['r1'])
    expect(filterAndSort(resources, { ...base, filterAvailability: 'unavailable' }).map(r => r.id)).toEqual(['r2'])
    expect(filterAndSort(resources, { ...base, filterKind: 'pdf' }).map(r => r.id)).toEqual(['r3'])
    expect(filterAndSort(resources, { ...base, filterTag: 'design' }).map(r => r.id)).toEqual(['r1'])
  })

  it('排序：latest / earliest / name / tagName', () => {
    expect(filterAndSort(resources, { ...base, sort: 'latest' }).map(r => r.id)).toEqual(['r1', 'r3', 'r2'])
    expect(filterAndSort(resources, { ...base, sort: 'earliest' }).map(r => r.id)).toEqual(['r2', 'r3', 'r1'])
    expect(filterAndSort(resources, { ...base, sort: 'name' }).map(r => r.id)).toEqual(['r1', 'r2', 'r3'])
    expect(filterAndSort(resources, { ...base, sort: 'tagName' }).map(r => r.id)).toEqual(['r2', 'r1', 'r3'])
  })
})

describe('useLibraryStore（Pinia 集成）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('setResources 翻译整表，getter 派生标签集合', () => {
    const store = useLibraryStore()
    store.setResources([dto()])
    expect(store.resources).toHaveLength(1)
    expect(store.allTagNames).toEqual(['design'])
    expect(store.hasActiveFilter).toBe(false)
  })

  it('过滤状态驱动 filteredResources，resetFilters 归零', () => {
    const store = useLibraryStore()
    store.setResources([dto({ id: 'r1' }), dto({ id: 'r2', title: 'Other' })])
    store.searchQuery = 'other'
    expect(store.filteredResources.map(r => r.id)).toEqual(['r2'])
    expect(store.hasActiveFilter).toBe(true)
    store.resetFilters()
    expect(store.hasActiveFilter).toBe(false)
    expect(store.filteredResources).toHaveLength(2)
  })
})
