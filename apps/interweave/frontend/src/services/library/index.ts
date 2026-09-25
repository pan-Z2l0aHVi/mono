import type { LibraryRuntime } from './types'
import { createWailsLibraryRuntime } from './wails'

export function createLibraryRuntime(): LibraryRuntime {
  return createWailsLibraryRuntime()
}

export type { LibraryQueueItem, LibraryRuntime } from './types'
