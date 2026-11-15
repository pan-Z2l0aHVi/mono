import { computed, ref } from 'vue'

import { createLibraryRuntime, type LibraryQueueItem, type LibraryRuntime } from '@/services/library'
import { userMessage } from '@/services/library/userMessage'
import { useLibraryStore, type ResourceSourceView } from '@/stores/library'

import { SourceProbeOutcome } from '../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import { SourceType } from '../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

function errorMessage(error: unknown) {
  return userMessage(error, '操作失败，请稍后重试')
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
      store.setResources(await runtime.resources.list())
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
      // 标题、入口与初始标签一次交给后端：归一化、探测与事务建齐都在 core 内完成。
      const saved = await runtime.resources.create({
        kind: item.kind === 'file' ? SourceType.SourceTypeFile : SourceType.SourceTypeURL,
        location: item.location,
        title: item.title,
        tags: item.tags
      })
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
      const updated = await runtime.resources.updateTitle(resourceId, newTitle)
      store.upsertResource(updated)
      return updated
    } catch (cause) {
      error.value = errorMessage(cause)
      throw cause
    } finally {
      setPending(resourceId, false)
    }
  }

  async function updateResourceNote(resourceId: string, note: string) {
    setPending(resourceId, true)
    error.value = ''
    try {
      const updated = await runtime.resources.updateNote(resourceId, note)
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
        await runtime.resources.remove(resourceId)
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
      // 替换式集合语义：名称原样提交，归一化与差集增删由后端在单事务内完成；
      // 变更后的完整 Resource 视图直接回流，不必再往返读取一次。
      const updated = await runtime.resources.setTags(resourceId, nextTagNames)
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
      const updated =
        source.type === 'file'
          ? await runtime.sources.refreshFile(sourceId)
          : await runtime.sources.refreshURL(sourceId)
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
      const updated = await runtime.sources.replaceFile(sourceId, inputPath)
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
      const updated = await runtime.sources.replaceURL(sourceId, inputURL)
      store.upsertResource(updated)
      return updated
    } catch (cause) {
      error.value = errorMessage(cause)
      throw cause
    } finally {
      replacingSourceIds.value = replacingSourceIds.value.filter(id => id !== sourceId)
    }
  }

  async function defaultOpenWith(target: string) {
    if (!runtime.isAvailable) return ''
    try {
      return await runtime.system.defaultOpenWith(target)
    } catch {
      // 查询不到默认应用不是错误：UI 回落到通用「系统默认应用」文案，打开动作照旧可用。
      return ''
    }
  }

  async function openExternal(target: string) {
    error.value = ''
    try {
      await runtime.system.openExternal(target)
    } catch (cause) {
      error.value = errorMessage(cause)
      throw cause
    }
  }

  /**
   * 打开详情时的 URL 探测（§7.1）。策略收窄为 unavailableOnly：只在当前判为不可用时
   * 发起——对当前可用的 URL 每次开 drawer 都发一次网络请求没有用户可见收益，而「死链恢复」
   * 正是需要重新判定的场景。判定放在这里而不是调用点，是为了让「该不该探测」这条策略
   * 可以被单测直接覆盖。
   *
   * 结论分三态（§7.3）：available/unavailable 已落库，走既有 upsert 回流；inconclusive
   * （断网、DNS、超时）不落库也不改角标，只回一句后端出的用户可见文案。探测失败同样
   * 不阻塞开 drawer——这是附加信息，不是打开的前置条件。
   */
  async function probeURLSourceOnOpen(preferred: ResourceSourceView | null) {
    if (!runtime.isAvailable) return
    if (!preferred || preferred.type !== 'url' || preferred.available) return
    try {
      const result = await runtime.sources.probeOnOpen(preferred.id)
      if (result.outcome === SourceProbeOutcome.SourceProbeOutcomeInconclusive) {
        error.value = result.message || '暂时无法检测该链接'
        return
      }
      if (result.resource) store.upsertResource(result.resource)
    } catch (cause) {
      error.value = errorMessage(cause)
    }
  }

  /*
   * 缩略图回填是尽力而为的缓存预热：同一地址的并发捕获只在第一个在途请求里真正上传，
   * 失败静默吞掉——列表下一次挂载还有机会补上，不值得为此打断用户或弹错误。
   */
  const thumbnailSaves = new Map<string, Promise<void>>()

  function saveSourceThumbnail(thumbnailUrl: string, dataUrl: string) {
    const inFlight = thumbnailSaves.get(thumbnailUrl)
    if (inFlight) return inFlight
    const save = (async () => {
      const blob = await (await fetch(dataUrl)).blob()
      await runtime.media.saveThumbnail(thumbnailUrl, blob)
    })()
      .catch(() => {})
      .finally(() => {
        thumbnailSaves.delete(thumbnailUrl)
      })
    thumbnailSaves.set(thumbnailUrl, save)
    return save
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
    updateResourceNote,
    deleteResources,
    saveTags,
    refreshSource,
    replaceFileSource,
    replaceURLSource,
    defaultOpenWith,
    openExternal,
    saveSourceThumbnail,
    probeURLSourceOnOpen
  }
}
