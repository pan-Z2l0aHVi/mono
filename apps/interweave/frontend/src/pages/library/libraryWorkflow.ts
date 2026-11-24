import { computed, ref, type ComputedRef, type Ref } from 'vue'

import type { LibraryAddQueueController } from '@/components/library/addQueue'
import { normalizeLibraryURL, restoreLibraryQueue, type LibraryRestoreQueueItem } from '@/components/library/restore'
import type { LibraryQueueItem } from '@/services/library'

/**
 * 单批导入的确认阈值，按展开后的文件总数计（文件多选、文件夹递归、两者混选同一条链）。
 *
 * 数值依据：目标是「点导入 → 待导入列表就绪」不超过 1s，超过就该先拦下来征得同意。
 * 实测（M2/16G，300 文件批）前 1.5s 只入队 32 项、末段降到约 3 项/秒；后端侧展开与重复
 * 检查摊销仅约 15µs/文件，耗时几乎全在待导入列表逐项渲染，因此 1s 大约只对应 20 个文件。
 * 列表渲染优化（虚拟化/延迟挂预览）后应按新曲线重估，而不是凭感觉调大。
 */
export const IMPORT_CONFIRM_THRESHOLD = 20

export interface ConfirmRequest {
  title: string
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
 * 错误消费与提示回调，不直接绑定 Wails 运行时或 Pinia store。
 */
export interface LibraryWorkflowPorts {
  addQueue: Pick<
    LibraryAddQueueController,
    | 'submitting'
    | 'progress'
    | 'prepareBatchProgress'
    | 'enqueueFileLocations'
    | 'enqueueURL'
    | 'resolveDuplicate'
    | 'submit'
    | 'close'
  >
  expandImportEntries(entries: string[]): Promise<{ files: string[]; folders: number }>
  chooseFilePaths(): Promise<string[]>
  getClipboardFilePaths(): Promise<string[]>
  readClipboardText(): Promise<string>
  addResource(item: LibraryQueueItem): Promise<unknown>
  replaceSource(sourceId: string, input: string): Promise<unknown>
  replaceScannedFileSource(sourceId: string, inputPath: string, snapshot: string): Promise<unknown>
  consumeError(cause: unknown, fallback: string): string
  notifyWarning(message: string): void
}

export interface LibraryWorkflow {
  addOpen: Ref<boolean>
  addError: Ref<string>
  confirmBusy: Ref<boolean>
  confirmOpen: Ref<boolean>
  confirmRequest: Ref<ConfirmRequest | null>
  confirmError: Ref<string>
  confirmButtonLabel: ComputedRef<string>
  restoreOpen: Ref<boolean>
  restoreQueue: Ref<LibraryRestoreQueueItem[]>
  restoreBusy: Ref<boolean>
  restoreError: Ref<string>
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
  requestAddURL(url: string): void
  enqueueImportEntries(entries: string[]): Promise<void>
  pickFiles(): Promise<void>
  submitQueue(): Promise<void>
  openRestoreDialog(items: LibraryRestoreQueueItem[]): void
  setRestoreOpen(open: boolean): void
  setRestoreQueue(items: LibraryRestoreQueueItem[]): void
  submitRestoreQueue(items: LibraryRestoreQueueItem[]): Promise<void>
}

/**
 * 资源库页工作流状态机：统一收口确认弹窗串行队列、批量导入阈值门控、
 * 提交期间入队拦截与找回提交结算，使页面组件只负责视图绑定与导航。
 */
export function createLibraryWorkflow(ports: LibraryWorkflowPorts): LibraryWorkflow {
  const { addQueue } = ports

  const addOpen = ref(false)
  const addError = ref('')

  const confirmBusy = ref(false)
  const confirmOpen = ref(false)
  const confirmRequest = ref<ConfirmRequest | null>(null)
  const confirmError = ref('')

  const restoreOpen = ref(false)
  const restoreQueue = ref<LibraryRestoreQueueItem[]>([])
  const restoreBusy = ref(false)
  const restoreError = ref('')
  const failedRestoreIds = ref<string[]>([])
  const activeRestoreItemId = ref<string | null>(null)

  /** 批量确认串行排队：并发触发的多个超阈值批次依次展示，后到的等待当前弹窗结算，不互相覆盖。 */
  const pendingConfirmRequests: ConfirmRequest[] = []

  function openConfirmDialog(request: ConfirmRequest) {
    if (confirmOpen.value) {
      pendingConfirmRequests.push(request)
      return
    }
    confirmError.value = ''
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
    confirmError.value = ''
    confirmRequest.value = next
    confirmOpen.value = true
  }

  async function runConfirmedAction() {
    const request = confirmRequest.value
    if (!request || confirmBusy.value) return
    confirmError.value = ''
    confirmBusy.value = true
    try {
      await request.action()
      closeConfirmDialog()
    } catch (cause) {
      confirmError.value = ports.consumeError(cause, '操作失败，请稍后重试')
    } finally {
      confirmBusy.value = false
    }
  }

  /**
   * 确认弹窗的取消：导入进行中它显示为「停止」。
   * 停止只作用于当前批次与已入队项，排队等待确认的其它批次仍会依次弹出——
   * 它们还没开始导入，各自仍需要一次显式放行，停止不该替用户把它们一并丢弃。
   * action 随后自行结算，runConfirmedAction 走正常关闭，这里不提前翻 open。
   */
  function cancelConfirmDialog() {
    if (confirmBusy.value && confirmRequest.value?.busyCancelLabel) {
      void addQueue.close()
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
    addError.value = ''
    addOpen.value = true
  }

  function setAddOpen(open: boolean) {
    addOpen.value = open
    if (!open) addQueue.resolveDuplicate(false)
  }

  function handleAddDialogClosed() {
    if (addOpen.value) return
    addError.value = ''
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
  function requestAddURL(url: string) {
    if (addQueue.submitting.value) {
      warnImportInProgress()
      return
    }
    void addQueue.enqueueURL(url)
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
      openConfirmDialog({
        title: '批量导入',
        message: `共 ${paths.length} 个文件将加入待导入列表${expanded}。`,
        confirmLabel: `导入 ${paths.length} 个文件`,
        danger: false,
        progressTotal: paths.length,
        busyCancelLabel: '停止',
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
    addError.value = ''
    addOpen.value = true
    for (const entries of batches) {
      enqueueImportEntries(entries).catch(cause => {
        addError.value = ports.consumeError(cause, '读取文件失败')
      })
    }
  }

  function handleWindowURLDrops(batches: string[][]) {
    if (!batches.length) return
    addError.value = ''
    addOpen.value = true
    for (const urls of batches) {
      for (const url of urls) requestAddURL(url)
    }
  }

  /*
   * 粘贴（#188）。
   *
   * OS 的剪贴板文件接口只认文件；没有文件时读取文本并尝试作为链接入队。
   * paste 事件直接传入文本，按钮入口则读取当前剪贴板。
   */
  async function pasteFilePaths(clipboardText?: string) {
    try {
      addError.value = ''
      const paths = await ports.getClipboardFilePaths()
      if (!addOpen.value) return
      if (paths.length) {
        await enqueueImportEntries(paths)
        return
      }
      const text = clipboardText ?? (await ports.readClipboardText())
      if (!addOpen.value) return
      const url = normalizeLibraryURL(text)
      if (url) {
        requestAddURL(url)
        return
      }
      ports.notifyWarning('剪切板中没有可导入的文件或有效链接')
    } catch {
      ports.notifyWarning('无法读取剪切板，请重试')
    }
  }

  async function pickFiles() {
    try {
      addError.value = ''
      const entries = await ports.chooseFilePaths()
      if (!entries.length || !addOpen.value) return
      await enqueueImportEntries(entries)
    } catch (cause) {
      addError.value = ports.consumeError(cause, '选择文件失败')
    }
  }

  async function submitQueue() {
    addError.value = ''
    try {
      const completed = await addQueue.submit(async item => {
        await ports.addResource(item)
      })
      if (completed) addOpen.value = false
    } catch (cause) {
      addError.value = ports.consumeError(cause, '导入资源失败，请稍后重试')
    }
  }

  function openRestoreDialog(items: LibraryRestoreQueueItem[]) {
    if (!items.length || restoreBusy.value) return
    restoreQueue.value = items
    restoreError.value = ''
    failedRestoreIds.value = []
    activeRestoreItemId.value = null
    restoreOpen.value = true
  }

  function setRestoreOpen(open: boolean) {
    restoreOpen.value = open
  }

  function setRestoreQueue(items: LibraryRestoreQueueItem[]) {
    restoreQueue.value = items
  }

  async function submitRestoreQueue(items: LibraryRestoreQueueItem[]) {
    if (!items.length || restoreBusy.value) return
    restoreBusy.value = true
    restoreError.value = ''
    activeRestoreItemId.value = null
    try {
      const result = await restoreLibraryQueue(items, {
        replaceSource: (sourceId, input) => ports.replaceSource(sourceId, input),
        replaceScannedFileSource: (sourceId, inputPath, snapshot) =>
          ports.replaceScannedFileSource(sourceId, inputPath, snapshot),
        onItemStart: itemId => {
          activeRestoreItemId.value = itemId
        }
      })
      const completedIds = new Set(result.completedIds)
      restoreQueue.value = restoreQueue.value.filter(item => !completedIds.has(item.id))
      if (result.failures.length) {
        failedRestoreIds.value = result.failures.map(failure => failure.item.id)
        restoreError.value = ports.consumeError(
          result.failures[0].cause,
          `有 ${result.failures.length} 项找回失败，请重试`
        )
        return
      }
      if (!restoreQueue.value.length) setRestoreOpen(false)
    } finally {
      activeRestoreItemId.value = null
      restoreBusy.value = false
    }
  }

  return {
    addOpen,
    addError,
    confirmBusy,
    confirmOpen,
    confirmRequest,
    confirmError,
    confirmButtonLabel,
    restoreOpen,
    restoreQueue,
    restoreBusy,
    restoreError,
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
    requestAddURL,
    enqueueImportEntries,
    pickFiles,
    submitQueue,
    openRestoreDialog,
    setRestoreOpen,
    setRestoreQueue,
    submitRestoreQueue
  }
}
