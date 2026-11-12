import type { ResourceSourceView, ResourceView } from '@/stores/library'

export interface LibraryRestoreQueueItem {
  id: string
  sourceId: string
  resourceId: string
  resourceTitle: string
  resourceKind: ResourceView['kind']
  kind: ResourceSourceView['type']
  location: string
  replacementLocation: string
  scanSnapshot?: string
}

export interface LibraryRestoreQueueResult {
  completedIds: string[]
  failures: { item: LibraryRestoreQueueItem; cause: unknown }[]
}

interface LibraryRestoreQueueHandlers {
  replaceFileSource: (sourceId: string, inputPath: string) => Promise<unknown>
  replaceScannedFileSource: (sourceId: string, inputPath: string, snapshot: string) => Promise<unknown>
  replaceURLSource: (sourceId: string, inputURL: string) => Promise<unknown>
  onItemStart?: (itemId: string) => void
}

export function createLibraryRestoreQueueItem(
  resource: ResourceView,
  source: ResourceSourceView
): LibraryRestoreQueueItem {
  return {
    id: source.id,
    sourceId: source.id,
    resourceId: resource.id,
    resourceTitle: resource.title,
    resourceKind: resource.kind,
    kind: source.type,
    location: source.location,
    replacementLocation: source.type === 'url' ? source.location : ''
  }
}

export function createLibraryRestoreQueue(resources: ResourceView[]): LibraryRestoreQueueItem[] {
  return resources.flatMap(resource => {
    const source = resource.sources.find(item => !item.available)
    return source ? [createLibraryRestoreQueueItem(resource, source)] : []
  })
}

/**
 * 资源库两类链接入口共用的校验：只收 http/https，其余（file、data、javascript 等）
 * 一律判为无效。返回规范化后的字符串，调用点拿它去落库或入队。
 */
export function normalizeLibraryURL(value: string) {
  const normalized = value.trim()
  if (!normalized) return null
  try {
    const parsed = new URL(normalized)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

export async function restoreLibraryQueue(
  items: LibraryRestoreQueueItem[],
  handlers: LibraryRestoreQueueHandlers
): Promise<LibraryRestoreQueueResult> {
  const completedIds: string[] = []
  const failures: LibraryRestoreQueueResult['failures'] = []

  for (const item of items) {
    handlers.onItemStart?.(item.id)
    try {
      if (item.kind === 'file') {
        if (!item.replacementLocation) throw new Error('请选择新文件')
        if (item.scanSnapshot)
          await handlers.replaceScannedFileSource(item.sourceId, item.replacementLocation, item.scanSnapshot)
        else await handlers.replaceFileSource(item.sourceId, item.replacementLocation)
      } else {
        await handlers.replaceURLSource(item.sourceId, item.replacementLocation)
      }
      completedIds.push(item.id)
    } catch (cause) {
      failures.push({ item, cause })
    }
  }

  return { completedIds, failures }
}

export interface RecoveryCandidate {
  sourceID: string
  path: string
  size: number
  modifiedAt: number
  matchReasons: string[]
  snapshot: string
}

export interface RecoveryScanUpdate {
  candidates: RecoveryCandidate[]
  checked: number
  currentDirectory: string
  skipped: number
  done: boolean
  cancelled: boolean
  error: string
}
