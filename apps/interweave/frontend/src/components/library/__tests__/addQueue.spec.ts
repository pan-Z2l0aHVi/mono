import { describe, expect, it, vi } from 'vite-plus/test'
import { effect } from 'vue'

import { ResourceLocationMatchDTO } from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import {
  ResourceKind,
  SourceType
} from '../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { LibraryQueueItem, LibraryRuntime } from '../../../services/library'
import { createLibraryAddQueue, queueItemTitle } from '../addQueue'
import { createPreviewLease } from '../previewLease'

// 队列只需要 isAvailable 与 resources 簇；其余能力给最小实现即可。
function createRuntime(
  overrides: Partial<LibraryRuntime['resources']> & { isAvailable?: boolean } = {}
): LibraryRuntime {
  const { isAvailable = true, ...resourceOverrides } = overrides
  return {
    isAvailable,
    resources: {
      list: async () => [],
      get: async () => {
        throw new Error('未使用')
      },
      create: async () => {
        throw new Error('未使用')
      },
      updateTitle: async () => {
        throw new Error('未使用')
      },
      updateNote: async () => {
        throw new Error('未使用')
      },
      remove: async () => {},
      setTags: async () => {
        throw new Error('未使用')
      },
      findLocationMatches: async () => [],
      expandImportEntries: async () => ({ files: [], folders: 0 }),
      prepareFilePreview: async () => ({ kind: ResourceKind.ResourceKindFile }),
      releaseFilePreview: async () => {},
      ...resourceOverrides
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
      refreshSource: async () => {
        throw new Error('未使用')
      },
      replaceSource: async () => {
        throw new Error('未使用')
      },
      probeOnOpen: async () => {
        throw new Error('未使用')
      }
    },
    media: { saveThumbnail: async () => {} },
    events: {
      onFilesDropped: () => () => {},
      onURLsDropped: () => () => {},
      onSourceAvailability: () => () => {},
      onPreviewRevoked: () => () => {}
    },
    system: {
      chooseDirectory: async () => null,
      chooseFilePaths: async () => [],
      chooseFilePath: async () => null,
      getClipboardFilePaths: async () => [],
      readClipboardText: async () => '',
      writeClipboardText: async () => {},
      defaultOpenWith: async () => {
        throw new Error('未使用')
      },
      showInFileManager: async () => {},
      openExternal: async () => {
        throw new Error('未使用')
      },
      setWallpaper: async () => {
        throw new Error('未使用')
      }
    }
  }
}

/** 队列与 lease 是一对：生产里由页面创建 lease 后传入，测试按同一装配方式构造。 */
function createQueue(runtime: LibraryRuntime) {
  return createLibraryAddQueue(runtime, createPreviewLease(runtime))
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe('library add queue pending previews', () => {
  it('入队后使用后端 kind 与完整媒体地址更新预览', async () => {
    const prepareFilePreview = vi.fn<LibraryRuntime['resources']['prepareFilePreview']>(async () => ({
      kind: ResourceKind.ResourceKindImage,
      token: 'opaque-token',
      media_url: '/pending-resource-media/opaque-token'
    }))
    const queue = createQueue(createRuntime({ prepareFilePreview }))

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
    const releaseFilePreview = vi.fn<LibraryRuntime['resources']['releaseFilePreview']>(async () => {})
    const queue = createQueue(
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

  it('移除单项与 releasePreview 释放各自 token', async () => {
    const releaseFilePreview = vi.fn<LibraryRuntime['resources']['releaseFilePreview']>(async () => {})
    const queue = createQueue(
      createRuntime({
        prepareFilePreview: async location => ({
          kind: ResourceKind.ResourceKindImage,
          token: `token-${location}`
        }),
        releaseFilePreview
      })
    )

    await queue.enqueueFileLocations(['/tmp/first.png', '/tmp/second.png'])
    const [first, second] = queue.queue.value
    await Promise.all(queue.queue.value.map(item => queue.waitForPreview(item.id)))
    await queue.removeItem(first!.id)
    await queue.releasePreview(second!.id)

    expect(releaseFilePreview).toHaveBeenCalledTimes(2)
    expect(releaseFilePreview).toHaveBeenCalledWith('token-/tmp/first.png')
    expect(releaseFilePreview).toHaveBeenCalledWith('token-/tmp/second.png')
  })

  it('预览准备完成前移除单项时释放晚到 token', async () => {
    const prepared = deferred<{ kind: ResourceKind.ResourceKindImage; token: string }>()
    const releaseFilePreview = vi.fn<LibraryRuntime['resources']['releaseFilePreview']>(async () => {})
    const queue = createQueue(
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
    const releaseFilePreview = vi.fn<LibraryRuntime['resources']['releaseFilePreview']>(async () => {})
    const queue = createQueue(
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
    const prepareFilePreview = vi.fn<LibraryRuntime['resources']['prepareFilePreview']>()
    const findLocationMatches = vi.fn<LibraryRuntime['resources']['findLocationMatches']>()
    const queue = createQueue(createRuntime({ isAvailable: false, prepareFilePreview, findLocationMatches }))

    await queue.enqueueFileLocations(['/tmp/offline.png'])

    expect(queue.queue.value[0]).toMatchObject({ resourceKind: ResourceKind.ResourceKindFile, mediaUrl: null })
    expect(prepareFilePreview).not.toHaveBeenCalled()
    expect(findLocationMatches).not.toHaveBeenCalled()
  })

  it('后端驱逐旧 token 时 lease 条目消失，渲染回落而非把 404 当成文件丢失', async () => {
    let emitRevoked: ((tokens: string[]) => void) | null = null
    const runtime = createRuntime({
      prepareFilePreview: async location => ({
        kind: ResourceKind.ResourceKindImage,
        token: `token-${location}`,
        media_url: `/media${location}`
      })
    })
    const lease = createPreviewLease({
      ...runtime,
      events: {
        ...runtime.events,
        onPreviewRevoked: listener => {
          emitRevoked = listener
          return () => {
            emitRevoked = null
          }
        }
      }
    })
    const queue = createLibraryAddQueue(runtime, lease)

    await queue.enqueueFileLocations(['/tmp/first.png', '/tmp/second.png'])
    const ids = queue.queue.value.map(item => item.id)
    await Promise.all(ids.map(id => queue.waitForPreview(id)))
    expect(lease.entries.value[ids[0]!]).toMatchObject({ mediaUrl: '/media/tmp/first.png' })

    emitRevoked!(['token-/tmp/first.png'])

    expect(lease.entries.value[ids[0]!]).toBeUndefined()
    expect(lease.entries.value[ids[1]!]).toMatchObject({ mediaUrl: '/media/tmp/second.png' })
    // 队列项上的 token/mediaUrl 只是结算簿记，渲染读 lease.entries，因此这里保留原值。
    expect(queue.queue.value.find(item => item.id === ids[0])?.mediaUrl).toBe('/media/tmp/first.png')
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
    const findLocationMatches = vi.fn<LibraryRuntime['resources']['findLocationMatches']>(async () => [])
    const queue = createQueue(createRuntime({ findLocationMatches }))

    await queue.enqueueFileLocations(['/tmp/fresh.png'])

    expect(findLocationMatches).toHaveBeenCalledWith('/tmp/fresh.png', SourceType.SourceTypeFile)
    expect(queue.duplicatePrompt.value).toBeNull()
    expect(queue.queue.value.map(item => item.location)).toEqual(['/tmp/fresh.png'])
  })

  it('命中时挂起提示并列出已有资源，取消后该项不入队', async () => {
    const matches = [match(), match({ resource_id: 'resource-2', title: '另一条', location: '/library/photo.png' })]
    const queue = createQueue(createRuntime({ findLocationMatches: async () => matches }))

    const enqueued = queue.enqueueFileLocations(['/tmp/photo.png'])
    await vi.waitFor(() => {
      expect(queue.duplicatePrompt.value).not.toBeNull()
    })
    expect(queue.duplicatePrompt.value).toEqual({ kind: 'file', location: '/tmp/photo.png', matches })
    // 提示挂起期间该项尚未入队，其余项也还没轮到。
    expect(queue.queue.value).toEqual([])

    queue.resolveDuplicate(false)
    await enqueued

    expect(queue.duplicatePrompt.value).toBeNull()
    expect(queue.queue.value).toEqual([])
  })

  it('选「仍要添加」时该项照常入队', async () => {
    const queue = createQueue(createRuntime({ findLocationMatches: async () => [match()] }))

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
    const queue = createQueue(
      createRuntime({
        findLocationMatches: async location => (location === '/tmp/plain.png' ? [] : [match({ location })])
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
    const findLocationMatches = vi.fn<LibraryRuntime['resources']['findLocationMatches']>(async () => [match()])
    const queue = createQueue(createRuntime({ findLocationMatches }))

    const enqueued = queue.enqueueFileLocations(['/tmp/photo.png', '/tmp/photo.png'])
    await vi.waitFor(() => {
      expect(queue.duplicatePrompt.value).not.toBeNull()
    })
    queue.resolveDuplicate(true)
    await enqueued

    expect(findLocationMatches).toHaveBeenCalledTimes(1)
    expect(queue.queue.value.map(item => item.location)).toEqual(['/tmp/photo.png'])
  })

  it('同一批次内重复位置的取消裁决延续到后续重复项', async () => {
    const findLocationMatches = vi.fn<LibraryRuntime['resources']['findLocationMatches']>(async () => [match()])
    const queue = createQueue(createRuntime({ findLocationMatches }))

    const enqueued = queue.enqueueFileLocations(['/tmp/photo.png', '/tmp/photo.png'])
    await vi.waitFor(() => {
      expect(queue.duplicatePrompt.value).not.toBeNull()
    })
    queue.resolveDuplicate(false)
    await enqueued

    // 取消过的位置不再查询，也不再弹窗，后续同一位置同样不入队。
    expect(findLocationMatches).toHaveBeenCalledTimes(1)
    expect(queue.duplicatePrompt.value).toBeNull()
    expect(queue.queue.value).toEqual([])
  })

  it('查询失败按未命中处理，项照常入队', async () => {
    const queue = createQueue(
      createRuntime({
        findLocationMatches: async () => {
          throw new Error('查询失败')
        }
      })
    )

    await queue.enqueueFileLocations(['/tmp/photo.png'])

    expect(queue.duplicatePrompt.value).toBeNull()
    expect(queue.queue.value.map(item => item.location)).toEqual(['/tmp/photo.png'])
  })

  it('提示挂起时关闭添加 dialog，挂起项按取消结算且不再处理剩余项', async () => {
    const queried: string[] = []
    const queue = createQueue(
      createRuntime({
        findLocationMatches: async location => {
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
    // 代次作废后剩余项不再查询，关闭后的 dialog 不该再弹窗。
    expect(queried).toEqual(['/tmp/first.png'])
  })

  it('查询在途时关闭添加 dialog，命中结果不再弹出悬空确认', async () => {
    // 竞态窗口：findLocationMatches 已发出但还没返回，此刻用户关掉了添加 dialog。
    // 代次在 close() 里递增，查询返回时必须按取消放行——否则会弹出一个没人认领的确认框，
    // 且入队链会一直挂在 askDuplicate 上等一个永远不会来的裁决。
    let releaseQuery: ((matches: ResourceLocationMatchDTO[]) => void) | null = null
    const queried: string[] = []
    const queue = createQueue(
      createRuntime({
        findLocationMatches: async location => {
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

    // 关键断言：查询返回了命中，但 dialog 已经关掉，因此一个提示都不该弹。
    expect(queried).toEqual(['/tmp/race.png'])
    expect(queue.duplicatePrompt.value).toBeNull()
    expect(queue.queue.value).toEqual([])
  })
})

/*
 * #188：链接入口。
 *
 * 链接项与文件项共用一条入队链，差异集中在三处：重复检查的来源类型、默认资源 kind，
 * 以及不跑本地预览准备。标题留空是有意的——后端会按 hostname 或页面 <title> 定名，
 * 队列里预填的猜测值会在提交时把那个名字覆盖掉。
 */
describe('library add queue url entries', () => {
  it('链接入队为 url 类型，重复检查走 URL 来源且不准备文件预览', async () => {
    const prepareFilePreview = vi.fn<LibraryRuntime['resources']['prepareFilePreview']>()
    const findLocationMatches = vi.fn<LibraryRuntime['resources']['findLocationMatches']>(async () => [])
    const queue = createQueue(createRuntime({ prepareFilePreview, findLocationMatches }))

    await queue.enqueueURL('https://example.com/article')

    expect(findLocationMatches).toHaveBeenCalledWith('https://example.com/article', SourceType.SourceTypeURL)
    expect(prepareFilePreview).not.toHaveBeenCalled()
    expect(queue.queue.value).toHaveLength(1)
    expect(queue.queue.value[0]).toMatchObject({
      kind: 'url',
      resourceKind: ResourceKind.ResourceKindWeb,
      title: '',
      location: 'https://example.com/article',
      previewToken: null,
      mediaUrl: null
    })
  })

  it('链接与文件混排时各自按类型处理，重复位置仍然去重', async () => {
    const findLocationMatches = vi.fn<LibraryRuntime['resources']['findLocationMatches']>(async () => [])
    const queue = createQueue(createRuntime({ findLocationMatches }))

    await queue.enqueueFileLocations(['/tmp/photo.png'])
    await queue.enqueueURL('https://example.com/')
    await queue.enqueueURL('https://example.com/')

    expect(queue.queue.value.map(item => item.kind)).toEqual(['file', 'url'])
    expect(queue.queue.value[0]?.title).toBe('photo')
  })

  it('queueItemTitle 用主机名兜底展示链接项，没有标题的文件项退回位置', () => {
    const base = {
      id: 'q',
      resourceKind: ResourceKind.ResourceKindWeb,
      tags: [],
      previewToken: null,
      mediaUrl: null
    }

    expect(queueItemTitle({ ...base, kind: 'url', title: '', location: 'https://example.com/a/b' })).toBe('example.com')
    expect(queueItemTitle({ ...base, kind: 'url', title: '我改的名字', location: 'https://example.com' })).toBe(
      '我改的名字'
    )
    expect(queueItemTitle({ ...base, kind: 'file', title: '', location: '/tmp/photo.png' })).toBe('/tmp/photo.png')
  })
})

/*
 * 提交循环是 controller 的 implementation 属性：逐项 waitForPreview → create → releasePreview
 * 结算 preview token，全部成功后 close 收尾；失败按 remaining 回卷。页面只保留 dialog 开合
 * 与错误展示，不得自组提交循环。
 */
describe('library add queue submit', () => {
  const LOCATIONS = ['/tmp/first.png', '/tmp/second.png']

  interface SubmitCase {
    name: string
    /** 抛错的项下标；-1 表示全部成功。 */
    failAt: number
    /** 期望的逐项结算序列：每项先 create 再 release，失败的项同样结算。 */
    events: string[]
    /** 期望的返回值；失败时为 undefined 且抛出原因。 */
    result: boolean | undefined
    /** 失败回卷后期望留在队列里的位置。 */
    remainingLocations: string[]
  }

  it.each<SubmitCase>([
    {
      name: '全部成功',
      failAt: -1,
      events: [
        'create:/tmp/first.png',
        'release:token-/tmp/first.png',
        'create:/tmp/second.png',
        'release:token-/tmp/second.png'
      ],
      result: true,
      remainingLocations: []
    },
    {
      name: '首项失败',
      failAt: 0,
      events: ['create:/tmp/first.png', 'release:token-/tmp/first.png'],
      result: undefined,
      remainingLocations: ['/tmp/first.png', '/tmp/second.png']
    },
    {
      name: '第二项失败',
      failAt: 1,
      events: [
        'create:/tmp/first.png',
        'release:token-/tmp/first.png',
        'create:/tmp/second.png',
        'release:token-/tmp/second.png'
      ],
      result: undefined,
      remainingLocations: ['/tmp/second.png']
    }
  ])(
    '$name：token 逐项结算，失败按 remaining 回卷',
    async ({ failAt, events: expectedEvents, result, remainingLocations }) => {
      const events: string[] = []
      const releaseFilePreview = vi.fn<LibraryRuntime['resources']['releaseFilePreview']>(async token => {
        events.push(`release:${token}`)
      })
      const queue = createQueue(
        createRuntime({
          prepareFilePreview: async location => ({ kind: ResourceKind.ResourceKindImage, token: `token-${location}` }),
          releaseFilePreview
        })
      )
      await queue.enqueueFileLocations(LOCATIONS)

      const submittingDuringCreate: boolean[] = []

      const create = vi.fn<(item: LibraryQueueItem) => Promise<void>>(async item => {
        submittingDuringCreate.push(queue.submitting.value)
        events.push(`create:${item.location}`)
        if (item.location === LOCATIONS[failAt]) throw new Error('创建失败')
      })

      let settled: boolean | undefined
      let thrown: unknown
      try {
        settled = await queue.submit(create)
      } catch (cause) {
        thrown = cause
      }

      // 提交中的每一项都发生在 submitting=true 之下，结束后必须复位。
      expect(events).toEqual(expectedEvents)
      expect(submittingDuringCreate.every(Boolean)).toBe(true)
      expect(queue.submitting.value).toBe(false)
      expect(settled).toBe(result)
      expect(thrown).toEqual(failAt >= 0 ? new Error('创建失败') : undefined)
      expect(queue.queue.value.map(item => item.location)).toEqual(remainingLocations)
    }
  )

  it('成功的项回卷后不再留在队列，未处理项保留自己的 preview token', async () => {
    const queue = createQueue(
      createRuntime({
        prepareFilePreview: async location => ({ kind: ResourceKind.ResourceKindImage, token: `token-${location}` }),
        releaseFilePreview: async () => {}
      })
    )
    await queue.enqueueFileLocations(LOCATIONS)
    const items = [...queue.queue.value]

    await expect(
      queue.submit(async item => {
        if (item.location === LOCATIONS[1]) throw new Error('创建失败')
      })
    ).rejects.toThrow('创建失败')

    // 首项已成功并被移出队列；次项失败后保留，它的 token 已在 finally 里结算完毕。
    expect(queue.queue.value.map(item => item.id)).toEqual([items[1]!.id])
    expect(queue.queue.value[0]?.previewToken).toBeNull()
  })

  it('空队列直接返回 false，不调 create 也不进入 submitting', async () => {
    const create = vi.fn<(item: LibraryQueueItem) => Promise<void>>(async () => {})
    const queue = createQueue(createRuntime())

    expect(await queue.submit(create)).toBe(false)
    expect(create).not.toHaveBeenCalled()
    expect(queue.submitting.value).toBe(false)
  })

  it('提交进行中重复 submit 被拒，不影响在途提交', async () => {
    const gate = deferred<void>()
    const created: string[] = []
    const queue = createQueue(createRuntime())
    await queue.enqueueFileLocations([LOCATIONS[0]!])

    const first = queue.submit(async item => {
      created.push(item.location)
      await gate.promise
    })
    expect(await queue.submit(async () => {})).toBe(false)
    gate.resolve()
    expect(await first).toBe(true)

    expect(created).toEqual([LOCATIONS[0]!])
    expect(queue.submitting.value).toBe(false)
  })
})

/*
 * progress 供加载中的按钮直接展示「已处理 / 总数」。入队链与提交循环不重叠
 * （提交前入队链必然已结束），因此共用一个 ref。
 */
describe('library add queue progress', () => {
  it('入队链按已消费位置推进，空串与重复跳过也计入进度', async () => {
    const queue = createQueue(createRuntime())

    await queue.enqueueFileLocations(['/tmp/a.png', '', '/tmp/b.png', '/tmp/a.png'])

    expect(queue.progress.value).toEqual({ done: 4, total: 4 })
    expect(queue.queue.value).toHaveLength(2)
  })

  it('提交按已落库项推进进度', async () => {
    const queue = createQueue(createRuntime())
    await queue.enqueueFileLocations(['/tmp/a.png', '/tmp/b.png'])

    const gates = [deferred<void>(), deferred<void>()]
    let call = 0
    const submitted = queue.submit(() => gates[call++]!.promise)
    // submit 先等入队链收尾，进度重置发生在链结算之后。
    await vi.waitFor(() => expect(queue.progress.value).toEqual({ done: 0, total: 2 }))

    gates[0]!.resolve()
    await vi.waitFor(() => expect(queue.progress.value).toEqual({ done: 1, total: 2 }))
    gates[1]!.resolve()
    expect(await submitted).toBe(true)
    expect(queue.progress.value).toEqual({ done: 2, total: 2 })
  })

  it('失败项不计入已导入进度，进度停在成功数', async () => {
    const queue = createQueue(createRuntime())
    await queue.enqueueFileLocations(['/tmp/first.png', '/tmp/second.png'])

    await expect(
      queue.submit(async item => {
        if (item.location === '/tmp/first.png') throw new Error('创建失败')
      })
    ).rejects.toThrow('创建失败')

    expect(queue.progress.value).toEqual({ done: 0, total: 2 })
  })
})

describe('library add queue reactivity', () => {
  it('索引写入经响应式代理：改名、标签与预览回填都会触发依赖', async () => {
    const prepare = deferred<{ kind: ResourceKind; token: string; media_url: string }>()
    const queue = createQueue(createRuntime({ prepareFilePreview: () => prepare.promise }))
    await queue.enqueueFileLocations(['/tmp/a.png'])
    const itemId = queue.queue.value[0]!.id

    const snapshots: string[] = []
    // 无 scheduler 的 effect 默认同步执行，写入会立即重新跑一遍。
    const stop = effect(() => {
      const item = queue.queue.value[0]
      snapshots.push(`${item?.title}|${item?.tags.join('+')}|${item?.mediaUrl ?? '-'}`)
    })
    queue.renameItem(itemId, 'renamed')
    queue.setItemTags(itemId, ['work', 'draft'])
    prepare.resolve({
      kind: ResourceKind.ResourceKindImage,
      token: 'opaque-token',
      media_url: '/pending-resource-media/opaque-token'
    })
    await queue.waitForPreview(itemId)
    stop()

    // push 会把入参 toRaw 落盘，索引若存原始对象，这三类更新都不会触发上面的 effect。
    expect(snapshots[0]).toBe('a||-')
    expect(snapshots.at(-1)).toBe('renamed|work+draft|/pending-resource-media/opaque-token')
  })
})

describe('library add queue submit ordering', () => {
  it('提交先等入队链收尾：链上剩余位置全部入队后才结算快照', async () => {
    // 只拖住第一次重复检查：入队链未收尾时点提交，链放行后剩余项也应进入提交快照。
    let release!: () => void
    const firstLookup = new Promise<void>(resolve => {
      release = resolve
    })
    let first = true
    const queue = createQueue(
      createRuntime({
        findLocationMatches: async () => {
          if (first) {
            first = false
            await firstLookup
            return []
          }
          return []
        }
      })
    )
    void queue.enqueueFileLocations(['/tmp/a.png', '/tmp/b.png', '/tmp/c.png'])
    await flushChain()
    expect(queue.queue.value).toHaveLength(0) // 首项被 gate 拖住，队列还是空的

    // 首项 create 拖住不结算：快照结算后的中间态才能被稳定观察到（否则一轮微任务就跑完整批）。
    const held = deferred<void>()
    const created: string[] = []
    const submitted = queue.submit(async item => {
      created.push(item.location)
      await held.promise
    })
    await flushChain()
    expect(created).toEqual([]) // 链未收尾，提交尚未开始

    release() // 放行首项；剩余两项的重复检查立即返回
    // 链放行后三项全部入队，提交按完整队列开始处理：快照包含点提交之后才入队的项。
    await vi.waitFor(() => expect(created).toEqual(['/tmp/a.png']))
    expect(queue.queue.value.map(item => item.location)).toEqual(['/tmp/a.png', '/tmp/b.png', '/tmp/c.png'])

    held.resolve()
    expect(await submitted).toBe(true)
    expect(created).toEqual(['/tmp/a.png', '/tmp/b.png', '/tmp/c.png'])
    expect(queue.progress.value).toEqual({ done: 3, total: 3 })
    expect(queue.submitting.value).toBe(false)
  })
})

/** 等入队链微任务尘埃落定：连续数轮 microtask 排空后链到达稳定状态。 */
async function flushChain() {
  for (let i = 0; i < 12; i++) await Promise.resolve()
}
