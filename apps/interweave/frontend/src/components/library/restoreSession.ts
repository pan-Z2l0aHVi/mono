import { computed, effectScope, ref, watch, type ComputedRef, type Ref } from 'vue'

import { userMessage } from '@/services/library/userMessage'
import type { ResourceSourceView } from '@/stores/library'

import type { PreviewLease, PreviewLeaseEntry } from './previewLease'
import { createRecoveryScanController, type RecoveryScanTimers } from './recoveryScan'
import type { LibraryRestoreQueueItem, RecoveryCandidate, RecoveryScanUpdate } from './restore'

const MATCH_REASON_LABELS: Record<string, string> = {
  identity: '可能是原文件',
  hash: '内容一致',
  name: '文件名一致'
}

export function formatMatchReason(reason: string): string {
  return MATCH_REASON_LABELS[reason] ?? '可能匹配'
}

/**
 * 找回弹窗会话所需的最小窄端口：只收文件/目录选择、扫描会话、预览租约与通知回调，
 * 不直接依赖 Wails 运行时、Pinia store 或组件事件总线。
 */
export interface RestorePorts {
  chooseFilePath(): Promise<string | null>
  chooseDirectory(): Promise<string | null>
  startScan(ids: string[], directory: string): Promise<string>
  pollScan(id: string): Promise<RecoveryScanUpdate>
  cancelScan(id: string): Promise<void>
  discardScan(id: string): Promise<void>
  lease: PreviewLease
  notifyInfo?: (message: string) => void
  notifyError?: (message: string) => void
  onAddItems?: (items: LibraryRestoreQueueItem[]) => void
  onSubmit?: (items: LibraryRestoreQueueItem[]) => void
  timers?: RecoveryScanTimers
}

export interface RestoreSessionInput {
  open: () => boolean
  queue: () => LibraryRestoreQueueItem[]
  busy: () => boolean
  allUnavailableFiles: () => LibraryRestoreQueueItem[]
  failedIds: () => string[]
}

export interface RestoreSession {
  scanChoiceOpen: Ref<boolean>
  candidateItem: Ref<LibraryRestoreQueueItem | null>
  candidates: Ref<Record<string, RecoveryCandidate[]>>
  snapshots: Ref<Record<string, string>>
  scanProgress: Ref<RecoveryScanUpdate | null>
  scanning: Ref<boolean>
  stopping: Ref<boolean>
  scanIncomplete: Ref<boolean>
  prepared: Ref<Record<string, string>>
  picking: Ref<string | null>
  editingUrlItem: Ref<LibraryRestoreQueueItem | null>
  urlDraft: Ref<string>
  previews: ComputedRef<Readonly<Record<string, PreviewLeaseEntry | undefined>>>
  pendingItems: ComputedRef<LibraryRestoreQueueItem[]>
  readyItems: ComputedRef<LibraryRestoreQueueItem[]>
  locked: ComputedRef<boolean>
  canClose: ComputedRef<boolean>
  openScanChoice(): void
  closeScanChoice(): void
  scanAllDisks(): void
  chooseScanDirectory(): Promise<void>
  requestStopScan(): void
  openCandidates(item: LibraryRestoreQueueItem): void
  closeCandidates(): void
  chooseCandidate(candidate: RecoveryCandidate): void
  prepare(item: LibraryRestoreQueueItem): Promise<void>
  completeUrl(value: string): void
  closeUrlEditor(): void
  cancelPrepare(item: LibraryRestoreQueueItem): void
  submit(): void
  previewSource(id: string): ResourceSourceView | null
  matchReasonsFor(id: string): string[]
  dispose(): void
}

/**
 * 找回资源弹窗的会话状态机：收口扫描会话、候选冲突裁决、手动文件/链接准备、
 * 预览租约归属与代次作废，让 RestoreDialog.vue 退回纯声明式视图。
 */
export function createRestoreSession(input: RestoreSessionInput, ports: RestorePorts): RestoreSession {
  const scope = effectScope(true)

  const scanChoiceOpen = ref(false)
  const candidateItem = ref<LibraryRestoreQueueItem | null>(null)
  const candidates = ref<Record<string, RecoveryCandidate[]>>({})
  const manual = ref<Record<string, boolean>>({})
  const snapshots = ref<Record<string, string>>({})
  const scanProgress = ref<RecoveryScanUpdate | null>(null)
  const drafts = ref<Record<string, string>>({})
  const prepared = ref<Record<string, string>>({})
  const picking = ref<string | null>(null)
  const editingUrlItem = ref<LibraryRestoreQueueItem | null>(null)
  const urlDraft = ref('')

  // lease 与添加队列共用，这里记下本会话发起过的 key，关闭/卸载时只撤销自己的授权。
  const previewKeys = new Set<string>()
  let generation = 0

  function releasePreview(id: string) {
    previewKeys.delete(id)
    void ports.lease.revoke(id).catch(console.error)
  }

  function clearPreviews() {
    // releasePreview 会改动集合，先取快照再逐个撤销。
    for (const id of Array.from(previewKeys)) releasePreview(id)
  }

  function prepareThumbnail(id: string, path: string, request: number) {
    previewKeys.add(id)
    void ports.lease
      .prepare(
        id,
        path,
        () => request === generation && prepared.value[id] === path && input.queue().some(item => item.id === id)
      )
      .catch(console.error)
  }

  function mergeCandidate(candidate: RecoveryCandidate) {
    const list = candidates.value[candidate.sourceID] ?? []
    const next = [...list.filter(item => item.path !== candidate.path), candidate]
    candidates.value[candidate.sourceID] = next
    if (manual.value[candidate.sourceID]) return
    if (next.length === 1) {
      prepared.value[candidate.sourceID] = candidate.path
      snapshots.value[candidate.sourceID] = candidate.snapshot
      prepareThumbnail(candidate.sourceID, candidate.path, generation)
    } else {
      delete prepared.value[candidate.sourceID]
      delete snapshots.value[candidate.sourceID]
      releasePreview(candidate.sourceID)
    }
  }

  const scan = createRecoveryScanController(
    {
      start: (ids, directory) => ports.startScan(ids, directory),
      poll: id => ports.pollScan(id),
      cancel: id => ports.cancelScan(id),
      discard: id => ports.discardScan(id)
    },
    {
      timers: ports.timers,
      onProgress: update => {
        scanProgress.value = update
        for (const candidate of update.candidates) mergeCandidate(candidate)
      },
      onDone: update => {
        if (update.error) ports.notifyError?.(userMessage(update.error, '扫描失败，请重试'))
      },
      onError: (stage, cause) => {
        if (stage === 'start') ports.notifyError?.(userMessage(cause, '启动扫描失败，请重试'))
        else if (stage === 'poll') ports.notifyError?.(userMessage(cause, '扫描失败，请重试'))
        else ports.notifyError?.(userMessage(cause, '停止扫描失败，请重试'))
      }
    }
  )

  const scanning = scan.scanning
  const stopping = scan.stopping
  const scanIncomplete = scan.incomplete

  const previews = computed(() => ports.lease.entries.value)
  const pendingItems = computed(() => input.queue().filter(item => !prepared.value[item.id]))
  const readyItems = computed(() => input.queue().filter(item => !!prepared.value[item.id]))
  const locked = computed(() => input.busy() || picking.value !== null)
  const canClose = computed(() => !locked.value && !scanning.value)

  scope.run(() => {
    watch(input.failedIds, ids => {
      for (const id of ids) {
        delete prepared.value[id]
        delete candidates.value[id]
        delete manual.value[id]
        delete snapshots.value[id]
        releasePreview(id)
      }
    })

    watch(
      () =>
        input
          .queue()
          .map(item => item.id)
          .join('|'),
      () => {
        const activeIds = new Set(input.queue().map(item => item.id))
        for (const id of Array.from(previewKeys)) {
          if (!activeIds.has(id)) releasePreview(id)
        }
      }
    )

    watch(
      input.open,
      open => {
        generation += 1
        scan.stop()
        clearPreviews()
        scanChoiceOpen.value = false
        candidateItem.value = null
        editingUrlItem.value = null
        if (open) {
          candidates.value = {}
          manual.value = {}
          snapshots.value = {}
          scanProgress.value = null
          scanIncomplete.value = false
          drafts.value = {}
          prepared.value = {}
          picking.value = null
        }
      },
      { immediate: true }
    )
  })

  async function beginScan(directory: string) {
    const items = [...input.queue()]
    for (const item of input.allUnavailableFiles()) {
      if (!items.some(existing => existing.id === item.id)) items.push(item)
    }
    ports.onAddItems?.(items)
    const fileItems = items.filter(item => item.kind === 'file')
    ports.notifyInfo?.(`已找到 ${fileItems.length} 条失效资源`)
    await scan.beginScan(
      directory,
      fileItems.map(item => item.sourceId)
    )
  }

  function openScanChoice() {
    scanChoiceOpen.value = true
  }

  function closeScanChoice() {
    scanChoiceOpen.value = false
  }

  function scanAllDisks() {
    scanChoiceOpen.value = false
    void beginScan('')
  }

  async function chooseScanDirectory() {
    const request = generation
    scanChoiceOpen.value = false
    picking.value = 'directory'
    try {
      const directory = await ports.chooseDirectory()
      if (directory && input.open() && request === generation) void beginScan(directory)
    } catch (cause) {
      if (request === generation) ports.notifyError?.(userMessage(cause, '选择文件夹失败，请重试'))
    } finally {
      if (request === generation) picking.value = null
    }
  }

  function openCandidates(item: LibraryRestoreQueueItem) {
    candidateItem.value = item
  }

  function closeCandidates() {
    candidateItem.value = null
  }

  function chooseCandidate(candidate: RecoveryCandidate) {
    manual.value[candidate.sourceID] = true
    prepared.value[candidate.sourceID] = candidate.path
    snapshots.value[candidate.sourceID] = candidate.snapshot
    candidateItem.value = null
    prepareThumbnail(candidate.sourceID, candidate.path, generation)
  }

  async function prepare(item: LibraryRestoreQueueItem) {
    if (locked.value) return
    if (item.kind === 'url') {
      urlDraft.value = drafts.value[item.id] ?? ''
      editingUrlItem.value = item
      return
    }
    const request = generation
    picking.value = item.id
    try {
      const path = await ports.chooseFilePath()
      if (request === generation && path) {
        manual.value[item.id] = true
        delete snapshots.value[item.id]
        prepared.value[item.id] = path
        prepareThumbnail(item.id, path, request)
      }
    } catch (cause) {
      if (request === generation) ports.notifyError?.(userMessage(cause, '选择文件失败，请重试'))
    } finally {
      if (request === generation) picking.value = null
    }
  }

  function completeUrl(value: string) {
    const item = editingUrlItem.value
    if (!item) return
    drafts.value[item.id] = value
    prepared.value[item.id] = value
    editingUrlItem.value = null
  }

  function closeUrlEditor() {
    editingUrlItem.value = null
  }

  function cancelPrepare(item: LibraryRestoreQueueItem) {
    if (locked.value) return
    if (item.kind === 'url') drafts.value[item.id] = prepared.value[item.id]
    delete prepared.value[item.id]
    manual.value[item.id] = true
    delete snapshots.value[item.id]
    releasePreview(item.id)
  }

  function submit() {
    if (locked.value || scanning.value || !readyItems.value.length) return
    ports.onSubmit?.(
      readyItems.value.map(item => ({
        ...item,
        replacementLocation: prepared.value[item.id],
        scanSnapshot: snapshots.value[item.id]
      }))
    )
  }

  function previewSource(id: string): ResourceSourceView | null {
    const preview = previews.value[id]
    if (!preview) return null
    return {
      id,
      type: 'file',
      location: preview.path,
      available: true,
      isPreferred: true,
      orderIndex: 0,
      mediaUrl: preview.mediaUrl,
      thumbnailUrl: null,
      metadata: null
    }
  }

  function matchReasonsFor(id: string): string[] {
    if (!snapshots.value[id]) return []
    const matched = candidates.value[id]?.find(candidate => candidate.path === prepared.value[id])
    return matched ? matched.matchReasons.map(formatMatchReason) : []
  }

  function dispose() {
    generation += 1
    scope.stop()
    scan.dispose()
    clearPreviews()
  }

  return {
    scanChoiceOpen,
    candidateItem,
    candidates,
    snapshots,
    scanProgress,
    scanning,
    stopping,
    scanIncomplete,
    prepared,
    picking,
    editingUrlItem,
    urlDraft,
    previews,
    pendingItems,
    readyItems,
    locked,
    canClose,
    openScanChoice,
    closeScanChoice,
    scanAllDisks,
    chooseScanDirectory,
    requestStopScan: () => scan.requestStop(),
    openCandidates,
    closeCandidates,
    chooseCandidate,
    prepare,
    completeUrl,
    closeUrlEditor,
    cancelPrepare,
    submit,
    previewSource,
    matchReasonsFor,
    dispose
  }
}
