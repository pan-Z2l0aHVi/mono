import type {
  FilePreviewDTO,
  ResourceDTO,
  SourceDTO,
  TagDTO
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import type { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

export interface LibraryRuntime {
  readonly isAvailable: boolean
  listResources(): Promise<ResourceDTO[]>
  getResource(resourceId: string): Promise<ResourceDTO>
  addFileResource(inputPath: string): Promise<ResourceDTO>
  addURLResource(inputURL: string): Promise<ResourceDTO>
  updateResourceTitle(resourceId: string, newTitle: string): Promise<ResourceDTO>
  deleteResource(resourceId: string): Promise<void>
  addTag(resourceId: string, tagName: string): Promise<TagDTO>
  removeTag(resourceId: string, tagId: string): Promise<void>
  refreshURLSource(sourceId: string): Promise<SourceDTO>
  refreshFileSource(sourceId: string): Promise<SourceDTO>
  replaceFileSource(sourceId: string, inputPath: string): Promise<SourceDTO>
  replaceURLSource(sourceId: string, inputURL: string): Promise<SourceDTO>
  chooseFilePaths(): Promise<string[]>
  chooseFilePath(): Promise<string | null>
  getClipboardFilePaths(): Promise<string[]>
  prepareFilePreview(inputPath: string): Promise<FilePreviewDTO>
  releaseFilePreview(token: string): Promise<void>
  openExternal(target: string): Promise<void>
  resourceMediaURL(sourceId: string): string | null
  pendingFilePreviewURL(token: string): string | null
  subscribeToDroppedFiles(listener: (paths: string[]) => void): () => void
  subscribeToPasteFileRequest(listener: () => void): () => void
}

export interface LibraryQueueItem {
  id: string
  kind: 'file' | 'url'
  resourceKind: ResourceKind
  title: string
  location: string
  tags: string[]
  previewToken: string | null
  mediaUrl: string | null
}

export function requireFilePreviewDTO(value: FilePreviewDTO | null, action: string): FilePreviewDTO {
  if (value) return value
  throw new Error(`${action}未返回文件预览`)
}

export function requireResourceDTO(value: ResourceDTO | null, action: string): ResourceDTO {
  if (value) return value
  throw new Error(`${action}未返回 Resource`)
}

export function requireSourceDTO(value: SourceDTO | null, action: string): SourceDTO {
  if (value) return value
  throw new Error(`${action}未返回 Source`)
}

export function requireTagDTO(value: TagDTO | null, action: string): TagDTO {
  if (value) return value
  throw new Error(`${action}未返回 Tag`)
}
