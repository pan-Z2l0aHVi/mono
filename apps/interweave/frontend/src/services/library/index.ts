import type { LibraryRuntime } from './types'
import { createWailsLibraryRuntime } from './wails'

export function createLibraryRuntime(): LibraryRuntime {
  return createWailsLibraryRuntime()
}

export {
  isPreviewRevokedEvent,
  isResourceBatchProgressEvent,
  isSourceAvailabilityEvent,
  type ClipboardContentDTO,
  type CreateResourceBatchResultDTO,
  type ImportExpansion,
  type LibraryQueueItem,
  type LibraryQueueItemStatus,
  type LibraryRuntime,
  type ResourceBatchProgressDTO,
  type SourceAvailabilityEventDTO
} from './types'
