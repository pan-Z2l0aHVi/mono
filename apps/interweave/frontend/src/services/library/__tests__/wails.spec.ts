// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

/*
 * Wails 适配器的接线面（G1，第一优先）：
 * - Dialogs.OpenFile 的选项形状与三种返回形态（数组 / 单值 / 空选）的归一；
 * - media.saveThumbnail 的 POST + `Content-Type: image/jpeg`（桌面回填缩略图的传输契约）；
 * - Events.On 的注册名与畸形载荷静默丢弃；没有桥接（isAvailable=false）时返回空 disposer、
 *   不注册任何监听；
 * - null-DTO → throw（require* 守卫在本适配器上的落点）；
 * - 桌面剪贴板传输路径（D1）：OSService 三个剪贴板调用的透传。
 * bindings 的 Go 侧行为不在这里验：mock 只负责「桥接返回什么」，适配器验「接线对不对」。
 */

// vi.mock 会被提升到文件顶：工厂里引用的桩必须经 vi.hoisted 声明。
const { dialogsOpenFile, eventsOn, resourceService, sourceService, tagService, osService, hasWailsRuntime } =
  vi.hoisted(() => ({
    dialogsOpenFile: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
    eventsOn: vi.fn<(name: string, callback: unknown) => () => void>(),
    resourceService: {
      GetResource: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      CreateResource: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      UpdateResourceTitle: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      UpdateResourceNote: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      DeleteResource: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      FindResourceLocationMatches: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      PrepareFilePreview: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      ReleaseFilePreview: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      ListResources: vi.fn<(...args: unknown[]) => Promise<unknown>>()
    },
    sourceService: {
      RefreshSource: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      ReplaceSource: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      StartRecoveryScan: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      PollRecoveryScan: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      CancelRecoveryScan: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      DiscardRecoveryScan: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      ReplaceScannedFileSource: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      ProbeURLSourceOnOpen: vi.fn<(...args: unknown[]) => Promise<unknown>>()
    },
    tagService: { SetResourceTags: vi.fn<(...args: unknown[]) => Promise<unknown>>() },
    osService: {
      GetClipboardFilePaths: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      ReadClipboardText: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      WriteClipboardText: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      DefaultOpenWith: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      ShowInFileManager: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
      OpenExternal: vi.fn<(...args: unknown[]) => Promise<unknown>>()
    },
    hasWailsRuntime: vi.fn<() => boolean>(() => true)
  }))

vi.mock('@wailsio/runtime', async importOriginal => ({
  // bindings 的 models.ts 也从 runtime 取 Create 等工具：保留原实现，只换掉本 spec 的两个接缝。
  ...(await importOriginal<object>()),
  Dialogs: { OpenFile: (...args: unknown[]) => dialogsOpenFile(...args) },
  Events: { On: (name: string, callback: unknown) => eventsOn(name, callback) }
}))

vi.mock('../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service', () => ({
  ResourceService: resourceService,
  SourceService: sourceService,
  TagService: tagService
}))
vi.mock('../../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/native/service', () => ({
  OSService: osService
}))
vi.mock('../../runtime', () => ({ hasWailsRuntime: () => hasWailsRuntime() }))

import { createWailsLibraryRuntime } from '../wails'

const RESOURCE_DTO = { id: 'r-1' }

function runtime(available = true) {
  hasWailsRuntime.mockReturnValue(available)
  return createWailsLibraryRuntime()
}

beforeEach(() => {
  eventsOn.mockImplementation((_name: string, _callback: unknown) => {
    const disposer = vi.fn<() => void>()
    return disposer
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('system 选择对话框', () => {
  it('chooseFilePaths 请求多选文件，三种返回形态都归一成数组', async () => {
    const rt = runtime()

    dialogsOpenFile.mockResolvedValueOnce(['/a.txt', '/b.txt'])
    await expect(rt.system.chooseFilePaths()).resolves.toEqual(['/a.txt', '/b.txt'])
    expect(dialogsOpenFile).toHaveBeenCalledWith({
      Title: '选择要导入的文件',
      CanChooseFiles: true,
      CanChooseDirectories: false,
      AllowsMultipleSelection: true
    })

    dialogsOpenFile.mockResolvedValueOnce('/only.txt')
    await expect(rt.system.chooseFilePaths()).resolves.toEqual(['/only.txt'])

    dialogsOpenFile.mockResolvedValueOnce(null)
    await expect(rt.system.chooseFilePaths()).resolves.toEqual([])
  })

  it('chooseFilePath 请求单选文件，数组取首个，空选回 null', async () => {
    const rt = runtime()

    dialogsOpenFile.mockResolvedValueOnce(['/replacement.txt'])
    await expect(rt.system.chooseFilePath()).resolves.toBe('/replacement.txt')
    expect(dialogsOpenFile).toHaveBeenCalledWith(
      expect.objectContaining({ AllowsMultipleSelection: false, CanChooseDirectories: false })
    )

    dialogsOpenFile.mockResolvedValueOnce([])
    await expect(rt.system.chooseFilePath()).resolves.toBeNull()

    dialogsOpenFile.mockResolvedValueOnce(null)
    await expect(rt.system.chooseFilePath()).resolves.toBeNull()
  })

  it('chooseDirectory 请求目录而不是文件', async () => {
    const rt = runtime()
    dialogsOpenFile.mockResolvedValueOnce('/scan/dir')
    await expect(rt.system.chooseDirectory()).resolves.toBe('/scan/dir')
    expect(dialogsOpenFile).toHaveBeenCalledWith(
      expect.objectContaining({ CanChooseFiles: false, CanChooseDirectories: true, AllowsMultipleSelection: false })
    )
  })
})

describe('media.saveThumbnail', () => {
  it('POST jpeg Blob 到缩略图 URL，Content-Type 是 image/jpeg', async () => {
    const rt = runtime()
    const fetchMock = vi.fn<() => Promise<{ ok: boolean; status: number }>>(async () => ({ ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const jpeg = new Blob(['jpeg-bytes'], { type: 'image/jpeg' })

    await rt.media.saveThumbnail('/resource-thumbnail/r-1', jpeg)

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/resource-thumbnail/r-1', {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: jpeg
    })
  })

  it('非 2xx 抛出带状态码的错误', async () => {
    const rt = runtime()
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<{ ok: boolean; status: number }>>(async () => ({ ok: false, status: 500 }))
    )

    await expect(rt.media.saveThumbnail('/resource-thumbnail/r-1', new Blob([]))).rejects.toThrow('保存缩略图失败：500')
  })
})

describe('events 接线与 isAvailable 门控', () => {
  it('没有桥接时不注册任何监听，返回空 disposer', () => {
    const rt = runtime(false)
    const disposer = rt.events.onFilesDropped(() => {})
    expect(eventsOn).not.toHaveBeenCalled()
    expect(() => disposer()).not.toThrow()
  })

  it('onFilesDropped 注册到正确的事件名，字符串数组载荷送达，畸形载荷静默丢弃', () => {
    const rt = runtime(true)
    const listener = vi.fn<(paths: string[]) => void>()
    rt.events.onFilesDropped(listener)

    expect(eventsOn).toHaveBeenCalledExactlyOnceWith('library:files-dropped', expect.any(Function))
    const callback = eventsOn.mock.calls[0]![1] as (event: { data: unknown }) => void

    callback({ data: ['/a.txt', '/b.txt'] })
    expect(listener).toHaveBeenCalledExactlyOnceWith(['/a.txt', '/b.txt'])

    listener.mockClear()
    callback({ data: 'not-an-array' })
    callback({ data: [42] })
    expect(listener, '畸形载荷必须静默丢弃').not.toHaveBeenCalled()
  })

  it('onSourceAvailability / onPreviewRevoked 走各自的守卫，畸形载荷静默丢弃', () => {
    const rt = runtime(true)
    const availability = vi.fn<(update: unknown) => void>()
    const revoked = vi.fn<(tokens: string[]) => void>()
    rt.events.onSourceAvailability(availability)
    rt.events.onPreviewRevoked(revoked)

    expect(eventsOn).toHaveBeenCalledWith('library:source-availability-changed', expect.any(Function))
    expect(eventsOn).toHaveBeenCalledWith('library:previews-revoked', expect.any(Function))

    const availabilityCallback = eventsOn.mock.calls.find(
      ([name]) => name === 'library:source-availability-changed'
    )![1] as (event: { data: unknown }) => void
    availabilityCallback({
      data: { source_id: 's-1', resource_id: 'r-1', type: 'file', available: true, changed_at: 1 }
    })
    expect(availability).toHaveBeenCalledTimes(1)
    availabilityCallback({ data: { broken: true } })
    expect(availability).toHaveBeenCalledTimes(1)

    const revokedCallback = eventsOn.mock.calls.find(([name]) => name === 'library:previews-revoked')![1] as (event: {
      data: unknown
    }) => void
    revokedCallback({ data: ['token-1'] })
    expect(revoked).toHaveBeenCalledExactlyOnceWith(['token-1'])
    revokedCallback({ data: [''] })
    expect(revoked).toHaveBeenCalledTimes(1)
  })

  it('Events.On 返回的 disposer 原样透传给调用方', () => {
    const rt = runtime(true)
    const disposer = vi.fn<() => void>()
    eventsOn.mockReturnValueOnce(disposer)
    const returned = rt.events.onFilesDropped(() => {})
    expect(returned).toBe(disposer)
  })
})

describe('null-DTO 守卫', () => {
  it('GetResource 返回 null 时带动作名抛错', async () => {
    const rt = runtime()
    resourceService.GetResource.mockResolvedValueOnce(null)
    await expect(rt.resources.get('r-1')).rejects.toThrow('读取资源没有完成，请重试')
  })

  it('PollRecoveryScan 返回 null 时抛错', async () => {
    const rt = runtime()
    sourceService.PollRecoveryScan.mockResolvedValueOnce(null)
    await expect(rt.sources.pollRecoveryScan('scan-1')).rejects.toThrow('读取扫描进度未返回结果')
  })

  it('正常 DTO 原样返回', async () => {
    const rt = runtime()
    resourceService.GetResource.mockResolvedValueOnce(RESOURCE_DTO)
    await expect(rt.resources.get('r-1')).resolves.toBe(RESOURCE_DTO)
  })
})

describe('桌面剪贴板传输路径（D1）', () => {
  it('三个剪贴板调用透传到 OSService', async () => {
    const rt = runtime()
    osService.GetClipboardFilePaths.mockResolvedValueOnce(['/clip.txt'])
    osService.ReadClipboardText.mockResolvedValueOnce('clip-text')
    osService.WriteClipboardText.mockResolvedValueOnce(undefined)

    await expect(rt.system.getClipboardFilePaths()).resolves.toEqual(['/clip.txt'])
    await expect(rt.system.readClipboardText()).resolves.toBe('clip-text')
    await expect(rt.system.writeClipboardText('text')).resolves.toBeUndefined()
    expect(osService.GetClipboardFilePaths).toHaveBeenCalledTimes(1)
    expect(osService.ReadClipboardText).toHaveBeenCalledTimes(1)
    expect(osService.WriteClipboardText).toHaveBeenCalledWith('text')
  })
})
