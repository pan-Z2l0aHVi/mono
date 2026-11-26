import type { LibraryRuntime } from './types'
import { createWailsLibraryRuntime } from './wails'

export function createLibraryRuntime(): LibraryRuntime {
  return createWailsLibraryRuntime()
}

export {
  isPreviewRevokedEvent,
  isSourceAvailabilityEvent,
  type ImportExpansion,
  type LibraryQueueItem,
  type LibraryRuntime,
  type SourceAvailabilityEventDTO
} from './types'
