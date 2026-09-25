import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

vi.mock('../services/library', () => ({
  createLibraryRuntime: vi.fn<() => LibraryRuntime>(() => {
    throw new Error('测试必须注入 LibraryRuntime')
  })
}))

import type {
  ResourceDTO,
  SourceDTO,
  TagDTO
} from '../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import {
  ResourceKind,
  SourceType
} from '../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryRuntime } from '../services/library'
import { useLibraryStore } from '../stores/library'

import { useLibraryRuntime } from './useLibraryRuntime'

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
    preferred_source_id: source.id,
    ...overrides
  }
}

function createRuntime(overrides: Partial<LibraryRuntime> = {}): LibraryRuntime {
  return {
    isAvailable: true,
    listResources: async () => [],
    getResource: async resourceId => createResource({ id: resourceId }),
    addFileResource: async () => createResource(),
    addURLResource: async () => createResource(),
    updateResourceTitle: async (resourceId, title) => createResource({ id: resourceId, title }),
    deleteResource: async () => {},
    addTag: async () => ({ id: 'tag-inline', name: 'inline', created_at: 300 }) satisfies TagDTO,
    removeTag: async () => {},
    refreshURLSource: async () => createResource().sources[0]!,
    refreshFileSource: async () => createResource().sources[0]!,
    replaceFileSource: async () => createResource().sources[0]!,
    replaceURLSource: async () => createResource().sources[0]!,
    chooseFilePaths: async () => [],
    chooseFilePath: async () => null,
    getClipboardFilePaths: async () => [],
    prepareFilePreview: async () => ({ kind: ResourceKind.ResourceKindFile }),
    releaseFilePreview: async () => {},
    openExternal: async () => {},
    resourceMediaURL: () => null,
    pendingFilePreviewURL: () => null,
    subscribeToDroppedFiles: () => () => {},
    subscribeToPasteFileRequest: () => () => {},
    ...overrides
  }
}

describe('useLibraryRuntime', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('Wails 可用时加载内联 DTO 并注册桌面事件', async () => {
    const listResources = vi.fn<LibraryRuntime['listResources']>(async () => [createResource()])
    const subscribeToDroppedFiles = vi.fn<LibraryRuntime['subscribeToDroppedFiles']>(() => () => {})
    const subscribeToPasteFileRequest = vi.fn<LibraryRuntime['subscribeToPasteFileRequest']>(() => () => {})
    const controller = useLibraryRuntime(
      createRuntime({ listResources, subscribeToDroppedFiles, subscribeToPasteFileRequest })
    )

    await controller.loadResources()
    controller.subscribeToDroppedFiles(() => {})
    controller.subscribeToPasteFileRequest(() => {})

    expect(useLibraryStore().resources[0]).toMatchObject({
      id: 'resource-inline',
      title: 'Inline resource',
      preferred: { id: 'source-inline', type: 'file' }
    })
    expect(listResources).toHaveBeenCalledOnce()
    expect(subscribeToDroppedFiles).toHaveBeenCalledOnce()
    expect(subscribeToPasteFileRequest).toHaveBeenCalledOnce()
  })

  it('无 Wails bridge 时清空资源并跳过数据与事件调用', async () => {
    const store = useLibraryStore()
    store.setResources([createResource()])
    const listResources = vi.fn<LibraryRuntime['listResources']>(async () => [createResource()])
    const subscribeToDroppedFiles = vi.fn<LibraryRuntime['subscribeToDroppedFiles']>(() => () => {})
    const subscribeToPasteFileRequest = vi.fn<LibraryRuntime['subscribeToPasteFileRequest']>(() => () => {})
    const resourceMediaURL = vi.fn<LibraryRuntime['resourceMediaURL']>(() => '/resource-media/source-inline')
    const controller = useLibraryRuntime(
      createRuntime({
        isAvailable: false,
        listResources,
        subscribeToDroppedFiles,
        subscribeToPasteFileRequest,
        resourceMediaURL
      })
    )

    await controller.loadResources()

    expect(store.resources).toEqual([])
    expect(controller.error.value).toBe('')
    expect(controller.isLoading.value).toBe(false)
    expect(controller.resourceMediaURL('source-inline')).toBeNull()
    controller.subscribeToDroppedFiles(() => {})
    controller.subscribeToPasteFileRequest(() => {})
    expect(listResources).not.toHaveBeenCalled()
    expect(resourceMediaURL).not.toHaveBeenCalled()
    expect(subscribeToDroppedFiles).not.toHaveBeenCalled()
    expect(subscribeToPasteFileRequest).not.toHaveBeenCalled()
  })

  it('添加与删除使用 runtime 返回的内联 DTO 更新 store', async () => {
    const created = createResource({ id: 'created', title: 'Created from inline data' })
    const addFileResource = vi.fn<LibraryRuntime['addFileResource']>(async () => created)
    const deleteResource = vi.fn<LibraryRuntime['deleteResource']>(async () => {})
    const controller = useLibraryRuntime(createRuntime({ addFileResource, deleteResource }))

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
    expect(addFileResource).toHaveBeenCalledWith('/tmp/inline.md')

    await controller.deleteResources(['created'])
    expect(useLibraryStore().resources).toEqual([])
    expect(deleteResource).toHaveBeenCalledWith('created')
  })

  it('添加资源后按队列标签逐项持久化并回读最新 DTO', async () => {
    const created = createResource({ id: 'tagged', title: 'Tagged' })
    const tagged = createResource({
      id: 'tagged',
      title: 'Tagged',
      tags: [
        { id: 'tag-design', name: 'Design', created_at: 300 },
        { id: 'tag-travel', name: 'Travel', created_at: 300 }
      ]
    })
    const addTag = vi.fn<LibraryRuntime['addTag']>(async (resourceId, tagName) => ({
      id: `tag-${tagName}`,
      name: tagName,
      created_at: 300
    }))
    const getResource = vi.fn<LibraryRuntime['getResource']>(async () => tagged)
    const controller = useLibraryRuntime(
      createRuntime({
        addFileResource: async () => created,
        addTag,
        getResource
      })
    )

    await controller.addResource({
      id: 'queue-tagged',
      kind: 'file',
      resourceKind: ResourceKind.ResourceKindDocument,
      title: 'Tagged',
      location: '/tmp/tagged.md',
      tags: ['Design', 'Travel'],
      previewToken: null,
      mediaUrl: null
    })

    expect(addTag).toHaveBeenNthCalledWith(1, 'tagged', 'Design')
    expect(addTag).toHaveBeenNthCalledWith(2, 'tagged', 'Travel')
    expect(getResource).toHaveBeenCalledWith('tagged')
    expect(useLibraryStore().resources[0]?.tagNames).toEqual(['Design', 'Travel'])
  })
})
