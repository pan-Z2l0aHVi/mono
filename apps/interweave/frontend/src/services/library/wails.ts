import { Dialogs, Events } from '@wailsio/runtime'

import {
  LibraryFilesDropped,
  LibraryPasteFilesRequested,
  LibrarySourceAvailabilityChanged
} from '../../../bindings/events'
import {
  ResourceService,
  SourceService,
  TagService,
  type CreateResourceInputDTO
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import type { SourceType } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import { OSService } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/native/service'

import {
  isSourceAvailabilityEvent,
  requireFilePreviewDTO,
  requireResourceDTO,
  requireSourceProbeResultDTO,
  type LibraryRuntime,
  type SourceAvailabilityEventDTO
} from './types'

class WailsLibraryRuntime implements LibraryRuntime {
  readonly isAvailable = hasWailsRuntime()

  readonly resources = {
    list: () => ResourceService.ListResources(),
    get: async (resourceId: string) => requireResourceDTO(await ResourceService.GetResource(resourceId), '读取资源'),
    create: async (input: CreateResourceInputDTO) =>
      requireResourceDTO(await ResourceService.CreateResource(input), '创建资源'),
    updateTitle: async (resourceId: string, newTitle: string) =>
      requireResourceDTO(await ResourceService.UpdateResourceTitle(resourceId, newTitle), '更新资源名称'),
    updateNote: async (resourceId: string, note: string) =>
      requireResourceDTO(await ResourceService.UpdateResourceNote(resourceId, note), '更新资源备注'),
    remove: async (resourceId: string) => {
      await ResourceService.DeleteResource(resourceId)
    },
    setTags: async (resourceId: string, tagNames: string[]) =>
      requireResourceDTO(await TagService.SetResourceTags(resourceId, tagNames), '保存标签'),
    findLocationMatches: (input: string, sourceType: SourceType) =>
      ResourceService.FindResourceLocationMatches(input, sourceType),
    prepareFilePreview: async (inputPath: string) =>
      requireFilePreviewDTO(await ResourceService.PrepareFilePreview(inputPath), '准备文件预览'),
    releaseFilePreview: async (token: string) => {
      await ResourceService.ReleaseFilePreview(token)
    }
  }

  readonly sources = {
    refreshURL: async (sourceId: string) =>
      requireResourceDTO(await SourceService.RefreshURLSource(sourceId), '检查网页链接'),
    refreshFile: async (sourceId: string) =>
      requireResourceDTO(await SourceService.RefreshFileSource(sourceId), '检查文件'),
    replaceFile: async (sourceId: string, inputPath: string) =>
      requireResourceDTO(await SourceService.ReplaceFileSource(sourceId, inputPath), '更新文件位置'),
    startRecoveryScan: (sourceIds: string[], directory: string) =>
      SourceService.StartRecoveryScan(sourceIds, directory),
    pollRecoveryScan: async (scanId: string) => {
      const result = await SourceService.PollRecoveryScan(scanId)
      if (!result) throw new Error('读取扫描进度未返回结果')
      return result
    },
    cancelRecoveryScan: async (scanId: string) => {
      await SourceService.CancelRecoveryScan(scanId)
    },
    discardRecoveryScan: async (scanId: string) => {
      await SourceService.DiscardRecoveryScan(scanId)
    },
    replaceScannedFile: async (sourceId: string, path: string, snapshot: string) =>
      requireResourceDTO(await SourceService.ReplaceScannedFileSource(sourceId, path, snapshot), '更新文件位置'),
    replaceURL: async (sourceId: string, inputURL: string) =>
      requireResourceDTO(await SourceService.ReplaceURLSource(sourceId, inputURL), '更新网页链接'),
    probeOnOpen: async (sourceId: string) =>
      requireSourceProbeResultDTO(await SourceService.ProbeURLSourceOnOpen(sourceId), '检查网页链接')
  }

  readonly media = {
    saveThumbnail: async (thumbnailUrl: string, jpeg: Blob) => {
      const response = await fetch(thumbnailUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: jpeg
      })
      if (!response.ok) throw new Error(`保存缩略图失败：${response.status}`)
    }
  }

  readonly events = {
    // 没有桥接时 Events.On 无处注册；返回空 disposer 让调用方不必重复判空。
    onFilesDropped: (listener: (paths: string[]) => void) => {
      if (!this.isAvailable) return () => {}
      return Events.On(LibraryFilesDropped, event => {
        if (Array.isArray(event.data) && event.data.every(path => typeof path === 'string')) {
          listener(event.data)
        }
      })
    },
    onPasteFilesRequested: (listener: () => void) => {
      if (!this.isAvailable) return () => {}
      return Events.On(LibraryPasteFilesRequested, listener)
    },
    onSourceAvailability: (listener: (event: SourceAvailabilityEventDTO) => void) => {
      if (!this.isAvailable) return () => {}
      return Events.On(LibrarySourceAvailabilityChanged, event => {
        if (isSourceAvailabilityEvent(event.data)) listener(event.data)
      })
    }
  }

  readonly system = {
    chooseFilePaths: async () => {
      const selected = await Dialogs.OpenFile({
        Title: '选择要添加的文件',
        CanChooseFiles: true,
        CanChooseDirectories: false,
        AllowsMultipleSelection: true
      })
      if (Array.isArray(selected)) return selected
      return selected ? [selected] : []
    },
    chooseFilePath: async () => {
      const selected = await Dialogs.OpenFile({
        Title: '选择替换后的文件',
        CanChooseFiles: true,
        CanChooseDirectories: false,
        AllowsMultipleSelection: false
      })
      if (Array.isArray(selected)) return selected[0] ?? null
      return selected ?? null
    },
    chooseDirectory: async () => {
      const selected = await Dialogs.OpenFile({
        Title: '选择扫描文件夹',
        CanChooseFiles: false,
        CanChooseDirectories: true,
        AllowsMultipleSelection: false
      })
      if (Array.isArray(selected)) return selected[0] ?? null
      return selected ?? null
    },
    getClipboardFilePaths: () => OSService.GetClipboardFilePaths(),
    defaultOpenWith: (target: string) => OSService.DefaultOpenWith(target),
    showInFileManager: async (path: string) => {
      await OSService.ShowInFileManager(path)
    },
    openExternal: async (target: string) => {
      await OSService.OpenExternal(target)
    }
  }
}

interface WailsWindow {
  _wails?: {
    environment?: {
      OS?: string
      Arch?: string
    }
  }
}

export function hasWailsRuntime(): boolean {
  if (typeof window === 'undefined') return false
  const environment = (window as Window & WailsWindow)._wails?.environment
  return typeof environment?.OS === 'string' && typeof environment.Arch === 'string'
}

export function createWailsLibraryRuntime(): LibraryRuntime {
  return new WailsLibraryRuntime()
}
