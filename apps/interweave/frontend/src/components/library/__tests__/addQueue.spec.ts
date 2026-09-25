import { describe, expect, it, vi } from 'vite-plus/test'

import { ResourceKind } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryRuntime } from '../../../services/library'
import { createLibraryAddQueue } from '../addQueue'

function createRuntime(overrides: Partial<LibraryRuntime> = {}): LibraryRuntime {
  return {
    isAvailable: true,
    listResources: async () => [],
    getResource: async () => {
      throw new Error('未使用')
    },
    addFileResource: async () => {
      throw new Error('未使用')
    },
    addURLResource: async () => {
      throw new Error('未使用')
    },
    updateResourceTitle: async () => {
      throw new Error('未使用')
    },
    deleteResource: async () => {},
    addTag: async () => {
      throw new Error('未使用')
    },
    removeTag: async () => {},
    refreshURLSource: async () => {
      throw new Error('未使用')
    },
    refreshFileSource: async () => {
      throw new Error('未使用')
    },
    replaceFileSource: async () => {
      throw new Error('未使用')
    },
    replaceURLSource: async () => {
      throw new Error('未使用')
    },
    chooseFilePaths: async () => [],
    chooseFilePath: async () => null,
    getClipboardFilePaths: async () => [],
    prepareFilePreview: async () => ({ kind: ResourceKind.ResourceKindFile }),
    releaseFilePreview: async () => {},
    resourceMediaURL: () => null,
    pendingFilePreviewURL: token => `/pending-resource-media/${token}`,
    subscribeToDroppedFiles: () => () => {},
    subscribeToPasteFileRequest: () => () => {},
    ...overrides
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe('library add queue pending previews', () => {
  it('入队后使用后端 kind 和 opaque token 更新真实缩略图地址', async () => {
    const prepareFilePreview = vi.fn<LibraryRuntime['prepareFilePreview']>(async () => ({
      kind: ResourceKind.ResourceKindImage,
      token: 'opaque-token'
    }))
    const queue = createLibraryAddQueue(createRuntime({ prepareFilePreview }))

    queue.enqueueFileLocations(['/tmp/photo.png'])
    await queue.waitForPreview(queue.queue.value[0]!.id)

    expect(queue.queue.value[0]).toMatchObject({
      resourceKind: ResourceKind.ResourceKindImage,
      previewToken: 'opaque-token',
      mediaUrl: '/pending-resource-media/opaque-token',
      tags: []
    })
  })

  it('关闭 dialog 释放所有已注册 token', async () => {
    const releaseFilePreview = vi.fn<LibraryRuntime['releaseFilePreview']>(async () => {})
    const queue = createLibraryAddQueue(
      createRuntime({
        prepareFilePreview: async location => ({
          kind: location.endsWith('.png') ? ResourceKind.ResourceKindImage : ResourceKind.ResourceKindVideo,
          token: `token-${location}`
        }),
        releaseFilePreview
      })
    )

    queue.enqueueFileLocations(['/tmp/photo.png', '/tmp/movie.mp4'])
    await Promise.all(queue.queue.value.map(item => queue.waitForPreview(item.id)))
    await queue.close()

    expect(releaseFilePreview).toHaveBeenCalledTimes(2)
    expect(releaseFilePreview).toHaveBeenCalledWith('token-/tmp/photo.png')
    expect(releaseFilePreview).toHaveBeenCalledWith('token-/tmp/movie.mp4')
    expect(queue.queue.value).toEqual([])
  })

  it('移除单项与 submit 释放各自 token', async () => {
    const releaseFilePreview = vi.fn<LibraryRuntime['releaseFilePreview']>(async () => {})
    const queue = createLibraryAddQueue(
      createRuntime({
        prepareFilePreview: async () => ({ kind: ResourceKind.ResourceKindImage, token: 'opaque-token' }),
        releaseFilePreview
      })
    )

    queue.enqueueFileLocations(['/tmp/first.png', '/tmp/second.png'])
    const [first, second] = queue.queue.value
    await Promise.all(queue.queue.value.map(item => queue.waitForPreview(item.id)))
    await queue.removeItem(first!.id)
    await queue.releasePreview(second!.id)

    expect(releaseFilePreview).toHaveBeenCalledTimes(2)
    expect(releaseFilePreview).toHaveBeenCalledWith('opaque-token')
  })

  it('预览准备完成前移除单项时释放晚到 token', async () => {
    const prepared = deferred<{ kind: ResourceKind.ResourceKindImage; token: string }>()
    const releaseFilePreview = vi.fn<LibraryRuntime['releaseFilePreview']>(async () => {})
    const queue = createLibraryAddQueue(
      createRuntime({
        prepareFilePreview: async () => prepared.promise,
        releaseFilePreview
      })
    )

    queue.enqueueFileLocations(['/tmp/photo.png'])
    const itemId = queue.queue.value[0]!.id
    const removing = queue.removeItem(itemId)
    prepared.resolve({ kind: ResourceKind.ResourceKindImage, token: 'late-token' })
    await removing

    expect(queue.queue.value).toEqual([])
    expect(releaseFilePreview).toHaveBeenCalledOnce()
    expect(releaseFilePreview).toHaveBeenCalledWith('late-token')
  })

  it('关闭发生在异步准备期间时，晚到 token 立即释放', async () => {
    const prepared = deferred<{ kind: ResourceKind.ResourceKindImage; token: string }>()
    const releaseFilePreview = vi.fn<LibraryRuntime['releaseFilePreview']>(async () => {})
    const queue = createLibraryAddQueue(
      createRuntime({
        prepareFilePreview: async () => prepared.promise,
        releaseFilePreview
      })
    )

    queue.enqueueFileLocations(['/tmp/photo.png'])
    const closing = queue.close()
    prepared.resolve({ kind: ResourceKind.ResourceKindImage, token: 'late-token' })
    await closing

    expect(releaseFilePreview).toHaveBeenCalledOnce()
    expect(releaseFilePreview).toHaveBeenCalledWith('late-token')
  })

  it('无 Wails bridge 时保持通用 fallback 且不调用 preview API', () => {
    const prepareFilePreview = vi.fn<LibraryRuntime['prepareFilePreview']>()
    const queue = createLibraryAddQueue(createRuntime({ isAvailable: false, prepareFilePreview }))

    queue.enqueueFileLocations(['/tmp/offline.png'])

    expect(queue.queue.value[0]).toMatchObject({ resourceKind: ResourceKind.ResourceKindFile, mediaUrl: null })
    expect(prepareFilePreview).not.toHaveBeenCalled()
  })
})
