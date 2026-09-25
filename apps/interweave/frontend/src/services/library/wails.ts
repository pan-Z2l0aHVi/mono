import { Dialogs, Events } from '@wailsio/runtime'

import {
  ResourceService,
  SourceService,
  TagService
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import { OSService } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/native/service'

import {
  isSourceAvailabilityEvent,
  requireFilePreviewDTO,
  requireResourceDTO,
  requireSourceDTO,
  requireSourceProbeResultDTO,
  requireTagDTO,
  type LibraryRuntime,
  type SourceAvailabilityEventDTO
} from './types'

class WailsLibraryRuntime implements LibraryRuntime {
  readonly isAvailable = hasWailsRuntime()

  async listResources() {
    return ResourceService.ListResources()
  }

  async getResource(resourceId: string) {
    return requireResourceDTO(await ResourceService.GetResource(resourceId), '读取 Resource')
  }

  async addFileResource(inputPath: string) {
    return requireResourceDTO(await ResourceService.AddFileResource(inputPath), '添加文件 Resource')
  }

  async addURLResource(inputURL: string) {
    return requireResourceDTO(await ResourceService.AddURLResource(inputURL), '添加 URL Resource')
  }

  async updateResourceTitle(resourceId: string, newTitle: string) {
    return requireResourceDTO(await ResourceService.UpdateResourceTitle(resourceId, newTitle), '更新 Resource 标题')
  }

  async deleteResource(resourceId: string) {
    await ResourceService.DeleteResource(resourceId)
  }

  async addTag(resourceId: string, tagName: string) {
    return requireTagDTO(await TagService.AddTagToResource(resourceId, tagName), '添加标签')
  }

  async removeTag(resourceId: string, tagId: string) {
    await TagService.RemoveTagFromResource(resourceId, tagId)
  }

  async refreshURLSource(sourceId: string) {
    return requireSourceDTO(await SourceService.RefreshURLSource(sourceId), '刷新 URL Source')
  }

  async refreshFileSource(sourceId: string) {
    return requireSourceDTO(await SourceService.RefreshFileSource(sourceId), '刷新文件 Source')
  }

  async replaceFileSource(sourceId: string, inputPath: string) {
    return requireSourceDTO(await SourceService.ReplaceFileSource(sourceId, inputPath), '替换文件 Source')
  }

  async replaceURLSource(sourceId: string, inputURL: string) {
    return requireSourceDTO(await SourceService.ReplaceURLSource(sourceId, inputURL), '替换 URL Source')
  }

  async chooseFilePaths() {
    const selected = await Dialogs.OpenFile({
      Title: '选择要添加的文件',
      CanChooseFiles: true,
      CanChooseDirectories: false,
      AllowsMultipleSelection: true
    })
    if (Array.isArray(selected)) return selected
    return selected ? [selected] : []
  }

  async chooseFilePath() {
    const selected = await Dialogs.OpenFile({
      Title: '选择替换后的文件',
      CanChooseFiles: true,
      CanChooseDirectories: false,
      AllowsMultipleSelection: false
    })
    if (Array.isArray(selected)) return selected[0] ?? null
    return selected ?? null
  }

  async getClipboardFilePaths() {
    return OSService.GetClipboardFilePaths()
  }

  async prepareFilePreview(inputPath: string) {
    return requireFilePreviewDTO(await ResourceService.PrepareFilePreview(inputPath), '准备文件预览')
  }

  async releaseFilePreview(token: string) {
    await ResourceService.ReleaseFilePreview(token)
  }

  async probeURLSourceOnOpen(sourceId: string) {
    return requireSourceProbeResultDTO(await SourceService.ProbeURLSourceOnOpen(sourceId), '探测 URL Source')
  }

  async openExternal(target: string) {
    await OSService.OpenExternal(target)
  }

  resourceMediaURL(sourceId: string) {
    return `/resource-media/${encodeURIComponent(sourceId)}`
  }

  pendingFilePreviewURL(token: string) {
    return `/pending-resource-media/${encodeURIComponent(token)}`
  }

  subscribeToDroppedFiles(listener: (paths: string[]) => void) {
    return Events.On('library:files-dropped', event => {
      if (Array.isArray(event.data) && event.data.every(path => typeof path === 'string')) {
        listener(event.data)
      }
    })
  }

  subscribeToPasteFileRequest(listener: () => void) {
    return Events.On('library:paste-files-requested', listener)
  }

  subscribeToSourceAvailability(listener: (event: SourceAvailabilityEventDTO) => void) {
    return Events.On('library:source-availability-changed', event => {
      if (isSourceAvailabilityEvent(event.data)) listener(event.data)
    })
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
