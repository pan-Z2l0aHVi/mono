import type { ResourceSourceView, ResourceView } from '@/stores/library'

export interface LibraryRestoreQueueItem {
  id: string
  sourceId: string
  resourceId: string
  resourceTitle: string
  kind: ResourceSourceView['type']
  location: string
  replacementLocation: string
}

export interface LibraryRestoreQueueResult {
  completedIds: string[]
  cancelledIds: string[]
  failed: {
    item: LibraryRestoreQueueItem
    cause: unknown
  } | null
}

interface LibraryRestoreQueueHandlers {
  chooseFilePath: () => Promise<string | null>
  replaceFileSource: (sourceId: string, inputPath: string) => Promise<unknown>
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

export function normalizeRestoreURL(value: string) {
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
  const cancelledIds: string[] = []

  for (const item of items) {
    handlers.onItemStart?.(item.id)
    try {
      if (item.kind === 'file') {
        const inputPath = await handlers.chooseFilePath()
        if (!inputPath) {
          cancelledIds.push(item.id)
          continue
        }
        await handlers.replaceFileSource(item.sourceId, inputPath)
      } else {
        await handlers.replaceURLSource(item.sourceId, item.replacementLocation)
      }
      completedIds.push(item.id)
    } catch (cause) {
      return { completedIds, cancelledIds, failed: { item, cause } }
    }
  }

  return { completedIds, cancelledIds, failed: null }
}
