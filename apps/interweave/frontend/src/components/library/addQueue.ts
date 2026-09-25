import { ref, type Ref } from 'vue'

import type { LibraryQueueItem, LibraryRuntime } from '@/services/library'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

type PreviewRuntime = Pick<
  LibraryRuntime,
  'isAvailable' | 'prepareFilePreview' | 'releaseFilePreview' | 'pendingFilePreviewURL'
>

export interface LibraryAddQueueController {
  queue: Ref<LibraryQueueItem[]>
  enqueueFileLocations(locations: string[]): void
  renameItem(itemId: string, title: string): void
  setItemTags(itemId: string, tags: string[]): void
  removeItem(itemId: string): Promise<void>
  waitForPreview(itemId: string): Promise<void>
  releasePreview(itemId: string): Promise<void>
  close(): Promise<void>
}

function queueId() {
  return `queue-file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function titleFromLocation(location: string) {
  return (
    location
      .split(/[\\/]/)
      .at(-1)
      ?.replace(/\.[^.]+$/, '') || location
  )
}

export function createLibraryAddQueue(runtime: PreviewRuntime): LibraryAddQueueController {
  const queue = ref<LibraryQueueItem[]>([])
  const preparations = new Map<string, Promise<void>>()

  function releaseToken(token: string | null) {
    if (!token || !runtime.isAvailable) return Promise.resolve()
    return runtime.releaseFilePreview(token)
  }

  function replaceItem(itemId: string, update: (item: LibraryQueueItem) => LibraryQueueItem) {
    queue.value = queue.value.map(item => (item.id === itemId ? update(item) : item))
  }

  function trackPreparation(itemId: string, preparation: Promise<void>) {
    preparations.set(itemId, preparation)
    void preparation.then(() => {
      if (preparations.get(itemId) === preparation) preparations.delete(itemId)
    })
  }

  function prepareItem(item: LibraryQueueItem) {
    const preparation = (async () => {
      if (!runtime.isAvailable) return
      try {
        const preview = await runtime.prepareFilePreview(item.location)
        const current = queue.value.find(candidate => candidate.id === item.id)
        if (!current || current.location !== item.location) {
          await releaseToken(preview.token ?? null)
          return
        }
        const mediaUrl = preview.token ? runtime.pendingFilePreviewURL(preview.token) : null
        replaceItem(item.id, candidate => ({
          ...candidate,
          resourceKind: preview.kind,
          previewToken: preview.token ?? null,
          mediaUrl
        }))
      } catch {
        // 预览失败时保留 generic fallback；真正的纳入仍由 AddFileResource 校验路径。
      }
    })()
    trackPreparation(item.id, preparation)
  }

  function enqueueFileLocations(locations: string[]) {
    const existingLocations = new Set(queue.value.map(item => item.location))
    for (const value of locations) {
      const location = value.trim()
      if (!location || existingLocations.has(location)) continue
      const item: LibraryQueueItem = {
        id: queueId(),
        kind: 'file',
        resourceKind: ResourceKind.ResourceKindFile,
        title: titleFromLocation(location),
        location,
        tags: [],
        previewToken: null,
        mediaUrl: null
      }
      queue.value.push(item)
      existingLocations.add(location)
      prepareItem(item)
    }
  }

  function renameItem(itemId: string, title: string) {
    replaceItem(itemId, item => ({ ...item, title }))
  }

  function setItemTags(itemId: string, tags: string[]) {
    replaceItem(itemId, item => ({ ...item, tags: [...tags] }))
  }

  async function waitForPreview(itemId: string) {
    await preparations.get(itemId)
  }

  async function releasePreview(itemId: string) {
    await waitForPreview(itemId)
    const item = queue.value.find(candidate => candidate.id === itemId)
    if (!item?.previewToken) return
    const token = item.previewToken
    replaceItem(item.id, candidate => ({ ...candidate, previewToken: null, mediaUrl: null }))
    await releaseToken(token)
  }

  async function removeItem(itemId: string) {
    const item = queue.value.find(candidate => candidate.id === itemId)
    if (!item) return
    await waitForPreview(itemId)
    const current = queue.value.find(candidate => candidate.id === itemId)
    if (!current) return
    queue.value = queue.value.filter(candidate => candidate.id !== itemId)
    await releaseToken(current.previewToken)
  }

  async function close() {
    const items = [...queue.value]
    const pending = [...preparations.values()]
    queue.value = []
    await Promise.allSettled(pending)
    await Promise.allSettled(items.map(item => releaseToken(item.previewToken)))
  }

  return {
    queue,
    enqueueFileLocations,
    renameItem,
    setItemTags,
    removeItem,
    waitForPreview,
    releasePreview,
    close
  }
}
