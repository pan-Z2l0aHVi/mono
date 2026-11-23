<script setup lang="ts">
import { toast, type WebUiEditableText, type WebUiEvent, type WebUiTextarea } from '@greypan/web-ui'
import { useElementSize } from '@vueuse/core'
import { computed, nextTick, onMounted, onScopeDispose, ref, watch, type ComponentPublicInstance } from 'vue'
import { useRouter } from 'vue-router'

import AddDialog from '@/components/library/AddDialog.vue'
import { createLibraryAddQueue } from '@/components/library/addQueue'
import ConfirmDialog from '@/components/library/ConfirmDialog.vue'
import DetailDrawer from '@/components/library/DetailDrawer.vue'
import DuplicateConfirmDialog from '@/components/library/DuplicateConfirmDialog.vue'
import EditTagsDialog from '@/components/library/EditTagsDialog.vue'
import PreviewDrawer from '@/components/library/PreviewDrawer.vue'
import { createPreviewLease } from '@/components/library/previewLease'
import { DRAWER_TITLE_EDITOR_KEY, type NameEditorRef } from '@/components/library/rename'
import ResourceList from '@/components/library/ResourceList.vue'
import {
  createLibraryRestoreQueue,
  createLibraryRestoreQueueItem,
  normalizeLibraryURL,
  restoreLibraryQueue,
  type LibraryRestoreQueueItem
} from '@/components/library/restore'
import RestoreDialog from '@/components/library/RestoreDialog.vue'
import Toolbar from '@/components/library/Toolbar.vue'
import {
  MENU_ADD_RESOURCE_EVENT,
  MENU_FOCUS_SEARCH_EVENT,
  MENU_IMPORT_FROM_CLIPBOARD_EVENT,
  MENU_IMPORT_FROM_LINK_EVENT,
  MENU_REFRESH_EVENT,
  MENU_TOGGLE_FILTER_BAR_EVENT,
  onMenuAction
} from '@/composables/menuActions'
import { selectLitEditor } from '@/composables/useEditorFocusRestore'
import { canGoBack, canGoForward } from '@/composables/useHistoryNav'
import { useLayoutMobile } from '@/composables/useLayoutMobile'
import { useLibraryRuntime } from '@/composables/useLibraryRuntime'
import { useLibrarySelection } from '@/composables/useLibrarySelection'
import { pendingWindowFileDrops, pendingWindowURLDrops } from '@/composables/windowFileDrop'
import type { LibraryQueueItem } from '@/services/library'
import { userMessage } from '@/services/library/userMessage'
import { useLibraryStore } from '@/stores/library'
import type { ResourceSourceView, ResourceView } from '@/stores/library'

interface ConfirmRequest {
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

const router = useRouter()
const store = useLibraryStore()
const {
  runtime,
  isLoading,
  pendingResourceIds,
  replacingSourceIds,
  error: runtimeError,
  loadResources,
  addResource,
  renameResource,
  updateResourceNote,
  deleteResources,
  saveTags,
  replaceSource,
  defaultOpenWith,
  openExternal,
  saveSourceThumbnail,
  probeURLSourceOnOpen
} = useLibraryRuntime()

// 页面级 overlay（详情/预览 drawer、各类 dialog）跟着壳的移动端判定走，不自己写断点。
const mobile = useLayoutMobile()
const headerRef = ref<HTMLElement | null>(null)
const { height: headerHeight } = useElementSize(headerRef)
const filterOpen = ref(false)
const searchOpen = ref(false)
const activeResourceId = ref<string | null>(null)
const activeTagTarget = ref<ResourceView | LibraryQueueItem | null>(null)
const detailOpen = ref(false)
// 选择态进入时的详情关闭要带上 drawer 自己的收尾（编辑器复位、激活行清空）：
// 选择 composable 拿到的是这个可写视图，它的 detailOpen=false 写入等价于 setDetailOpen(false)。
const detailOpenView = computed({
  get: () => detailOpen.value,
  set: open => setDetailOpen(open)
})
const previewOpen = ref(false)
const tagsOpen = ref(false)
const addOpen = ref(false)
const restoreOpen = ref(false)
const restoreQueue = ref<LibraryRestoreQueueItem[]>([])
const restoreBusy = ref(false)
const restoreError = ref('')
const failedRestoreIds = ref<string[]>([])
const activeRestoreItemId = ref<string | null>(null)
// 添加队列与找回弹窗共用一本预览账本：token 结算、驱逐对账都只在 lease 里发生。
const previewLease = createPreviewLease(runtime)
const previewEntries = previewLease.entries
const addQueue = createLibraryAddQueue(runtime, previewLease)
const queue = addQueue.queue
const duplicatePrompt = addQueue.duplicatePrompt
const submitting = addQueue.submitting
const importProgress = addQueue.progress
const confirmBusy = ref(false)
const confirmOpen = ref(false)
const confirmRequest = ref<ConfirmRequest | null>(null)
const confirmError = ref('')
const resourceListRef = ref<InstanceType<typeof ResourceList>>()
let pendingDeleteFocus: number | null = null
const addError = ref('')
/** 菜单「导入来自 › 链接」要把 AddDialog 直接翻到链接输入，因此保留组件引用。 */
const addDialogRef = ref<InstanceType<typeof AddDialog> | null>(null)
watch(
  pendingWindowFileDrops,
  batches => {
    if (!batches.length) return
    pendingWindowFileDrops.value = []
    addError.value = ''
    addOpen.value = true
    for (const entries of batches) {
      // 拖入与点选同口径：目录递归展开、超阈值先确认再入队。
      enqueueImportEntries(entries).catch(cause => {
        addError.value = takeOperationError(cause, '读取文件失败')
      })
    }
  },
  { immediate: true }
)
watch(
  pendingWindowURLDrops,
  batches => {
    if (!batches.length) return
    pendingWindowURLDrops.value = []
    addError.value = ''
    addOpen.value = true
    for (const urls of batches) {
      for (const url of urls) requestAddURL(url)
    }
  },
  { immediate: true }
)
const stopSourceAvailability = runtime.events.onSourceAvailability(event => {
  store.applySourceAvailability(event.source_id, event.available, event.size_bytes)
})

/*
 * 菜单里落在资源库页上的动作。壳层负责切路由，页面负责执行领域逻辑：
 * 开添加对话框、从剪贴板或链接导入、重新读库（可用性由后端监听维护，重读即拿到最新状态）、
 * 翻开筛选栏与聚焦搜索。
 */
const stopMenuActions = [
  onMenuAction(MENU_ADD_RESOURCE_EVENT, openAddDialog),
  onMenuAction(MENU_IMPORT_FROM_CLIPBOARD_EVENT, () => {
    addOpen.value = true
    void pasteFilePaths()
  }),
  onMenuAction(MENU_IMPORT_FROM_LINK_EVENT, openAddLinkDialog),
  onMenuAction(MENU_REFRESH_EVENT, () => {
    void loadResources().catch(() => {
      // 错误由 runtimeError 呈现，列表保持当前内容。
    })
  }),
  onMenuAction(MENU_TOGGLE_FILTER_BAR_EVENT, () => {
    // 「切换」名副其实：开着就收起。单向展开会让菜单项在筛选栏已开时看起来毫无反应。
    filterOpen.value = !filterOpen.value
  }),
  onMenuAction(MENU_FOCUS_SEARCH_EVENT, () => {
    searchOpen.value = true
  })
]

onScopeDispose(() => {
  stopSourceAvailability()
  stopMenuActions.forEach(stop => stop())
  void addQueue.close()
  void previewLease.clear()
  previewLease.dispose()
})

const visibleResources = computed(() => store.filteredResources)
const selectedResource = computed(
  () => store.resources.find(resource => resource.id === activeResourceId.value) ?? null
)
const {
  selectionMode,
  checkedIds,
  allVisibleSelected,
  selectedResources,
  canRestore,
  toggleSelectionMode,
  toggleChecked,
  setResourceChecked,
  toggleCheckAll
} = useLibrarySelection({
  visibleResources,
  resources: computed(() => store.resources),
  detailOpen: detailOpenView,
  filterOpen,
  stopResourceRename
})
// 标题由 runtimeAvailable 决定（资源库为空 / 桌面服务未连接），描述必须跟着同一判据走：
// 未连接时给出「为什么是空的」的说明，正常使用为空时才讲资源库本身，否则会出现
// 「桌面服务未连接」配「资源库还是空的」这种自相矛盾的组合。
const emptyDescription = computed(() => {
  if (!runtime.isAvailable) return '请在桌面应用中打开资源库。'
  return store.hasActiveFilter ? '没有符合条件的资源' : '资源库还是空的'
})
const allTagNames = computed(() =>
  [...new Set([...store.allTagNames, ...queue.value.flatMap(item => item.tags)])].sort()
)

const editingNameKey = ref<string | null>(null)
const resourceNameEditors = ref<Record<string, WebUiEditableText | null>>({})
const nameEditorRefCallbacks = new Map<string, NameEditorRef>()

function setNameEditorRef(id: string): NameEditorRef {
  let callback = nameEditorRefCallbacks.get(id)
  if (!callback) {
    callback = (element: Element | ComponentPublicInstance | null) => {
      resourceNameEditors.value[id] = element instanceof Element ? (element as WebUiEditableText) : null
    }
    nameEditorRefCallbacks.set(id, callback)
  }
  return callback
}

function startResourceRename(resource: ResourceView, surface: 'list' | 'drawer' = 'list') {
  const key = surface === 'drawer' ? DRAWER_TITLE_EDITOR_KEY : resource.id
  editingNameKey.value = key
  // 编辑器实例要等本轮渲染挂上；selectLitEditor 负责 updateComplete + WebKit 单帧等待。
  void nextTick(() => {
    const editor = resourceNameEditors.value[key]
    void selectLitEditor(editor, () => editingNameKey.value === key && resourceNameEditors.value[key] === editor)
  })
}

function stopResourceRename() {
  editingNameKey.value = null
}

function selectResource(resource: ResourceView) {
  // 选择态里这个分支只剩「手指点一下勾选框」会走到：鼠标和长按扫选都在 pointerdown
  // 就落定状态，随后的 click 被 ResourceList 吃掉了，不会翻回去。
  if (selectionMode.value) {
    toggleChecked(resource.id)
    return
  }
  previewResource(resource)
}

/*
 * 打开详情顺手验一下失效 URL：只在当前判为不可用时探测（策略见 probeURLSourceOnOpen）。
 * 左键进的是预览，不经过这里——预览不是「打开详情」，不该发出网络请求。
 */
function openResourceDetail(resource: ResourceView) {
  activeResourceId.value = resource.id
  detailOpen.value = true
  void probeURLSourceOnOpen(resource.preferred)
}

function previewResource(resource: ResourceView) {
  activeResourceId.value = resource.id
  previewOpen.value = true
}

/*
 * 「打开方式」只呈现系统默认应用的真实名字，不枚举候选应用：名字仅用于文案，打开动作仍交给
 * openExternal，由操作系统按默认关联执行。查不到名字（或不可用资源没有可信位置）时回落到
 * 空串，由调用方显示通用文案。
 */
function resolveDefaultOpenWith(resource: ResourceView) {
  if (!resource.available) return Promise.resolve('')
  const target = resource.preferred?.location
  if (!target) return Promise.resolve('')
  return defaultOpenWith(target)
}

async function openResource(resource: ResourceView) {
  const target = resource.preferred?.location
  if (!resource.available || !target) return
  await openExternal(target)
}

async function showInFileManager(source: ResourceSourceView) {
  try {
    await runtime.system.showInFileManager(source.location)
  } catch (cause) {
    console.error('无法在文件管理器中打开文件', cause)
    toast.warning('无法打开文件所在的位置，请检查文件是否还在原处', { position: 'top-center' })
  }
}

/*
 * 右键「重命名」要把目标行置成激活行。
 *
 * 与另两条入口同一个理由：被操作的那一条就是当前工作对象。名字编辑器还占着焦点、
 * 且会被 clampEditingRowIntoView 钉在视口里，那一行也正是用户此刻看着的一行。
 */
function renameResourceFromMenu(resource: ResourceView) {
  activeResourceId.value = resource.id
  startResourceRename(resource)
}

function editResourceTags(resource: ResourceView) {
  activeResourceId.value = resource.id
  activeTagTarget.value = resource
  tagsOpen.value = true
}

function editQueueTags(item: LibraryQueueItem) {
  activeTagTarget.value = item
  tagsOpen.value = true
}

function setDetailOpen(open: boolean) {
  detailOpen.value = open
  if (!open) {
    if (editingNameKey.value === DRAWER_TITLE_EDITOR_KEY) stopResourceRename()
    activeResourceId.value = null
  }
}

function requestDeleteResource(resource: ResourceView) {
  openConfirmDialog({
    title: '删除资源',
    message: `删除「${resource.title}」后无法恢复。`,
    confirmLabel: '删除',
    danger: true,
    action: async () => {
      const index = visibleResources.value.findIndex(item => item.id === resource.id)
      const deletedIds = await deleteResources([resource.id])
      if (deletedIds.includes(resource.id) && !detailOpen.value) pendingDeleteFocus = Math.max(index, 0)
      finishDelete(deletedIds)
    }
  })
}

function requestDeleteSelected() {
  const ids = [...checkedIds.value]
  if (!ids.length) return
  openConfirmDialog({
    title: '删除资源',
    message: `删除选中的 ${ids.length} 个资源后无法恢复。`,
    confirmLabel: '删除',
    danger: true,
    action: async () => {
      const index = visibleResources.value.findIndex(item => ids.includes(item.id))
      const deletedIds = await deleteResources(ids)
      if (deletedIds.length && !detailOpen.value) pendingDeleteFocus = Math.max(index, 0)
      finishDelete(deletedIds)
      if (deletedIds.length === ids.length) {
        selectionMode.value = false
        checkedIds.value = []
      }
    }
  })
}

function finishDelete(deletedIds: string[]) {
  const deleted = new Set(deletedIds)
  checkedIds.value = checkedIds.value.filter(id => !deleted.has(id))
  if (activeResourceId.value && deleted.has(activeResourceId.value)) {
    setDetailOpen(false)
    previewOpen.value = false
  }
}

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

async function runConfirmedAction() {
  const request = confirmRequest.value
  if (!request || confirmBusy.value) return
  confirmError.value = ''
  confirmBusy.value = true
  try {
    await request.action()
    closeConfirmDialog()
  } catch (cause) {
    confirmError.value = takeOperationError(cause, '操作失败，请稍后重试')
  } finally {
    confirmBusy.value = false
  }
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
  if (confirmBusy.value && total > 0) return `${importProgress.value.done} / ${total}`
  return label
})

function restoreDeletedFocus() {
  if (pendingDeleteFocus === null) return
  const index = pendingDeleteFocus
  pendingDeleteFocus = null
  void nextTick(() => resourceListRef.value?.focusNearest(index))
}

function takeOperationError(cause: unknown, fallback: string) {
  const message = userMessage(cause, runtimeError.value || fallback)
  runtimeError.value = ''
  return message
}

function openAddDialog() {
  addError.value = ''
  addOpen.value = true
}

/*
 * 「导入来自 › 链接」打开添加对话框并直接翻开链接输入。
 *
 * 用户已经声明了要从链接导入，不该再让他在对话框里点一次「添加链接」；仍然保留外层
 * 对话框，是因为链接提交后它会被并入同一个待添加队列，用户还能在提交前改名称与标签。
 */
function openAddLinkDialog() {
  openAddDialog()
  // 同步调用是安全的：AddDialog 的 open watch 复位的是它自己的子面板状态，
  // 而 openLinkDialog 写的是同一个 ref，后写的这一次才是用户要的结果。
  addDialogRef.value?.openLinkDialog()
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

/*
 * 粘贴（#188）。
 *
 * OS 的剪贴板文件接口只认文件；没有文件时读取文本并尝试作为链接入队。
 * paste 事件直接传入文本，按钮入口则读取当前剪贴板。
 */
async function pasteFilePaths(clipboardText?: string) {
  try {
    addError.value = ''
    const paths = await runtime.system.getClipboardFilePaths()
    if (!addOpen.value) return
    if (paths.length) {
      await enqueueImportEntries(paths)
      return
    }
    const text = clipboardText ?? (await runtime.system.readClipboardText())
    if (!addOpen.value) return
    const url = normalizeLibraryURL(text)
    if (url) {
      requestAddURL(url)
      return
    }
    toast.warning('剪切板中没有可导入的文件或有效链接', { position: 'top-center' })
  } catch {
    toast.warning('无法读取剪切板，请重试', { position: 'top-center' })
  }
}

/** 提交期间所有入队入口共用的提示：文案只在这里维护。 */
function warnImportInProgress() {
  toast.warning('正在导入当前批次，请等它完成再继续添加', { position: 'top-center' })
}

/**
 * 统一挡下提交期间的链接入队：窗口拖入与粘贴文本都不经 enqueueImportEntries，
 * 提交按快照结算、成功时整队清空，期间入队的链接会被静默丢弃。
 */
function requestAddURL(url: string) {
  if (submitting.value) {
    warnImportInProgress()
    return
  }
  void addQueue.enqueueURL(url)
}

/**
 * 单批导入的确认阈值，按展开后的文件总数计（文件多选、文件夹递归、两者混选同一条链）。
 *
 * 数值依据：目标是「点导入 → 待导入列表就绪」不超过 1s，超过就该先拦下来征得同意。
 * 实测（M2/16G，300 文件批）前 1.5s 只入队 32 项、末段降到约 3 项/秒；后端侧展开与重复
 * 检查摊销仅约 15µs/文件，耗时几乎全在待导入列表逐项渲染，因此 1s 大约只对应 20 个文件。
 * 列表渲染优化（虚拟化/延迟挂预览）后应按新曲线重估，而不是凭感觉调大。
 */
const IMPORT_CONFIRM_THRESHOLD = 20

/*
 * 统一的导入入口展开：选择面板、拖入与剪贴板都走同一条链——
 * 后端把目录递归展开成文件清单（文件原样保留，隐藏项与符号链接由后端过滤），
 * 超过阈值先经页面确认弹窗显式放行，确认动作就是整条入队链，逐项重复提示结算完毕它才关闭。
 */
async function enqueueImportEntries(entries: string[]) {
  // 提交循环按快照结算、结束时整队清空：提交期间继续入队的项会被静默丢弃，
  // 三个入口（面板/拖入/粘贴）统一在这里挡下并给出可读提示。
  if (submitting.value) {
    warnImportInProgress()
    return
  }
  const expansion = await runtime.resources.expandImportEntries(entries)
  if (!addOpen.value) return
  // 大目录展开可能跨过用户点提交的时刻：返回后复查一次，别把这一批塞进正在结算的队列。
  if (submitting.value) {
    warnImportInProgress()
    return
  }
  const paths = expansion.files
  if (!paths.length) {
    toast.warning('所选内容里没有可导入的文件', { position: 'top-center' })
    return
  }
  if (paths.length > IMPORT_CONFIRM_THRESHOLD) {
    // 句子的前半句对所有批量选中成立；只有确实展开了文件夹才补一句展开说明。
    const expanded = expansion.folders > 0 ? `（${expansion.folders} 个文件夹已递归展开）` : ''
    openConfirmDialog({
      title: '确认批量导入',
      message: `共 ${paths.length} 个文件将加入待导入列表${expanded}。`,
      confirmLabel: `导入 ${paths.length} 个文件`,
      danger: false,
      progressTotal: paths.length,
      busyCancelLabel: '停止',
      action: () => {
        // 入队链可能还在处理上一批：先把共享进度重置到本批规模，
        // 忙按钮一出现就是「0 / N」，不会拿上一批的 done 配本批的 total。
        importProgress.value = { done: 0, total: paths.length }
        return addQueue.enqueueFileLocations(paths)
      }
    })
    return
  }
  await addQueue.enqueueFileLocations(paths)
}

async function pickFiles() {
  try {
    addError.value = ''
    const entries = await runtime.system.chooseFilePaths()
    if (!entries.length || !addOpen.value) return
    await enqueueImportEntries(entries)
  } catch (cause) {
    addError.value = takeOperationError(cause, '选择文件失败')
  }
}

function renameQueueItem(itemId: string, title: string) {
  addQueue.renameItem(itemId, title)
}

/*
 * 提交循环、preview token 结算与失败回卷都由 addQueue.submit 拥有；页面只保留
 * dialog 开合（#189 退场动画约定）与错误展示。controller 的 close 是队列收尾
 * （token 结算、代次推进），不是 dialog 开合——成功路径由页面关闭 AddDialog。
 */
async function submitQueue() {
  addError.value = ''
  try {
    const completed = await addQueue.submit(async item => {
      await addResource(item)
    })
    if (completed) addOpen.value = false
  } catch (cause) {
    addError.value = takeOperationError(cause, '导入资源失败，请稍后重试')
  }
}

async function handleRename(resourceId: string, title: string) {
  try {
    await renameResource(resourceId, title)
  } catch {
    // 错误由 runtimeError 呈现，详情 drawer 保持当前 Resource。
  }
}

function handleResourceNameChange(resource: ResourceView, event: WebUiEvent<WebUiEditableText, 'change'>) {
  const editor = event.currentTarget
  const title = editor.value.trim()
  const nextTitle = title || resource.title
  if (editor.value !== nextTitle) editor.value = nextTitle
  if (nextTitle !== resource.title) void handleRename(resource.id, nextTitle)
  stopResourceRename()
}

async function handleResourceNoteChange(resource: ResourceView, note: string, editor: WebUiTextarea | null) {
  if (note === resource.note) return
  try {
    await updateResourceNote(resource.id, note)
  } catch {
    // 错误由 runtimeError 呈现。store 未更新，重新渲染不会把 input 拉回旧值，
    // 这里显式写回，否则失焦后文本停在未落库的状态上。
    // drawer 可能已经切到或关掉了：editor 为空说明字段已卸载，或它已经属于别的资源，
    // 这两种情况写回都会落到不该落的 input 上。
    const current = selectedResource.value
    if (!editor || current?.id !== resource.id) return
    // 回滚目标必须是 store 的活值，不是 `resource` 那个 emit 时的快照。备注可以连续
    // 提交：先失焦发出 A，再失焦发出 B，若 B 先成功落库而 A 后失败，写回快照会把
    // B 已保存的值抹成编辑前的值——界面上看着像没存上，store 里却是新值。
    if (editor.value !== current.note) editor.value = current.note
  }
}

async function handleSaveTags(resourceId: string, tagNames: string[]) {
  const target = activeTagTarget.value
  if (!target || target.id !== resourceId) return
  if (!('tagNames' in target)) {
    addQueue.setItemTags(resourceId, tagNames)
    tagsOpen.value = false
    return
  }
  try {
    await saveTags(resourceId, tagNames)
    tagsOpen.value = false
  } catch {
    // 错误由 runtimeError 呈现；弹窗保持打开，草稿已在本地更新，用户可继续修改后再次保存。
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

function handleRecoverSource(source: ResourceSourceView) {
  const resource = store.resources.find(item => item.sources.some(itemSource => itemSource.id === source.id))
  if (!resource) return
  openRestoreDialog([createLibraryRestoreQueueItem(resource, source)])
}

function handleBatchRestore() {
  if (!canRestore.value) return
  openRestoreDialog(createLibraryRestoreQueue(selectedResources.value))
}

async function submitRestoreQueue(items: LibraryRestoreQueueItem[]) {
  if (!items.length || restoreBusy.value) return
  restoreBusy.value = true
  restoreError.value = ''
  activeRestoreItemId.value = null
  try {
    const result = await restoreLibraryQueue(items, {
      replaceSource,
      replaceScannedFileSource: async (sourceId, path, snapshot) => {
        const updated = await runtime.sources.replaceScannedFile(sourceId, path, snapshot)
        store.upsertResource(updated)
      },
      onItemStart: itemId => {
        activeRestoreItemId.value = itemId
      }
    })
    const completedIds = new Set(result.completedIds)
    restoreQueue.value = restoreQueue.value.filter(item => !completedIds.has(item.id))
    if (result.failures.length) {
      failedRestoreIds.value = result.failures.map(failure => failure.item.id)
      restoreError.value = takeOperationError(
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

onMounted(() => {
  void loadResources().catch(() => {
    // 初次加载错误由 runtimeError 呈现，并保留重试入口。
  })
})
</script>

<template>
  <!--
    本页是 AppLayout 的 shell 子节点：根节点带 slot="header" 落进 layout 的 header slot，
    其余根节点走默认 slot 落进 main。多根 fragment 正是为了这两个 slot 各占一个直属子节点，
    Vue 的 slot 不跨组件边界，页面没法从 AppLayout 那边反向声明。
  -->
  <header ref="headerRef" slot="header" class="w-full">
    <Toolbar
      :search-query="store.searchQuery"
      :filter-source="store.filterSource"
      :filter-kind="store.filterKind"
      :filter-availability="store.filterAvailability"
      :filter-tag="store.filterTag"
      :sort="store.sort"
      :sort-direction="store.sortDirection"
      :all-tag-names="store.allTagNames"
      :has-active-filter="store.hasActiveFilter"
      :filter-open="filterOpen"
      :search-open="searchOpen"
      :selection-mode="selectionMode"
      :selected-count="checkedIds.length"
      :visible-count="visibleResources.length"
      :all-visible-selected="allVisibleSelected"
      :mobile="mobile"
      :can-go-back="canGoBack"
      :can-go-forward="canGoForward"
      :can-restore="canRestore"
      @update:search-query="store.searchQuery = $event"
      @update:filter-source="store.filterSource = $event"
      @update:filter-kind="store.filterKind = $event"
      @update:filter-availability="store.filterAvailability = $event"
      @update:filter-tag="store.filterTag = $event"
      @update:sort="store.sort = $event"
      @update:sort-direction="store.sortDirection = $event"
      @update:filter-open="filterOpen = $event"
      @update:search-open="searchOpen = $event"
      @add="openAddDialog"
      @select="toggleSelectionMode"
      @select-all="toggleCheckAll"
      @delete-selected="requestDeleteSelected"
      @restore="handleBatchRestore"
      @reset="store.resetFilters()"
      @back="router.back()"
      @forward="router.forward()"
    />
  </header>

  <div class="flex min-h-0 flex-1" :style="{ minHeight: `calc(100dvh - ${headerHeight}px)` }">
    <!--
      整页滚动（body/document 滚动），不做内部滚动容器——用户裁决保留原样。因此这里没有
      overflow-y-auto 或 max-h-dvh。最小高度扣除实际 header 高度，让空态在可用内容区居中。

      底部留白用 max(64px, env(safe-area-inset-bottom))：无安全区的设备上就是 64px，
      与 pb-16 同值；设备有 home indicator 时自动变宽，把最后一行托到安全区上方。
      不能只写固定 px——env() 非零时浏览器不会把固定 px 撑开，base 的 pb-16 因此一直
      没有真正避开安全区（用户已确认接受由此产生的视觉差异）。
      桌面 Chromium 下 env() 解析为 0，两种写法都是 64px，视觉无差异；差异只在真机出现。

      虚拟滚动在整页滚动下由 ResourceList 内的 virtua WindowVirtualizer 负责：它自己沿
      offsetParent 链量出列表到文档顶的距离，本页只提供整页滚动的布局，不参与行定位。
    -->
    <main
      class="flex flex-col flex-1 min-w-0 px-8 mobile:px-3 pb-[max(64px,env(safe-area-inset-bottom))] pt-2"
      @contextmenu.capture.prevent
    >
      <div
        v-if="runtimeError"
        class="mb-3 flex min-h-10 items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/12 dark:text-red-200"
        role="alert"
      >
        <span class="min-w-0 wrap-break-word">{{ runtimeError }}</span>
        <web-ui-button size="28" variant="ghost" @click="runtimeError = ''">关闭</web-ui-button>
      </div>

      <ResourceList
        ref="resourceListRef"
        :resources="visibleResources"
        :active-resource-id="activeResourceId"
        :checked-ids="checkedIds"
        :selection-mode="selectionMode"
        :editing-name-key="editingNameKey"
        :editor-ref="setNameEditorRef"
        :loading="isLoading"
        :runtime-available="runtime.isAvailable"
        :empty-description="emptyDescription"
        :save-thumbnail-for="saveSourceThumbnail"
        :resolve-default-open-with="resolveDefaultOpenWith"
        @open-default="openResource"
        @show-in-file-manager="showInFileManager"
        @select="selectResource"
        @detail="openResourceDetail"
        @start-rename="renameResourceFromMenu"
        @edit-tags="editResourceTags"
        @delete="requestDeleteResource"
        @recover="handleRecoverSource"
        @toggle="toggleChecked"
        @set-checked="setResourceChecked"
        @rename-change="handleResourceNameChange"
        @cancel-rename="stopResourceRename"
        @activate="activeResourceId = $event.id"
      />
    </main>

    <DetailDrawer
      :open="detailOpen"
      :resource="selectedResource"
      :mobile="mobile"
      :editing-name-key="editingNameKey"
      :editor-ref="setNameEditorRef(DRAWER_TITLE_EDITOR_KEY)"
      :replacing-source-ids="replacingSourceIds"
      :resolve-default-open-with="resolveDefaultOpenWith"
      @update:open="setDetailOpen"
      @open-default="openResource"
      @show-in-file-manager="showInFileManager"
      @start-rename="startResourceRename($event, 'drawer')"
      @rename-change="handleResourceNameChange"
      @cancel-rename="stopResourceRename"
      @note-change="handleResourceNoteChange"
      @edit-tags="editResourceTags"
      @delete="requestDeleteResource"
      @preview="previewResource"
      @recover="handleRecoverSource"
    />
    <PreviewDrawer
      v-model:open="previewOpen"
      :resource="selectedResource"
      :mobile="mobile"
      @recover="handleRecoverSource"
    />
  </div>

  <AddDialog
    ref="addDialogRef"
    :open="addOpen"
    :queue="queue"
    :busy="submitting"
    :error="addError"
    :mobile="mobile"
    :tag-colors="store.tagColors"
    :previews="previewEntries"
    :progress="importProgress"
    @pick-files="pickFiles"
    @add-url="requestAddURL"
    @request-file-paths="pasteFilePaths"
    @remove="addQueue.removeItem"
    @rename="renameQueueItem"
    @edit-tags="editQueueTags"
    @submit="submitQueue"
    @update:open="setAddOpen"
    @closed="handleAddDialogClosed"
  />

  <!--
    逐项重复确认：入队链每命中一个库内已有位置就挂起一项，由这里裁决。
    添加 dialog 关闭时 addQueue.close() 会把挂起的提示按「取消」结算，因此不会留下悬空弹窗。
  -->
  <DuplicateConfirmDialog
    :open="duplicatePrompt !== null"
    :prompt="duplicatePrompt"
    @accept="addQueue.resolveDuplicate(true)"
    @cancel="addQueue.resolveDuplicate(false)"
  />

  <EditTagsDialog
    v-model:open="tagsOpen"
    :target="activeTagTarget"
    :all-tag-names="allTagNames"
    :tag-colors="store.tagColors"
    :busy="pendingResourceIds.includes(activeTagTarget?.id ?? '')"
    :error="runtimeError"
    @save="handleSaveTags"
  />

  <RestoreDialog
    :open="restoreOpen"
    :queue="restoreQueue"
    :busy="restoreBusy"
    :error="restoreError"
    :mobile="mobile"
    :active-item-id="activeRestoreItemId"
    :all-unavailable-files="
      store.resources.flatMap(resource =>
        resource.sources
          .filter(source => source.type === 'file' && !source.available)
          .map(source => createLibraryRestoreQueueItem(resource, source))
      )
    "
    :failed-ids="failedRestoreIds"
    :choose-file-path="runtime.system.chooseFilePath"
    :choose-directory="runtime.system.chooseDirectory"
    :start-scan="runtime.sources.startRecoveryScan"
    :poll-scan="runtime.sources.pollRecoveryScan"
    :cancel-scan="runtime.sources.cancelRecoveryScan"
    :discard-scan="runtime.sources.discardRecoveryScan"
    :lease="previewLease"
    @update:open="setRestoreOpen"
    @add-items="restoreQueue = $event"
    @submit="submitRestoreQueue"
  />

  <ConfirmDialog
    :open="confirmOpen"
    :title="confirmRequest?.title ?? ''"
    :message="confirmRequest?.message ?? ''"
    :confirm-label="confirmButtonLabel"
    :danger="confirmRequest?.danger ?? false"
    :busy="confirmBusy"
    :busy-cancel-label="confirmRequest?.busyCancelLabel"
    :error="confirmError"
    :compact="confirmRequest?.compact ?? false"
    @confirm="runConfirmedAction"
    @cancel="cancelConfirmDialog"
    @closed="restoreDeletedFocus"
  />

  <web-ui-back-top />
</template>
