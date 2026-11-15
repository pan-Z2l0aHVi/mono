import type { RecoveryScanUpdate } from '@/components/library/restore'

import type {
  CreateResourceInputDTO,
  FilePreviewDTO,
  ResourceDTO,
  ResourceLocationMatchDTO,
  SourceAvailabilityEventDTO,
  SourceProbeResultDTO
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import type {
  ResourceKind,
  SourceType
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

/**
 * 可用性翻转的推送载荷。类型直接取生成绑定，事件名与字段名因此只有 Go 一份源。
 *
 * 只推 file source：URL 没有目录监听，其可用性由打开时探测走返回值回流。
 * size_bytes 只在翻转的正是该 Resource 的首选 file source 时有值——size 由首选
 * source 派生，带上它可以让前端不必为刷新一个数字再往返一次。
 */
export type { SourceAvailabilityEventDTO }

/** Resource 本体的读写与标签集合；纳入新 Resource 的唯一入口也在这里。 */
export interface LibraryResourceCapabilities {
  list(): Promise<ResourceDTO[]>
  get(resourceId: string): Promise<ResourceDTO>
  /** 归一化、可用性探测与初始标签由后端单事务建齐。 */
  create(input: CreateResourceInputDTO): Promise<ResourceDTO>
  updateTitle(resourceId: string, newTitle: string): Promise<ResourceDTO>
  updateNote(resourceId: string, note: string): Promise<ResourceDTO>
  remove(resourceId: string): Promise<void>
  /** 替换式集合语义：提交的名称集合成为该 Resource 的完整标签集合，规则在后端。 */
  setTags(resourceId: string, tagNames: string[]): Promise<ResourceDTO>
  findLocationMatches(input: string, sourceType: SourceType): Promise<ResourceLocationMatchDTO[]>
  /** 本地文件预览；DTO.media_url 是可直接渲染的临时地址。 */
  prepareFilePreview(inputPath: string): Promise<FilePreviewDTO>
  releaseFilePreview(token: string): Promise<void>
}

/**
 * 单个入口的刷新与替换：直接回传变更后的完整 Resource 视图，调用方 upsert 后即完成回流，
 * 变更后的 Source 在 resource.sources 里按 id 可取。
 */
export interface LibrarySourceCapabilities {
  refreshURL(sourceId: string): Promise<ResourceDTO>
  refreshFile(sourceId: string): Promise<ResourceDTO>
  replaceFile(sourceId: string, inputPath: string): Promise<ResourceDTO>
  startRecoveryScan(sourceIds: string[], directory: string): Promise<string>
  pollRecoveryScan(scanId: string): Promise<RecoveryScanUpdate>
  cancelRecoveryScan(scanId: string): Promise<void>
  discardRecoveryScan(scanId: string): Promise<void>
  replaceScannedFile(sourceId: string, path: string, snapshot: string): Promise<ResourceDTO>
  replaceURL(sourceId: string, inputURL: string): Promise<ResourceDTO>
  probeOnOpen(sourceId: string): Promise<SourceProbeResultDTO>
}

export interface LibraryMediaCapabilities {
  /** 回填前端捕获的缩略图（JPEG）；地址来自 SourceDTO.thumbnail_url。 */
  saveThumbnail(thumbnailUrl: string, jpeg: Blob): Promise<void>
}

/** 订阅返回 unsubscribe；不可用的运行时返回空 disposer，调用方无需自行判空。 */
export interface LibraryEventCapabilities {
  onFilesDropped(listener: (paths: string[]) => void): () => void
  onPasteFilesRequested(listener: () => void): () => void
  onSourceAvailability(listener: (event: SourceAvailabilityEventDTO) => void): () => void
}

/** 与操作系统交互：文件选择、剪贴板、默认应用与外链。 */
export interface LibrarySystemCapabilities {
  chooseFilePaths(): Promise<string[]>
  chooseFilePath(): Promise<string | null>
  chooseDirectory(): Promise<string | null>
  getClipboardFilePaths(): Promise<string[]>
  defaultOpenWith(target: string): Promise<string>
  openExternal(target: string): Promise<void>
  showInFileManager(path: string): Promise<void>
}

/**
 * 桌面能力按领域分簇：新增一类能力只扩一个子对象，调用点按簇名即可读出语义。
 * 媒体地址不在这里——它们是后端 DTO 上的完整 URL，不再由前端拼接。
 */
export interface LibraryRuntime {
  readonly isAvailable: boolean
  readonly resources: LibraryResourceCapabilities
  readonly sources: LibrarySourceCapabilities
  readonly media: LibraryMediaCapabilities
  readonly events: LibraryEventCapabilities
  readonly system: LibrarySystemCapabilities
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
  throw new Error(`${action}没有完成，请重试`)
}

export function requireSourceProbeResultDTO(value: SourceProbeResultDTO | null, action: string): SourceProbeResultDTO {
  if (value) return value
  throw new Error(`${action}未返回结果`)
}
