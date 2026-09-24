import { Dialogs } from '@wailsio/runtime'

import {
  ResourceService,
  SourceService,
  TagService
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'

import { requireResourceDTO, requireSourceDTO, requireTagDTO, type LibraryRuntime } from './types'

class WailsLibraryRuntime implements LibraryRuntime {
  readonly kind = 'wails' as const

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
