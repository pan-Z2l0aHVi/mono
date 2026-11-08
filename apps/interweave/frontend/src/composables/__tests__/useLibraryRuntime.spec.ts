import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

vi.mock('../../services/library', () => ({
  createLibraryRuntime: vi.fn<() => LibraryRuntime>(() => {
    throw new Error('测试必须注入 LibraryRuntime')
  })
}))

import type {
  ResourceDTO,
  SourceDTO,
  TagDTO
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import { SourceProbeOutcome } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import {
  ResourceKind,
  SourceType,
  TagColor
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryRuntime, SourceAvailabilityEventDTO } from '../../services/library'
import { useLibraryStore, type ResourceSourceView } from '../../stores/library'
import { useLibraryRuntime } from '../useLibraryRuntime'

function createResource(overrides: Partial<ResourceDTO> = {}): ResourceDTO {
  const source: SourceDTO = {
    id: 'source-inline',
    resource_id: 'resource-inline',
    type: SourceType.SourceTypeFile,
    location: '/tmp/inline.md',
    available: true,
    is_preferred: true,
    order_index: 0,
    metadata: null,
    created_at: 100,
    updated_at: 200
  }
  return {
    id: 'resource-inline',
    title: 'Inline resource',
    note: '',
    kind: ResourceKind.ResourceKindDocument,
    size_bytes: 128,
    created_at: 100,
    updated_at: 200,
    sources: [source],
    tags: [],
    ...overrides
  }
}

type RuntimeOverrides = {
  isAvailable?: boolean
  resources?: Partial<LibraryRuntime['resources']>
  sources?: Partial<LibraryRuntime['sources']>
  media?: Partial<LibraryRuntime['media']>
  events?: Partial<LibraryRuntime['events']>
  system?: Partial<LibraryRuntime['system']>
}

function createRuntime(overrides: RuntimeOverrides = {}): LibraryRuntime {
  return {
    isAvailable: overrides.isAvailable ?? true,
    resources: {
      list: async () => [],
      get: async resourceId => createResource({ id: resourceId }),
      create: async () => createResource({ id: 'created-inline' }),
      updateTitle: async (resourceId, title) => createResource({ id: resourceId, title }),
      updateNote: async (resourceId, note) => createResource({ id: resourceId, note }),
      remove: async () => {},
      setTags: async () => createResource(),
      findLocationMatches: async () => [],
      prepareFilePreview: async () => ({ kind: ResourceKind.ResourceKindFile }),
      releaseFilePreview: async () => {},
      ...overrides.resources
    },
    sources: {
      // 刷新与替换直接回传变更后的完整 Resource 视图，composable 单调用即可回流。
      refreshURL: async () => createResource(),
      refreshFile: async () => createResource(),
      replaceFile: async () => createResource(),
      replaceURL: async () => createResource(),
      probeOnOpen: async () => ({
        source: createResource().sources[0]!,
        resource: createResource(),
        outcome: SourceProbeOutcome.SourceProbeOutcomeAvailable
      }),
      ...overrides.sources
    },
    media: {
      saveThumbnail: async () => {},
      ...overrides.media
    },
    events: {
      onFilesDropped: () => () => {},
      onPasteFilesRequested: () => () => {},
      onSourceAvailability: () => () => {},
      ...overrides.events
    },
    system: {
      chooseFilePaths: async () => [],
      chooseFilePath: async () => null,
      getClipboardFilePaths: async () => [],
      defaultOpenWith: async () => '',
      openExternal: async () => {},
      ...overrides.system
    }
  }
}

function sourceView(overrides: Partial<ResourceSourceView> = {}): ResourceSourceView {
  return {
    id: 'source-inline',
    type: 'url',
    location: 'https://example.com/dead',
    available: false,
    isPreferred: true,
    orderIndex: 0,
    mediaUrl: null,
    thumbnailUrl: null,
    metadata: null,
    ...overrides
  }
}

describe('useLibraryRuntime', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('Wails 可用时加载内联 DTO', async () => {
    const list = vi.fn<LibraryRuntime['resources']['list']>(async () => [createResource()])
    const controller = useLibraryRuntime(createRuntime({ resources: { list } }))

    await controller.loadResources()

    expect(useLibraryStore().resources[0]).toMatchObject({
      id: 'resource-inline',
      title: 'Inline resource',
      preferred: { id: 'source-inline', type: 'file' }
    })
    expect(list).toHaveBeenCalledOnce()
  })

  it('无 Wails bridge 时清空资源并跳过数据调用', async () => {
    const store = useLibraryStore()
    store.setResources([createResource()])
    const list = vi.fn<LibraryRuntime['resources']['list']>(async () => [createResource()])
    const controller = useLibraryRuntime(createRuntime({ isAvailable: false, resources: { list } }))

    await controller.loadResources()

    expect(store.resources).toEqual([])
    expect(controller.error.value).toBe('')
    expect(controller.isLoading.value).toBe(false)
    expect(list).not.toHaveBeenCalled()
  })

  const CAPTURE_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  const THUMBNAIL_URL = '/resource-thumbnail/source-inline'

  it('缩略图回填：同一地址的并发捕获只在第一个在途请求里上传，dataURL 转 Blob 交给 runtime', async () => {
    let release!: () => void
    const gate = new Promise<void>(resolve => {
      release = resolve
    })
    const saveThumbnail = vi.fn<LibraryRuntime['media']['saveThumbnail']>(async () => {
      await gate
    })
    const controller = useLibraryRuntime(createRuntime({ media: { saveThumbnail } }))

    const first = controller.saveSourceThumbnail(THUMBNAIL_URL, CAPTURE_URL)
    const second = controller.saveSourceThumbnail(THUMBNAIL_URL, CAPTURE_URL)
    expect(second).toBe(first)

    release()
    await Promise.all([first, second])
    expect(saveThumbnail).toHaveBeenCalledExactlyOnceWith(THUMBNAIL_URL, expect.any(Blob))

    // 在途槽已释放：新的捕获可以再次上传。
    await controller.saveSourceThumbnail(THUMBNAIL_URL, CAPTURE_URL)
    expect(saveThumbnail).toHaveBeenCalledTimes(2)
  })

  it('缩略图回填失败被吞掉并释放去重槽，不污染 controller.error', async () => {
    const saveThumbnail = vi.fn<LibraryRuntime['media']['saveThumbnail']>(async () => {
      throw new Error('network down')
    })
    const controller = useLibraryRuntime(createRuntime({ media: { saveThumbnail } }))

    await expect(controller.saveSourceThumbnail(THUMBNAIL_URL, CAPTURE_URL)).resolves.toBeUndefined()
    expect(controller.error.value).toBe('')

    await controller.saveSourceThumbnail(THUMBNAIL_URL, CAPTURE_URL)
    expect(saveThumbnail).toHaveBeenCalledTimes(2)
  })

  it('添加与删除使用 runtime 返回的内联 DTO 更新 store', async () => {
    const created = createResource({ id: 'created', title: 'Created from inline data' })
    const create = vi.fn<LibraryRuntime['resources']['create']>(async () => created)
    const remove = vi.fn<LibraryRuntime['resources']['remove']>(async () => {})
    const controller = useLibraryRuntime(createRuntime({ resources: { create, remove } }))

    await controller.addResource({
      id: 'queue-item',
      kind: 'file',
      resourceKind: ResourceKind.ResourceKindDocument,
      title: 'Created from inline data',
      location: '/tmp/inline.md',
      tags: [],
      previewToken: null,
      mediaUrl: null
    })
    expect(useLibraryStore().resources.map(resource => resource.id)).toEqual(['created'])
    expect(create).toHaveBeenCalledExactlyOnceWith({
      kind: SourceType.SourceTypeFile,
      location: '/tmp/inline.md',
      title: 'Created from inline data',
      tags: []
    })

    await controller.deleteResources(['created'])
    expect(useLibraryStore().resources).toEqual([])
    expect(remove).toHaveBeenCalledWith('created')
  })

  it('添加资源时把标题与队列标签一次交给后端建齐', async () => {
    const tagged = createResource({
      id: 'tagged',
      title: 'Tagged',
      tags: [
        { id: 'tag-design', name: 'Design', created_at: 300, color: TagColor.TagColorBlue },
        { id: 'tag-travel', name: 'Travel', created_at: 300, color: TagColor.TagColorAmber }
      ]
    })
    const create = vi.fn<LibraryRuntime['resources']['create']>(async () => tagged)
    const controller = useLibraryRuntime(createRuntime({ resources: { create } }))

    await controller.addResource({
      id: 'queue-tagged',
      kind: 'url',
      resourceKind: ResourceKind.ResourceKindWeb,
      title: '',
      location: 'https://example.com/tagged',
      tags: ['Design', 'Travel'],
      previewToken: null,
      mediaUrl: null
    })

    expect(create).toHaveBeenCalledExactlyOnceWith({
      kind: SourceType.SourceTypeURL,
      location: 'https://example.com/tagged',
      title: '',
      tags: ['Design', 'Travel']
    })
    expect(useLibraryStore().resources[0]?.tagNames).toEqual(['Design', 'Travel'])
  })

  it('saveTags 把名称集合原样交给替换式接口并回流返回的最新 DTO', async () => {
    const tagged = createResource({
      id: 'resource-inline',
      tags: [{ id: 'tag-travel', name: 'Travel', created_at: 300, color: TagColor.TagColorAmber }]
    })
    const setTags = vi.fn<LibraryRuntime['resources']['setTags']>(async () => tagged)
    const get = vi.fn<LibraryRuntime['resources']['get']>()
    const controller = useLibraryRuntime(createRuntime({ resources: { setTags, get } }))
    useLibraryStore().setResources([createResource()])

    const saved = await controller.saveTags('resource-inline', ['  Design ', 'Travel'])

    expect(setTags).toHaveBeenCalledExactlyOnceWith('resource-inline', ['  Design ', 'Travel'])
    expect(get).not.toHaveBeenCalled()
    expect(saved.tags.map(tag => tag.name)).toEqual(['Travel'])
    expect(useLibraryStore().resources[0]?.tagNames).toEqual(['Travel'])
  })

  it('probeURLSourceOnOpen：只对判为不可用的 URL 首选 source 探测，回流的 Resource 直接更新 store', async () => {
    const revived = createResource({ id: 'resource-inline', size_bytes: 256 })
    const get = vi.fn<LibraryRuntime['resources']['get']>()
    const probeOnOpen = vi.fn<LibraryRuntime['sources']['probeOnOpen']>(async () => ({
      source: revived.sources[0]!,
      resource: revived,
      outcome: SourceProbeOutcome.SourceProbeOutcomeAvailable
    }))
    const controller = useLibraryRuntime(createRuntime({ resources: { get }, sources: { probeOnOpen } }))
    useLibraryStore().setResources([createResource()])

    await controller.probeURLSourceOnOpen(sourceView())

    expect(probeOnOpen).toHaveBeenCalledExactlyOnceWith('source-inline')
    expect(get).not.toHaveBeenCalled()
    expect(useLibraryStore().resources[0]?.sizeBytes).toBe(256)
    expect(controller.error.value).toBe('')
  })

  it('probeURLSourceOnOpen：已可用、file source 与空首选都不触发探测', async () => {
    const probeOnOpen = vi.fn<LibraryRuntime['sources']['probeOnOpen']>()
    const controller = useLibraryRuntime(createRuntime({ sources: { probeOnOpen } }))
    const base = sourceView({ available: true, location: 'https://example.com/live' })

    await controller.probeURLSourceOnOpen(base)
    await controller.probeURLSourceOnOpen({ ...base, type: 'file', available: false })
    await controller.probeURLSourceOnOpen(null)

    expect(probeOnOpen).not.toHaveBeenCalled()
  })

  it('probeURLSourceOnOpen：inconclusive 不改 store，只把后端文案呈上 error', async () => {
    const probeOnOpen = vi.fn<LibraryRuntime['sources']['probeOnOpen']>(async () => ({
      outcome: SourceProbeOutcome.SourceProbeOutcomeInconclusive,
      message: '暂时无法检测该链接，请检查网络后重试'
    }))
    const controller = useLibraryRuntime(createRuntime({ sources: { probeOnOpen } }))
    const store = useLibraryStore()
    store.setResources([createResource()])
    const before = JSON.stringify(store.resources)

    await controller.probeURLSourceOnOpen(sourceView())

    expect(JSON.stringify(store.resources)).toBe(before)
    expect(controller.error.value).toBe('暂时无法检测该链接，请检查网络后重试')
  })

  it('probeURLSourceOnOpen：探测抛错只呈 error，不打断调用方', async () => {
    const controller = useLibraryRuntime(
      createRuntime({
        sources: {
          probeOnOpen: async () => {
            throw new Error('探测失败')
          }
        }
      })
    )

    await expect(controller.probeURLSourceOnOpen(sourceView())).resolves.toBeUndefined()
    expect(controller.error.value).toBe('探测失败')
  })

  it('defaultOpenWith：后端报无关联时回落空串，不把拒绝抛给调用方', async () => {
    const controller = useLibraryRuntime(
      createRuntime({
        system: {
          defaultOpenWith: async () => {
            throw new Error('no association found')
          }
        }
      })
    )

    await expect(controller.defaultOpenWith('/tmp/report.pdf')).resolves.toBe('')
    expect(controller.error.value).toBe('')
  })
})
