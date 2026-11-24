import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

vi.mock('../../services/library', () => ({
  createLibraryRuntime: vi.fn<() => LibraryRuntime>(() => {
    throw new Error('测试必须注入 LibraryRuntime')
  })
}))

import type {
  ResourceDTO,
  SourceDTO
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import { SourceProbeOutcome } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import {
  ResourceKind,
  SourceType,
  TagColor
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryRuntime } from '../../services/library'
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
      expandImportEntries: async () => ({ files: [], folders: 0 }),
      prepareFilePreview: async () => ({ kind: ResourceKind.ResourceKindFile }),
      releaseFilePreview: async () => {},
      ...overrides.resources
    },
    sources: {
      startRecoveryScan: async () => 'scan',
      pollRecoveryScan: async () => ({
        candidates: [],
        checked: 0,
        currentDirectory: '',
        skipped: 0,
        done: true,
        cancelled: false,
        error: ''
      }),
      cancelRecoveryScan: async () => undefined,
      discardRecoveryScan: async () => undefined,
      replaceScannedFile: async () => {
        throw new Error('not implemented')
      },
      // 刷新与替换直接回传变更后的完整 Resource 视图，composable 单调用即可回流。
      refreshSource: async () => createResource(),
      replaceSource: async () => createResource(),
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
      onURLsDropped: () => () => {},
      onSourceAvailability: () => () => {},
      onPreviewRevoked: () => () => {},
      ...overrides.events
    },
    system: {
      chooseDirectory: async () => null,
      chooseFilePaths: async () => [],
      chooseFilePath: async () => null,
      getClipboardFilePaths: async () => [],
      readClipboardText: async () => '',
      writeClipboardText: async () => {},
      defaultOpenWith: async () => '',
      showInFileManager: async () => {},
      openExternal: async () => {},
      setWallpaper: async () => {},
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

  /*
   * G2 补测（v5 第五批）：rename / updateNote 快乐路径、addResource 失败路径、loadResources
   * 拒绝、openExternal 失败、refresh/replace 的在途簿记、deleteResources 的部分失败回滚。
   */
  it('renameResource 快乐路径：store 用返回的最新 DTO 回流，在途簿记闭合', async () => {
    const renamed = createResource({ id: 'resource-inline', title: 'Renamed' })
    const updateTitle = vi.fn<LibraryRuntime['resources']['updateTitle']>(async () => renamed)
    const controller = useLibraryRuntime(createRuntime({ resources: { updateTitle } }))
    useLibraryStore().setResources([createResource()])

    let pendingDuringCall: readonly string[] = []
    const gate = new Promise<void>(resolve => {
      updateTitle.mockImplementationOnce(async () => {
        pendingDuringCall = [...controller.pendingResourceIds.value]
        resolve()
        return renamed
      })
    })

    const saved = await controller.renameResource('resource-inline', 'Renamed')

    await gate
    expect(saved.title).toBe('Renamed')
    expect(pendingDuringCall).toEqual(['resource-inline'])
    expect(useLibraryStore().resources[0]?.title).toBe('Renamed')
    expect(controller.pendingResourceIds.value, '完成后簿记清空').toEqual([])
    expect(controller.error.value).toBe('')
  })

  it('updateResourceNote 快乐路径：备注回流 store', async () => {
    const noted = createResource({ id: 'resource-inline', note: '新的备注' })
    const updateNote = vi.fn<LibraryRuntime['resources']['updateNote']>(async () => noted)
    const controller = useLibraryRuntime(createRuntime({ resources: { updateNote } }))
    useLibraryStore().setResources([createResource()])

    await controller.updateResourceNote('resource-inline', '新的备注')

    expect(updateNote).toHaveBeenCalledExactlyOnceWith('resource-inline', '新的备注')
    expect(useLibraryStore().resources[0]?.note).toBe('新的备注')
    expect(controller.pendingResourceIds.value).toEqual([])
  })

  it('addResource 失败：error 呈上、拒绝继续抛、簿记清空且 store 不变', async () => {
    const create = vi.fn<LibraryRuntime['resources']['create']>(async () => {
      throw new Error('后端已存在同名资源')
    })
    const controller = useLibraryRuntime(createRuntime({ resources: { create } }))

    await expect(
      controller.addResource({
        id: 'queue-fail',
        kind: 'file',
        resourceKind: ResourceKind.ResourceKindDocument,
        title: 'X',
        location: '/tmp/x.md',
        tags: [],
        previewToken: null,
        mediaUrl: null
      })
    ).rejects.toThrow('后端已存在同名资源')

    expect(controller.error.value).toBe('后端已存在同名资源')
    expect(controller.pendingResourceIds.value, '失败后簿记清空').toEqual([])
    expect(useLibraryStore().resources).toEqual([])
  })

  it('loadResources 拒绝：error 呈上、isLoading 收敛、拒绝继续抛', async () => {
    const list = vi.fn<LibraryRuntime['resources']['list']>(async () => {
      throw new Error('列表读取失败')
    })
    const controller = useLibraryRuntime(createRuntime({ resources: { list } }))

    await expect(controller.loadResources()).rejects.toThrow('列表读取失败')
    expect(controller.error.value).toBe('列表读取失败')
    expect(controller.isLoading.value).toBe(false)
  })

  it('openExternal 失败：error 呈上且拒绝继续抛', async () => {
    const controller = useLibraryRuntime(
      createRuntime({
        system: {
          openExternal: async () => {
            throw new Error('无法打开外部链接')
          }
        }
      })
    )

    await expect(controller.openExternal('https://example.com')).rejects.toThrow('无法打开外部链接')
    expect(controller.error.value).toBe('无法打开外部链接')
  })

  it('refreshSource / replaceSource 的在途簿记：进行中带 id，结束（含失败）后清空', async () => {
    let releaseRefresh!: () => void
    const refreshGate = new Promise<void>(resolve => {
      releaseRefresh = resolve
    })
    let markStarted!: () => void
    // mock 在调用期阻塞：用例等它进场后再读 controller 的在途簿记，不需要前向引用 controller。
    const refreshStarted = new Promise<void>(resolve => {
      markStarted = resolve
    })
    const refreshSource = vi.fn<LibraryRuntime['sources']['refreshSource']>(async () => {
      markStarted()
      await refreshGate
      return createResource()
    })
    const replaceSource = vi.fn<LibraryRuntime['sources']['replaceSource']>(async () => {
      throw new Error('替换入口失败')
    })
    const controller = useLibraryRuntime(createRuntime({ sources: { refreshSource, replaceSource } }))

    const refreshing = controller.refreshSource({ id: 'source-1' })
    await refreshStarted
    expect(controller.refreshingSourceIds.value, '刷新在途时带 id').toEqual(['source-1'])
    releaseRefresh()
    await refreshing
    expect(controller.refreshingSourceIds.value, '刷新完成后簿记清空').toEqual([])
    expect(controller.error.value).toBe('')

    await expect(controller.replaceSource('source-2', 'https://new.example.com')).rejects.toThrow('替换入口失败')
    expect(controller.error.value).toBe('替换入口失败')
    expect(controller.replacingSourceIds.value, '替换失败后簿记同样清空').toEqual([])
  })

  it('deleteResources 部分失败回滚：已删除的成员落库，失败者保留并呈 error', async () => {
    const remove = vi.fn<LibraryRuntime['resources']['remove']>()
    remove.mockImplementationOnce(async () => {})
    remove.mockImplementationOnce(async () => {
      throw new Error('第二条删除失败')
    })
    const controller = useLibraryRuntime(createRuntime({ resources: { remove } }))
    useLibraryStore().setResources([
      createResource({ id: 'r-1' }),
      createResource({ id: 'r-2' }),
      createResource({ id: 'r-3' })
    ])

    await expect(controller.deleteResources(['r-1', 'r-2', 'r-3'])).rejects.toThrow('第二条删除失败')

    // 已成功删除的 r-1 从 store 摘掉（部分落库），未删除的 r-2 / r-3 保留。
    expect(useLibraryStore().resources.map(resource => resource.id)).toEqual(['r-2', 'r-3'])
    expect(controller.error.value).toBe('第二条删除失败')
    expect(controller.pendingResourceIds.value, '簿记清空').toEqual([])
  })
})
