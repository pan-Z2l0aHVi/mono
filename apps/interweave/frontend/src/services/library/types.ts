import type {
  FilePreviewDTO,
  ResourceDTO,
  SourceDTO,
  SourceProbeResultDTO,
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
  probeURLSourceOnOpen(sourceId: string): Promise<SourceProbeResultDTO>
  openExternal(target: string): Promise<void>
  resourceMediaURL(sourceId: string): string | null
  pendingFilePreviewURL(token: string): string | null
  subscribeToDroppedFiles(listener: (paths: string[]) => void): () => void
  subscribeToPasteFileRequest(listener: () => void): () => void
  subscribeToSourceAvailability(listener: (event: SourceAvailabilityEventDTO) => void): () => void
}

/**
 * 可用性翻转的推送载荷，与 Go 侧 service.SourceAvailabilityEventDTO 一一对应。
 *
 * 只推 file source：URL 没有目录监听，其可用性由打开时探测走返回值回流。
 * size_bytes 只在翻转的正是该 Resource 的首选 file source 时有值——size 由首选
 * source 派生，带上它可以让前端不必为刷新一个数字再往返一次。
 */
export interface SourceAvailabilityEventDTO {
  source_id: string
  resource_id: string
  type: string
  available: boolean
  size_bytes?: number
  changed_at: number
}

/**
 * 事件载荷守卫。抽成纯函数是为了能在 Node 环境单测，不必拉起 Wails runtime；
 * 畸形载荷必须静默忽略而不是抛出去——推送不可信，一行坏数据不该打断列表。
 */
export function isSourceAvailabilityEvent(value: unknown): value is SourceAvailabilityEventDTO {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const event = value as Record<string, unknown>
  if (typeof event.source_id !== 'string' || !event.source_id) return false
  if (typeof event.resource_id !== 'string' || !event.resource_id) return false
  if (typeof event.type !== 'string') return false
  if (typeof event.available !== 'boolean') return false
  if (typeof event.changed_at !== 'number') return false
  // size_bytes 缺省即「这次翻转与 size 无关」，有值时必须是数字。
  if (event.size_bytes !== undefined && event.size_bytes !== null && typeof event.size_bytes !== 'number') return false
  return true
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

export function requireSourceProbeResultDTO(value: SourceProbeResultDTO | null, action: string): SourceProbeResultDTO {
  if (value) return value
  throw new Error(`${action}未返回结果`)
}

export function requireTagDTO(value: TagDTO | null, action: string): TagDTO {
  if (value) return value
  throw new Error(`${action}未返回 Tag`)
}
