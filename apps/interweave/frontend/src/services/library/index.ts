import type { LibraryRuntime } from './types'
import { createWailsLibraryRuntime } from './wails'

export function createLibraryRuntime(): LibraryRuntime {
  return createWailsLibraryRuntime()
}

export {
  isSourceAvailabilityEvent,
  type LibraryQueueItem,
  type LibraryRuntime,
  type SourceAvailabilityEventDTO
} from './types'
