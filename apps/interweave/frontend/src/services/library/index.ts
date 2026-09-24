import { createFixtureLibraryRuntime } from './fixtures'
import type { LibraryRuntime } from './types'
import { createWailsLibraryRuntime, hasWailsRuntime } from './wails'

export function createLibraryRuntime(): LibraryRuntime {
  return hasWailsRuntime() ? createWailsLibraryRuntime() : createFixtureLibraryRuntime()
}

export type { LibraryQueueItem, LibraryRuntime, LibraryRuntimeKind } from './types'
