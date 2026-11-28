import { computed, ref, type ComputedRef, type Ref } from 'vue'

import type { LibraryAddQueueController, LibraryBatchSettlement, LibraryBatchTask } from '@/components/library/addQueue'
import { extractImportLinks } from '@/components/library/linkImport'
import { restoreLibraryQueue, type LibraryRestoreQueueItem } from '@/components/library/restore'
import type { LibraryQueueItem } from '@/services/library'

import type {
  CreateResourceBatchResultDTO,
  CreateResourceInputDTO,
  ResourceBatchProgressDTO,
  ResourceDTO
} from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/service'
import { SourceType } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'
import type { ClipboardContentDTO } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/native/service'

/**
 * 单批导入的确认阈值，按展开后的文件总数计（文件多选、文件夹递归、两者混选同一条链）。
 *
 * 数值依据：目标是「点导入 → 待导入列表就绪」不超过 1s，超过就该先拦下来征得同意。
 * 实测（M2/16G，300 文件批）前 1.5s 只入队 32 项、末段降到约 3 项/秒；后端侧展开与重复
 * 检查摊销仅约 15µs/文件，耗时几乎全在待导入列表逐项渲染，因此 1s 大约只对应 20 个文件。
 * 列表渲染优化（虚拟化/延迟挂预览）后应按新曲线重估，而不是凭感觉调大。
 */
export const IMPORT_CONFIRM_THRESHOLD = 20

/** 单项入队平均耗时估算（毫秒，含去重查询与排队开销），据此推算大批次预计耗时。 */
export const ESTIMATED_IMPORT_MS_PER_ITEM = 20
/** 预计耗时低于该阈值（10 秒，对应约 500 项）时不展示时间提示，避免短流程噪音。 */
export const ESTIMATE_DISPLAY_MIN_SECONDS = 10

/**
 * 估算大批次操作耗时文案：不足 10 秒返回 null；10–59 秒按 5 秒取整，60 秒及以上按分钟四舍五入。
 */
export function formatBatchTimeEstimate(count: number, msPerItem = ESTIMATED_IMPORT_MS_PER_ITEM): string | null {
  if (!Number.isFinite(count) || count <= 0) return null
  const seconds = (count * msPerItem) / 1000
  if (seconds < ESTIMATE_DISPLAY_MIN_SECONDS) return null
  if (seconds < 60) {
    const rounded = Math.max(10, Math.round(seconds / 5) * 5)
    return `预计需要约 ${rounded} 秒`
  }
  const minutes = Math.max(1, Math.round(seconds / 60))
  return `预计需要约 ${minutes} 分钟`
}

export interface ConfirmRequest {
  title: string
  /** busy 期间替换弹窗标题（如批量导入扫描中显示「正在扫描」）。 */
  busyTitle?: string
  message: string
  confirmLabel: string
  danger: boolean
  /** 紧凑变体走窄一档的弹窗宽度（320px）。由调用点声明，不从标题文案反推。 */
  compact?: boolean
  /**
   * 声明后，确认弹窗在 busy 期间把按钮文案换成「已处理 / 总数」的实时进度；
   * 进度数值读 addQueue.progress，与本请求的 progressTotal 对应同一批长流程。
   */
  progressTotal?: number
  /**
   * busy 期间取消按钮的文案；声明即表示该流程可中途停止（批量导入）。
   * 未声明时取消按钮照旧禁用，删除等一次性操作不被半途取消。
   */
  busyCancelLabel?: string
  action: () => Promise<void> | void
}

/**
 * 资源库工作流状态机的窄端口：仅声明导入展开、文件/剪贴板读取、资源落库/替换、
 * 错误上报与提示回调，不直接绑定 Wails 运行时或 Pinia store。
 */
export interface LibraryWorkflowPorts {
  addQueue: Pick<
    LibraryAddQueueController,
    | 'submitting'
    | 'failureCount'
    | 'progress'
    | 'prepareBatchProgress'
    | 'enqueueFileLocations'
    | 'enqueueURL'
    | 'enqueueURLs'
    | 'setItemStatus'
    | 'resolveDuplicate'
    | 'submit'
    | 'stopEnqueue'
    | 'close'
  >
  expandImportEntries(entries: string[]): Promise<{ files: string[]; folders: number }>
  chooseFilePaths(): Promise<string[]>
  chooseFilesOnly(): Promise<string[]>
  chooseDirectories(): Promise<string[]>
  getClipboardFilePaths(): Promise<string[]>
  readClipboardText(): Promise<string>
  /** 一次读取剪贴板文本与 HTML；HTML 用于提取锚点与相对链接。 */
  readClipboardContent(): Promise<ClipboardContentDTO>
  addResource(item: LibraryQueueItem, options?: { deferUpsert?: boolean }): Promise<unknown>
  /** 批量纳入；逐项结果按输入下标对齐。 */
  createResources(batchId: string, inputs: CreateResourceInputDTO[]): Promise<CreateResourceBatchResultDTO[]>
  cancelResourceBatch(batchId: string): Promise<void>
  onResourceBatchProgress(listener: (event: ResourceBatchProgressDTO) => void): () => void
  /** 批量成功后把资源回流到 store（与 addResource 的 upsert 同一出口）。 */
  upsertResource(resource: ResourceDTO): void
  /** 批量合并写入资源库列表；缺省时回退到逐条 upsertResource。 */
  upsertResources?(resources: ResourceDTO[]): void
  replaceSource(sourceId: string, input: string, options?: { deferUpsert?: boolean }): Promise<unknown>
  replaceScannedFileSource(
    sourceId: string,
    inputPath: string,
    snapshot: string,
    options?: { deferUpsert?: boolean }
  ): Promise<unknown>
  reportError(cause: unknown, fallback: string): void
  notifyWarning(message: string): void
}

export interface LibraryWorkflow {
  addOpen: Ref<boolean>
  confirmBusy: Ref<boolean>
  confirmOpen: Ref<boolean>
  confirmRequest: Ref<ConfirmRequest | null>
  confirmButtonLabel: ComputedRef<string>
  restoreOpen: Ref<boolean>
  restoreQueue: Ref<LibraryRestoreQueueItem[]>
  restoreBusy: Ref<boolean>
  failedRestoreIds: Ref<string[]>
  activeRestoreItemId: Ref<string | null>
  openConfirmDialog(request: ConfirmRequest): void
  runConfirmedAction(): Promise<void>
  closeConfirmDialog(): void
  cancelConfirmDialog(): void
  openAddDialog(): void
  setAddOpen(open: boolean): void
  handleAddDialogClosed(): void
  handleWindowFileDrops(batches: string[][]): void
  handleWindowURLDrops(batches: string[][]): void
  pasteFilePaths(clipboardText?: string): Promise<void>
  requestAddURLs(urls: string[]): void
  enqueueImportEntries(entries: string[]): Promise<void>
  pickFiles(): Promise<void>
  pickFilesOnly(): Promise<void>
  pickDirectories(): Promise<void>
  submitQueue(): Promise<void>
  openRestoreDialog(items: LibraryRestoreQueueItem[]): void
  setRestoreOpen(open: boolean): void
  submitRestoreQueue(items: LibraryRestoreQueueItem[]): Promise<void>
}

/**
 * 资源库页工作流状态机：统一收口确认弹窗串行队列、批量导入阈值门控、
 * 提交期间入队拦截与找回提交结算，使页面组件只负责视图绑定与导航。
 */
export function createLibraryWorkflow(ports: LibraryWorkflowPorts): LibraryWorkflow {
  const { addQueue } = ports

  const addOpen = ref(false)
  const confirmBusy = ref(false)
  const confirmOpen = ref(false)
  const confirmRequest = ref<ConfirmRequest | null>(null)
  const restoreOpen = ref(false)
  const restoreQueue = ref<LibraryRestoreQueueItem[]>([])
  const restoreBusy = ref(false)
  const failedRestoreIds = ref<string[]>([])
  const activeRestoreItemId = ref<string | null>(null)

  /** 批量确认串行排队：并发触发的多个超阈值批次依次展示，后到的等待当前弹窗结算，不互相覆盖。 */
  const pendingConfirmRequests: ConfirmRequest[] = []

  function openConfirmDialog(request: ConfirmRequest) {
    if (confirmOpen.value) {
      pendingConfirmRequests.push(request)
      return
    }
    confirmRequest.value = request
    confirmOpen.value = true
  }

  function closeConfirmDialog() {
    // 只翻 open、不清内容：退场期间保留上次内容的合同见 useLingering。
    // 关闭即原子串接排队的下一批：confirm-open-change 的 cancel 与显式取消都收敛到这里，
    // open 已为 false 的重复调用直接返回，不会把同一份排队请求消费两次。
    if (!confirmOpen.value) return
    confirmOpen.value = false
    const next = pendingConfirmRequests.shift()
    if (!next) return
    confirmRequest.value = next
    confirmOpen.value = true
  }

  async function runConfirmedAction() {
    const request = confirmRequest.value
    if (!request || confirmBusy.value) return
    confirmBusy.value = true
    try {
      await request.action()
      closeConfirmDialog()
    } catch (cause) {
      ports.reportError(cause, '操作失败，请稍后重试')
    } finally {
      confirmBusy.value = false
    }
  }

  /**
   * 确认弹窗的取消：批量导入扫描进行中显示为「终止扫描」。
   * 仅中止尚未入队的剩余项，已加入待导入列表的资源必须保留；排队等待确认的其它批次仍依次弹出。
   * action 随后自行结算，runConfirmedAction 走正常关闭，这里不提前翻 open。
   */
  function cancelConfirmDialog() {
    if (confirmBusy.value && confirmRequest.value?.busyCancelLabel) {
      addQueue.stopEnqueue()
      return
    }
    closeConfirmDialog()
  }

  /** 确认按钮文案：声明了 progressTotal 的请求在 busy 期间展示实时进度比值。 */
  const confirmButtonLabel = computed(() => {
    const request = confirmRequest.value
    const label = request?.confirmLabel ?? '确认'
    const total = request?.progressTotal ?? 0
    if (confirmBusy.value && total > 0) return `${addQueue.progress.value.done} / ${total}`
    return label
  })

  function openAddDialog() {
    addOpen.value = true
  }

  function setAddOpen(open: boolean) {
    addOpen.value = open
    if (!open) addQueue.resolveDuplicate(false)
  }

  function handleAddDialogClosed() {
    if (addOpen.value) return
    void addQueue.close()
  }

  /** 提交期间所有入队入口共用的提示：文案只在这里维护。 */
  function warnImportInProgress() {
    ports.notifyWarning('正在导入当前批次，请等它完成再继续添加')
  }

  /**
   * 统一挡下提交期间的链接入队：窗口拖入与粘贴文本都不经 enqueueImportEntries，
   * 提交按快照结算、成功时整队清空，期间入队的链接会被静默丢弃。
   */
  function requestAddURLs(urls: string[]) {
    if (!urls.length) return
    if (addQueue.submitting.value) {
      warnImportInProgress()
      return
    }
    void addQueue.enqueueURLs(urls)
  }

  /*
   * 统一的导入入口展开：选择面板、拖入与剪贴板都走同一条链——
   * 后端把目录递归展开成文件清单（文件原样保留，隐藏项与符号链接由后端过滤），
   * 超过阈值先经页面确认弹窗显式放行，确认动作就是整条入队链，逐项重复提示结算完毕它才关闭。
   */
  async function enqueueImportEntries(entries: string[]) {
    if (addQueue.submitting.value) {
      warnImportInProgress()
      return
    }
    const expansion = await ports.expandImportEntries(entries)
    if (!addOpen.value) return
    // 大目录展开可能跨过用户点提交的时刻：返回后复查一次，别把这一批塞进正在结算的队列。
    if (addQueue.submitting.value) {
      warnImportInProgress()
      return
    }
    const paths = expansion.files
    if (!paths.length) {
      ports.notifyWarning('所选内容里没有可导入的文件')
      return
    }
    if (paths.length > IMPORT_CONFIRM_THRESHOLD) {
      const expanded = expansion.folders > 0 ? `（${expansion.folders} 个文件夹已递归展开）` : ''
      const estimate = formatBatchTimeEstimate(paths.length)
      const estimateSuffix = estimate ? `，${estimate}` : ''
      openConfirmDialog({
        title: '批量导入',
        busyTitle: '正在扫描',
        message: `共 ${paths.length} 个文件将加入待导入列表${expanded}${estimateSuffix}。`,
        confirmLabel: `导入 ${paths.length} 个文件`,
        danger: false,
        progressTotal: paths.length,
        busyCancelLabel: '终止扫描',
        action: () => {
          addQueue.prepareBatchProgress(paths.length)
          return addQueue.enqueueFileLocations(paths)
        }
      })
      return
    }
    await addQueue.enqueueFileLocations(paths)
  }

  function handleWindowFileDrops(batches: string[][]) {
    if (!batches.length) return
    addOpen.value = true
    for (const entries of batches) {
      enqueueImportEntries(entries).catch(cause => {
        ports.reportError(cause, '读取文件失败')
      })
    }
  }

  function handleWindowURLDrops(batches: string[][]) {
    if (!batches.length) return
    addOpen.value = true
    requestAddURLs(batches.flat())
  }

  /*
   * 粘贴（#188）。
   *
   * OS 的剪贴板文件接口只认文件；没有文件时读取文本与 HTML，用与链接弹窗相同的解析器
   * 全文提取多个链接后批量入队。paste 事件直接传入文本（拿不到 HTML），按钮入口读取
   * 当前剪贴板的完整内容。
   */
  async function pasteFilePaths(clipboardText?: string) {
    try {
      const paths = await ports.getClipboardFilePaths()
      if (!addOpen.value) return
      if (paths.length) {
        await enqueueImportEntries(paths)
        return
      }
      const content: Pick<ClipboardContentDTO, 'text' | 'html' | 'base_url'> =
        clipboardText === undefined ? await ports.readClipboardContent() : { text: clipboardText }
      if (!addOpen.value) return
      const { candidates } = extractImportLinks({
        text: content.text,
        html: content.html,
        baseUrl: content.base_url
      })
      if (candidates.length) {
        requestAddURLs(candidates.map(candidate => candidate.url))
        return
      }
      ports.notifyWarning('剪切板中没有可导入的文件或有效链接')
    } catch {
      ports.notifyWarning('无法读取剪切板，请重试')
    }
  }

  async function pickFrom(chooser: () => Promise<string[]>, fallbackError: string) {
    try {
      const entries = await chooser()
      if (!entries.length || !addOpen.value) return
      await enqueueImportEntries(entries)
    } catch (cause) {
      ports.reportError(cause, fallbackError)
    }
  }

  function pickFiles() {
    return pickFrom(() => ports.chooseFilePaths(), '选择文件失败')
  }

  function pickFilesOnly() {
    return pickFrom(() => ports.chooseFilesOnly(), '选择文件失败')
  }

  function pickDirectories() {
    return pickFrom(() => ports.chooseDirectories(), '选择文件夹失败')
  }

  /**
   * URL 项走后端批量纳入：一次 RPC 内并发探测，逐项进度经事件回流。
   * 批量 RPC 整体失败时无法区分单条，统一按失败结算，队列保留可重试。
   */
  function isResourceDTO(value: unknown): value is ResourceDTO {
    return typeof value === 'object' && value !== null && typeof (value as { id?: unknown }).id === 'string'
  }

  function flushUpserts(resources: ResourceDTO[]) {
    if (!resources.length) return
    if (ports.upsertResources) {
      ports.upsertResources(resources)
      return
    }
    for (const resource of resources) ports.upsertResource(resource)
  }

  function createURLBatch(
    items: LibraryQueueItem[],
    settle: (itemId: string, settlement: LibraryBatchSettlement) => void,
    pendingUpserts: ResourceDTO[]
  ): LibraryBatchTask {
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const inputs: CreateResourceInputDTO[] = items.map(item => ({
      kind: SourceType.SourceTypeURL,
      location: item.location,
      title: item.title,
      tags: item.tags
    }))
    const unsubscribe = ports.onResourceBatchProgress(event => {
      if (event.batch_id !== batchId) return
      const item = items[event.index]
      if (!item) return
      if (event.status === 'created') addQueue.setItemStatus(item.id, 'created')
      else addQueue.setItemStatus(item.id, 'failed', event.error ?? '导入失败')
    })
    const done = (async () => {
      try {
        const results = await ports.createResources(batchId, inputs)
        results.forEach((result, index) => {
          const item = items[index]
          if (!item) return
          if (result.cancelled) {
            settle(item.id, { ok: false, cancelled: true })
            return
          }
          settle(item.id, { ok: Boolean(result.resource) && !result.error, error: result.error })
          if (result.resource) pendingUpserts.push(result.resource)
        })
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : '批量导入失败'
        items.forEach(item => settle(item.id, { ok: false, error: message }))
      } finally {
        unsubscribe()
      }
    })()
    return { done, cancel: () => void ports.cancelResourceBatch(batchId) }
  }

  async function submitQueue() {
    const pendingUpserts: ResourceDTO[] = []
    try {
      const completed = await addQueue.submit(
        async item => {
          const saved = await ports.addResource(item, { deferUpsert: true })
          if (isResourceDTO(saved)) pendingUpserts.push(saved)
        },
        (items, settle): LibraryBatchTask => createURLBatch(items, settle, pendingUpserts)
      )
      if (completed) {
        addOpen.value = false
        return
      }
      if (addQueue.failureCount.value > 0) {
        ports.notifyWarning(`${addQueue.failureCount.value} 项导入失败，可在待导入列表重试`)
      }
    } catch (cause) {
      ports.reportError(cause, '导入资源失败，请稍后重试')
    } finally {
      // 整批完成后一次性写入 store，避免逐条写入触发主列表高频重算与重排。
      flushUpserts(pendingUpserts)
    }
  }

  function openRestoreDialog(items: LibraryRestoreQueueItem[]) {
    if (!items.length || restoreBusy.value) return
    restoreQueue.value = items
    failedRestoreIds.value = []
    activeRestoreItemId.value = null
    restoreOpen.value = true
  }

  function setRestoreOpen(open: boolean) {
    restoreOpen.value = open
  }

  async function submitRestoreQueue(items: LibraryRestoreQueueItem[]) {
    if (!items.length || restoreBusy.value) return
    restoreBusy.value = true
    activeRestoreItemId.value = null
    const pendingUpserts: ResourceDTO[] = []
    try {
      const result = await restoreLibraryQueue(items, {
        replaceSource: async (sourceId, input) => {
          const updated = await ports.replaceSource(sourceId, input, { deferUpsert: true })
          if (isResourceDTO(updated)) pendingUpserts.push(updated)
        },
        replaceScannedFileSource: async (sourceId, inputPath, snapshot) => {
          const updated = await ports.replaceScannedFileSource(sourceId, inputPath, snapshot, { deferUpsert: true })
          if (isResourceDTO(updated)) pendingUpserts.push(updated)
        },
        onItemStart: itemId => {
          activeRestoreItemId.value = itemId
        }
      })
      const completedIds = new Set(result.completedIds)
      restoreQueue.value = restoreQueue.value.filter(item => !completedIds.has(item.id))
      if (result.failures.length) {
        failedRestoreIds.value = result.failures.map(failure => failure.item.id)
        ports.reportError(result.failures[0].cause, `有 ${result.failures.length} 项找回失败，请重试`)
        return
      }
      if (!restoreQueue.value.length) setRestoreOpen(false)
    } finally {
      // 整批找回结束后一次性合并写回主列表。
      flushUpserts(pendingUpserts)
      activeRestoreItemId.value = null
      restoreBusy.value = false
    }
  }

  return {
    addOpen,
    confirmBusy,
    confirmOpen,
    confirmRequest,
    confirmButtonLabel,
    restoreOpen,
    restoreQueue,
    restoreBusy,
    failedRestoreIds,
    activeRestoreItemId,
    openConfirmDialog,
    runConfirmedAction,
    closeConfirmDialog,
    cancelConfirmDialog,
    openAddDialog,
    setAddOpen,
    handleAddDialogClosed,
    handleWindowFileDrops,
    handleWindowURLDrops,
    pasteFilePaths,
    requestAddURLs,
    enqueueImportEntries,
    pickFiles,
    pickFilesOnly,
    pickDirectories,
    submitQueue,
    openRestoreDialog,
    setRestoreOpen,
    submitRestoreQueue
  }
}
