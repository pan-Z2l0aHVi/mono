import { describe, expect, it, vi } from 'vite-plus/test'

import { ResourceLocationMatchDTO } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import {
  ResourceKind,
  SourceType
} from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
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
    updateResourceNote: async () => {
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
    findResourceLocationMatches: async () => [],
    probeURLSourceOnOpen: async () => {
      throw new Error('未使用')
    },
    openExternal: async () => {
      throw new Error('未使用')
    },
    resourceMediaURL: () => null,
    pendingFilePreviewURL: token => `/pending-resource-media/${token}`,
    subscribeToDroppedFiles: () => () => {},
    subscribeToPasteFileRequest: () => () => {},
    subscribeToSourceAvailability: () => () => {},
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

    await queue.enqueueFileLocations(['/tmp/photo.png'])
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

    await queue.enqueueFileLocations(['/tmp/photo.png', '/tmp/movie.mp4'])
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

    await queue.enqueueFileLocations(['/tmp/first.png', '/tmp/second.png'])
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

    await queue.enqueueFileLocations(['/tmp/photo.png'])
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

    await queue.enqueueFileLocations(['/tmp/photo.png'])
    const closing = queue.close()
    prepared.resolve({ kind: ResourceKind.ResourceKindImage, token: 'late-token' })
    await closing

    expect(releaseFilePreview).toHaveBeenCalledOnce()
    expect(releaseFilePreview).toHaveBeenCalledWith('late-token')
  })

  it('无 Wails bridge 时保持通用 fallback 且不调用 preview API', async () => {
    const prepareFilePreview = vi.fn<LibraryRuntime['prepareFilePreview']>()
    const findResourceLocationMatches = vi.fn<LibraryRuntime['findResourceLocationMatches']>()
    const queue = createLibraryAddQueue(
      createRuntime({ isAvailable: false, prepareFilePreview, findResourceLocationMatches })
    )

    await queue.enqueueFileLocations(['/tmp/offline.png'])

    expect(queue.queue.value[0]).toMatchObject({ resourceKind: ResourceKind.ResourceKindFile, mediaUrl: null })
    expect(prepareFilePreview).not.toHaveBeenCalled()
    expect(findResourceLocationMatches).not.toHaveBeenCalled()
  })
})

function match(overrides: Partial<ResourceLocationMatchDTO> = {}) {
  return new ResourceLocationMatchDTO({
    resource_id: 'resource-1',
    title: '既有资源',
    location: '/library/photo.png',
    ...overrides
  })
}

describe('library add queue duplicate confirmation', () => {
  it('未命中时零打扰直接入队，不挂起提示', async () => {
    const findResourceLocationMatches = vi.fn<LibraryRuntime['findResourceLocationMatches']>(async () => [])
    const queue = createLibraryAddQueue(createRuntime({ findResourceLocationMatches }))

    await queue.enqueueFileLocations(['/tmp/fresh.png'])

    expect(findResourceLocationMatches).toHaveBeenCalledWith('/tmp/fresh.png', SourceType.SourceTypeFile)
    expect(queue.duplicatePrompt.value).toBeNull()
    expect(queue.queue.value.map(item => item.location)).toEqual(['/tmp/fresh.png'])
  })

  it('命中时挂起提示并列出已有资源，取消后该项不入队', async () => {
    const matches = [match(), match({ resource_id: 'resource-2', title: '另一条', location: '/library/photo.png' })]
    const queue = createLibraryAddQueue(createRuntime({ findResourceLocationMatches: async () => matches }))

    const enqueued = queue.enqueueFileLocations(['/tmp/photo.png'])
    await vi.waitFor(() => {
      expect(queue.duplicatePrompt.value).not.toBeNull()
    })
    expect(queue.duplicatePrompt.value).toEqual({ location: '/tmp/photo.png', matches })
    // 提示挂起期间该项尚未入队，其余项也还没轮到。
    expect(queue.queue.value).toEqual([])

    queue.resolveDuplicate(false)
    await enqueued

    expect(queue.duplicatePrompt.value).toBeNull()
    expect(queue.queue.value).toEqual([])
  })

  it('选「仍要添加」时该项照常入队', async () => {
    const queue = createLibraryAddQueue(createRuntime({ findResourceLocationMatches: async () => [match()] }))

    const enqueued = queue.enqueueFileLocations(['/tmp/photo.png'])
    await vi.waitFor(() => {
      expect(queue.duplicatePrompt.value).not.toBeNull()
    })
    queue.resolveDuplicate(true)
    await enqueued

    expect(queue.queue.value.map(item => item.location)).toEqual(['/tmp/photo.png'])
  })

  it('多文件含多个重复时逐项串行弹窗，先命中的先裁决', async () => {
    const prompts: string[] = []
    const queue = createLibraryAddQueue(
      createRuntime({
        findResourceLocationMatches: async location => (location === '/tmp/plain.png' ? [] : [match({ location })])
      })
    )
    // 入队链推进时立刻记录弹出的位置，用来断言串行顺序。
    const enqueued = queue.enqueueFileLocations(['/tmp/first.png', '/tmp/plain.png', '/tmp/second.png'])
    for (let index = 0; index < 2; index += 1) {
      await vi.waitFor(() => {
        expect(queue.duplicatePrompt.value).not.toBeNull()
      })
      prompts.push(queue.duplicatePrompt.value!.location)
      // 第一个重复项选「取消」，第二个选「仍要添加」。
      queue.resolveDuplicate(index > 0)
    }
    await enqueued
    expect(prompts).toEqual(['/tmp/first.png', '/tmp/second.png'])
    // 取消的第一项不入队，未命中的中间项与放行的最后一项照常入队。
    expect(queue.duplicatePrompt.value).toBeNull()
    expect(queue.queue.value.map(item => item.location)).toEqual(['/tmp/plain.png', '/tmp/second.png'])
  })

  it('同一批次内重复出现的位置只弹一次', async () => {
    const findResourceLocationMatches = vi.fn<LibraryRuntime['findResourceLocationMatches']>(async () => [match()])
    const queue = createLibraryAddQueue(createRuntime({ findResourceLocationMatches }))

    const enqueued = queue.enqueueFileLocations(['/tmp/photo.png', '/tmp/photo.png'])
    await vi.waitFor(() => {
      expect(queue.duplicatePrompt.value).not.toBeNull()
    })
    queue.resolveDuplicate(true)
    await enqueued

    expect(findResourceLocationMatches).toHaveBeenCalledTimes(1)
    expect(queue.queue.value.map(item => item.location)).toEqual(['/tmp/photo.png'])
  })

  it('查询失败按未命中处理，项照常入队', async () => {
    const queue = createLibraryAddQueue(
      createRuntime({
        findResourceLocationMatches: async () => {
          throw new Error('查询失败')
        }
      })
    )

    await queue.enqueueFileLocations(['/tmp/photo.png'])

    expect(queue.duplicatePrompt.value).toBeNull()
    expect(queue.queue.value.map(item => item.location)).toEqual(['/tmp/photo.png'])
  })

  it('提示挂起时关闭添加对话框，挂起项按取消结算且不再处理剩余项', async () => {
    const queried: string[] = []
    const queue = createLibraryAddQueue(
      createRuntime({
        findResourceLocationMatches: async location => {
          queried.push(location)
          return [match({ location })]
        }
      })
    )

    const enqueued = queue.enqueueFileLocations(['/tmp/first.png', '/tmp/second.png'])
    await vi.waitFor(() => {
      expect(queue.duplicatePrompt.value).not.toBeNull()
    })
    const closing = queue.close()
    await enqueued
    await closing

    expect(queue.duplicatePrompt.value).toBeNull()
    expect(queue.queue.value).toEqual([])
    // 代次作废后剩余项不再查询，关闭后的对话框不该再弹窗。
    expect(queried).toEqual(['/tmp/first.png'])
  })

  it('查询在途时关闭添加对话框，命中结果不再弹出悬空确认', async () => {
    // 竞态窗口：findResourceLocationMatches 已发出但还没返回，此刻用户关掉了添加对话框。
    // 代次在 close() 里递增，查询返回时必须按取消放行——否则会弹出一个没人认领的确认框，
    // 且入队链会一直挂在 askDuplicate 上等一个永远不会来的裁决。
    let releaseQuery: ((matches: ResourceLocationMatchDTO[]) => void) | null = null
    const queried: string[] = []
    const queue = createLibraryAddQueue(
      createRuntime({
        findResourceLocationMatches: async location => {
          queried.push(location)
          return new Promise<ResourceLocationMatchDTO[]>(resolve => {
            releaseQuery = resolve
          })
        }
      })
    )

    const enqueued = queue.enqueueFileLocations(['/tmp/race.png', '/tmp/never.png'])
    await vi.waitFor(() => {
      expect(releaseQuery).not.toBeNull()
    })

    const closing = queue.close()
    releaseQuery!([match({ location: '/tmp/race.png' })])
    await enqueued
    await closing

    // 关键断言：查询返回了命中，但对话框已经关掉，因此一个提示都不该弹。
    expect(queried).toEqual(['/tmp/race.png'])
    expect(queue.duplicatePrompt.value).toBeNull()
    expect(queue.queue.value).toEqual([])
  })
})
