import { createMockLibraryRuntime } from './mock'
import type { LibraryRuntime } from './types'
import { createWailsLibraryRuntime, hasWailsRuntime } from './wails'

export function createLibraryRuntime(): LibraryRuntime {
  /*
   * 浏览器预览（vite dev、没有 Wails runtime）没有桌面服务可问，列表永远是空的，
   * 样式无从调试。此时换成假数据 runtime；桌面运行时与生产构建都不走这条分支，
   * fixture 也就不会进入发布产物。
   */
  if (import.meta.env.DEV && !hasWailsRuntime()) return createMockLibraryRuntime()
  return createWailsLibraryRuntime()
}

export {
  isSourceAvailabilityEvent,
  type LibraryQueueItem,
  type LibraryRuntime,
  type SourceAvailabilityEventDTO
} from './types'
