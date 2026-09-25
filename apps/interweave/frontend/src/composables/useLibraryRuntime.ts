import { computed, ref } from 'vue'

import {
  createLibraryRuntime,
  type LibraryQueueItem,
  type LibraryRuntime,
  type SourceAvailabilityEventDTO
} from '@/services/library'
import { useLibraryStore, type ResourceSourceView } from '@/stores/library'

import { SourceProbeOutcome } from '../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message
  return '操作失败，请稍后重试'
}

function normalizeTag(tagName: string) {
  return tagName.trim().replace(/\s+/g, ' ')
}

export function useLibraryRuntime(injectedRuntime?: LibraryRuntime) {
  const store = useLibraryStore()
  const runtime = injectedRuntime ?? createLibraryRuntime()
  const isLoading = ref(false)
  const pendingResourceIds = ref<string[]>([])
  const refreshingSourceIds = ref<string[]>([])
  const replacingSourceIds = ref<string[]>([])
  const error = ref('')
  const isBusy = computed(
    () =>
      isLoading.value ||
      pendingResourceIds.value.length > 0 ||
      refreshingSourceIds.value.length > 0 ||
      replacingSourceIds.value.length > 0
  )

  function setPending(resourceId: string, pending: boolean) {
    const ids = new Set(pendingResourceIds.value)
    if (pending) ids.add(resourceId)
    else ids.delete(resourceId)
    pendingResourceIds.value = [...ids]
  }

  async function loadResources() {
    if (!runtime.isAvailable) {
      error.value = ''
      store.setResources([])
      return
    }

    isLoading.value = true
    error.value = ''
    try {
      store.setResources(await runtime.listResources())
    } catch (cause) {
      error.value = errorMessage(cause)
      throw cause
    } finally {
      isLoading.value = false
    }
  }

  async function addResource(item: LibraryQueueItem) {
    setPending(item.id, true)
    error.value = ''
    try {
      const created =
        item.kind === 'file'
          ? await runtime.addFileResource(item.location)
          : await runtime.addURLResource(item.location)
      const title = item.title.trim()
      const updated = title && title !== created.title ? await runtime.updateResourceTitle(created.id, title) : created
      store.upsertResource(updated)
      for (const tagName of item.tags) {
        await runtime.addTag(created.id, tagName)
      }
      const saved = item.tags.length ? await runtime.getResource(created.id) : updated
      store.upsertResource(saved)
      return saved
    } catch (cause) {
      error.value = errorMessage(cause)
      throw cause
    } finally {
      setPending(item.id, false)
    }
  }

  async function renameResource(resourceId: string, newTitle: string) {
    setPending(resourceId, true)
    error.value = ''
    try {
      const updated = await runtime.updateResourceTitle(resourceId, newTitle)
      store.upsertResource(updated)
      return updated
    } catch (cause) {
      error.value = errorMessage(cause)
      throw cause
    } finally {
      setPending(resourceId, false)
    }
  }

  async function deleteResources(resourceIds: string[]) {
    error.value = ''
    const deletedIds: string[] = []
    resourceIds.forEach(id => setPending(id, true))
    try {
      for (const resourceId of resourceIds) {
        await runtime.deleteResource(resourceId)
        deletedIds.push(resourceId)
      }
      store.removeResources(deletedIds)
      return deletedIds
    } catch (cause) {
      store.removeResources(deletedIds)
      error.value = errorMessage(cause)
      throw cause
    } finally {
      resourceIds.forEach(id => setPending(id, false))
    }
  }

  async function saveTags(resourceId: string, nextTagNames: string[]) {
    setPending(resourceId, true)
    error.value = ''
    try {
      const current = await runtime.getResource(resourceId)
      const normalized = [...new Set(nextTagNames.map(normalizeTag).filter(Boolean))]
      const currentByName = new Map(current.tags.map(tag => [tag.name.toLowerCase(), tag]))
      const nextNames = new Set(normalized.map(tag => tag.toLowerCase()))

      // 单次 Tag mutation 失败时，服务端可能已应用此前的 remove/add；本 task 不做自动回滚。
      for (const tag of current.tags) {
        if (!nextNames.has(tag.name.toLowerCase())) await runtime.removeTag(resourceId, tag.id)
      }
      for (const tagName of normalized) {
        if (!currentByName.has(tagName.toLowerCase())) await runtime.addTag(resourceId, tagName)
      }

      const updated = await runtime.getResource(resourceId)
      store.upsertResource(updated)
      return updated
    } catch (cause) {
      error.value = errorMessage(cause)
      throw cause
    } finally {
      setPending(resourceId, false)
    }
  }

  async function refreshSource(source: Pick<ResourceSourceView, 'id' | 'type'>) {
    const sourceId = source.id
    refreshingSourceIds.value = [...new Set([...refreshingSourceIds.value, sourceId])]
    error.value = ''
    try {
      const refreshed =
        source.type === 'file' ? await runtime.refreshFileSource(sourceId) : await runtime.refreshURLSource(sourceId)
      const updated = await runtime.getResource(refreshed.resource_id)
      store.upsertResource(updated)
      return updated
    } catch (cause) {
      error.value = errorMessage(cause)
      throw cause
    } finally {
      refreshingSourceIds.value = refreshingSourceIds.value.filter(id => id !== sourceId)
    }
  }

  async function replaceFileSource(sourceId: string, inputPath: string) {
    replacingSourceIds.value = [...new Set([...replacingSourceIds.value, sourceId])]
    error.value = ''
    try {
      const replaced = await runtime.replaceFileSource(sourceId, inputPath)
      const updated = await runtime.getResource(replaced.resource_id)
      store.upsertResource(updated)
      return updated
    } catch (cause) {
      error.value = errorMessage(cause)
      throw cause
    } finally {
      replacingSourceIds.value = replacingSourceIds.value.filter(id => id !== sourceId)
    }
  }

  async function replaceURLSource(sourceId: string, inputURL: string) {
    replacingSourceIds.value = [...new Set([...replacingSourceIds.value, sourceId])]
    error.value = ''
    try {
      const replaced = await runtime.replaceURLSource(sourceId, inputURL)
      const updated = await runtime.getResource(replaced.resource_id)
      store.upsertResource(updated)
      return updated
    } catch (cause) {
      error.value = errorMessage(cause)
      throw cause
    } finally {
      replacingSourceIds.value = replacingSourceIds.value.filter(id => id !== sourceId)
    }
  }

  function chooseFilePaths() {
    return runtime.chooseFilePaths()
  }

  function chooseFilePath() {
    return runtime.chooseFilePath()
  }

  function getClipboardFilePaths() {
    return runtime.getClipboardFilePaths()
  }

  async function openExternal(target: string) {
    error.value = ''
    try {
      await runtime.openExternal(target)
    } catch (cause) {
      error.value = errorMessage(cause)
      throw cause
    }
  }

  /**
   * 打开详情时的 URL 探测（§7.1）。策略收窄为 unavailableOnly：只在当前判为不可用时
   * 发起——对当前可用的 URL 每次开抽屉都发一次网络请求没有用户可见收益，而「死链恢复」
   * 正是需要重新判定的场景。判定放在这里而不是调用点，是为了让「该不该探测」这条策略
   * 可以被单测直接覆盖。
   *
   * 结论分三态（§7.3）：available/unavailable 已落库，走既有 upsert 回流；inconclusive
   * （断网、DNS、超时）不落库也不改角标，只回一句后端出的用户可见文案。探测失败同样
   * 不阻塞开抽屉——这是附加信息，不是打开的前置条件。
   */
  async function probeURLSourceOnOpen(preferred: ResourceSourceView | null) {
    if (!runtime.isAvailable) return
    if (!preferred || preferred.type !== 'url' || preferred.available) return
    try {
      const result = await runtime.probeURLSourceOnOpen(preferred.id)
      if (result.outcome === SourceProbeOutcome.SourceProbeOutcomeInconclusive) {
        error.value = result.message || '暂时无法检测该链接'
        return
      }
      if (result.source) store.upsertResource(await runtime.getResource(result.source.resource_id))
    } catch (cause) {
      error.value = errorMessage(cause)
    }
  }

  function resourceMediaURL(sourceId: string) {
    if (!runtime.isAvailable) return null
    return runtime.resourceMediaURL(sourceId)
  }

  function subscribeToDroppedFiles(listener: (paths: string[]) => void) {
    if (!runtime.isAvailable) return () => {}
    return runtime.subscribeToDroppedFiles(listener)
  }

  function subscribeToPasteFileRequest(listener: () => void) {
    if (!runtime.isAvailable) return () => {}
    return runtime.subscribeToPasteFileRequest(listener)
  }

  function subscribeToSourceAvailability(listener: (event: SourceAvailabilityEventDTO) => void) {
    if (!runtime.isAvailable) return () => {}
    return runtime.subscribeToSourceAvailability(listener)
  }

  return {
    runtime,
    isLoading,
    isBusy,
    pendingResourceIds,
    refreshingSourceIds,
    replacingSourceIds,
    error,
    loadResources,
    addResource,
    renameResource,
    deleteResources,
    saveTags,
    refreshSource,
    replaceFileSource,
    replaceURLSource,
    chooseFilePaths,
    chooseFilePath,
    getClipboardFilePaths,
    openExternal,
    resourceMediaURL,
    subscribeToDroppedFiles,
    subscribeToPasteFileRequest,
    subscribeToSourceAvailability,
    probeURLSourceOnOpen
  }
}
