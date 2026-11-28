<script setup lang="ts">
import { toast, type WebUiEditableText, type WebUiEvent, type WebUiTextarea } from '@greypan/web-ui'
import { useElementSize } from '@vueuse/core'
import {
  computed,
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  onScopeDispose,
  ref,
  watch,
  type ComponentPublicInstance
} from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import AddDialog from '@/components/library/AddDialog.vue'
import { createLibraryAddQueue } from '@/components/library/addQueue'
import ConfirmDialog from '@/components/library/ConfirmDialog.vue'
import DetailDrawer from '@/components/library/DetailDrawer.vue'
import DuplicateConfirmDialog from '@/components/library/DuplicateConfirmDialog.vue'
import EditTagsDialog from '@/components/library/EditTagsDialog.vue'
import { primarySource } from '@/components/library/presentation'
import PreviewDrawer from '@/components/library/PreviewDrawer.vue'
import { createPreviewLease } from '@/components/library/previewLease'
import { DRAWER_TITLE_EDITOR_KEY, type NameEditorRef } from '@/components/library/rename'
import ResourceList from '@/components/library/ResourceList.vue'
import { createLibraryRestoreQueue, createLibraryRestoreQueueItem } from '@/components/library/restore'
import RestoreDialog from '@/components/library/RestoreDialog.vue'
import Toolbar from '@/components/library/Toolbar.vue'
import {
  MENU_ADD_RESOURCE_EVENT,
  MENU_FOCUS_SEARCH_EVENT,
  MENU_IMPORT_FROM_CLIPBOARD_EVENT,
  MENU_IMPORT_FROM_LINK_EVENT,
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
import { useLayoutStore } from '@/stores/layout'
import { useLibraryStore } from '@/stores/library'
import type { ResourceSourceView, ResourceView } from '@/stores/library'

import { createLibraryWorkflow } from './libraryWorkflow'

const router = useRouter()
const layout = useLayoutStore()
const store = useLibraryStore()

// 记住整页滚动位置：仅在页面处于激活态时记录 window.scrollY，
// 离开前锁定位置（早于 KeepAlive 摘除 DOM 导致短页把 scrollY 归零），再次激活或重挂后恢复。
let isLibraryActive = true
let restoreScrollFrame = 0

function recordLibraryScroll() {
  if (!isLibraryActive) return
  store.scrollY = window.scrollY
}

function scheduleRestoreLibraryScroll() {
  const targetY = store.scrollY
  if (targetY <= 0) return
  void nextTick(() => {
    if (!isLibraryActive) return
    window.scrollTo({ top: targetY, behavior: 'instant' })
    // 虚拟列表挂载首帧后总高可能经 ResizeObserver 调整，下一帧再核对一次避免被夹短。
    restoreScrollFrame = requestAnimationFrame(() => {
      restoreScrollFrame = 0
      if (!isLibraryActive) return
      if (Math.abs(window.scrollY - targetY) > 1) {
        window.scrollTo({ top: targetY, behavior: 'instant' })
      }
    })
  })
}

onBeforeRouteLeave(() => {
  if (isLibraryActive) store.scrollY = window.scrollY
  isLibraryActive = false
})

onDeactivated(() => {
  isLibraryActive = false
  if (restoreScrollFrame) {
    cancelAnimationFrame(restoreScrollFrame)
    restoreScrollFrame = 0
  }
})

onActivated(() => {
  isLibraryActive = true
  scheduleRestoreLibraryScroll()
})

onScopeDispose(() => {
  window.removeEventListener('scroll', recordLibraryScroll)
  if (restoreScrollFrame) {
    cancelAnimationFrame(restoreScrollFrame)
    restoreScrollFrame = 0
  }
})

// 同一个失败可能先被 runtime 上报、再由工作流 catch 看见；按 cause 去重，只弹一次 toast。
// Error 对象用 WeakSet，不延长异常对象的生命周期。
const reportedErrors = new WeakSet<object>()
function reportError(cause: unknown, fallback: string) {
  if (cause && (typeof cause === 'object' || typeof cause === 'function')) {
    if (reportedErrors.has(cause as object)) return
    reportedErrors.add(cause as object)
  }
  toast.error(userMessage(cause, fallback), { position: 'top-center' })
}

const {
  runtime,
  isLoading,
  pendingResourceIds,
  replacingSourceIds,
  loadResources,
  addResource,
  upsertResource,
  renameResource,
  updateResourceNote,
  deleteResources,
  saveTags,
  replaceSource,
  defaultOpenWith,
  openExternal,
  saveSourceThumbnail,
  probeURLSourceOnOpen
} = useLibraryRuntime(undefined, reportError)

// 页面级 overlay（详情/预览 drawer、各类 dialog）跟着壳的移动端判定走，不自己写断点。
const mobile = useLayoutMobile()
const headerRef = ref<HTMLElement | null>(null)
const { height: headerHeight } = useElementSize(headerRef)
const filterOpen = computed({
  get: () => layout.libraryFilterOpen,
  set: open => layout.setLibraryFilterOpen(open)
})
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

// 添加队列与找回弹窗共用一本预览账本：token 结算、驱逐对账都只在 lease 里发生。
const previewLease = createPreviewLease(runtime)
const previewEntries = previewLease.entries
const addQueue = createLibraryAddQueue(runtime, previewLease)
const queue = addQueue.queue
const duplicatePrompt = addQueue.duplicatePrompt
const submitting = addQueue.submitting
const importProgress = addQueue.progress

const workflow = createLibraryWorkflow({
  addQueue,
  expandImportEntries: entries => runtime.resources.expandImportEntries(entries),
  chooseFilePaths: () => runtime.system.chooseFilePaths(),
  chooseFilesOnly: () => runtime.system.chooseFilesOnly(),
  chooseDirectories: () => runtime.system.chooseDirectories(),
  getClipboardFilePaths: () => runtime.system.getClipboardFilePaths(),
  readClipboardText: () => runtime.system.readClipboardText(),
  readClipboardContent: () => runtime.system.readClipboardContent(),
  addResource,
  upsertResource,
  createResources: (batchId, inputs) => runtime.resources.createMany(batchId, inputs),
  cancelResourceBatch: batchId => runtime.resources.cancelBatch(batchId),
  onResourceBatchProgress: listener => runtime.events.onResourceBatchProgress(listener),
  replaceSource,
  replaceScannedFileSource: async (sourceId, path, snapshot) => {
    const updated = await runtime.sources.replaceScannedFile(sourceId, path, snapshot)
    store.upsertResource(updated)
  },
  reportError,
  notifyWarning: message => toast.warning(message, { position: 'top-center' })
})

const {
  addOpen,
  confirmBusy,
  confirmOpen,
  confirmRequest,
  confirmButtonLabel,
  restoreOpen,
  restoreQueue,
  restoreBusy,
  failedRestoreIds,
  activeRestoreItemId
} = workflow

const resourceListRef = ref<InstanceType<typeof ResourceList>>()
let pendingDeleteFocus: number | null = null
/** 菜单「导入来自 › 链接」要把 AddDialog 直接翻到链接输入，因此保留组件引用。 */
const addDialogRef = ref<InstanceType<typeof AddDialog> | null>(null)

watch(
  pendingWindowFileDrops,
  batches => {
    if (!batches.length) return
    pendingWindowFileDrops.value = []
    workflow.handleWindowFileDrops(batches)
  },
  { immediate: true }
)
watch(
  pendingWindowURLDrops,
  batches => {
    if (!batches.length) return
    pendingWindowURLDrops.value = []
    workflow.handleWindowURLDrops(batches)
  },
  { immediate: true }
)
const stopSourceAvailability = runtime.events.onSourceAvailability(event => {
  store.applySourceAvailability(event.source_id, event.available, event.size_bytes)
})

/*
 * 菜单里落在资源库页上的动作。壳层负责切路由，页面负责执行领域逻辑：
 * 开添加对话框、从剪贴板或链接导入与聚焦搜索（筛选栏展开态由 `useLayoutStore` 统一管理）。
 */
const stopMenuActions = [
  onMenuAction(MENU_ADD_RESOURCE_EVENT, () => workflow.openAddDialog()),
  onMenuAction(MENU_IMPORT_FROM_CLIPBOARD_EVENT, () => {
    workflow.openAddDialog()
    void workflow.pasteFilePaths()
  }),
  onMenuAction(MENU_IMPORT_FROM_LINK_EVENT, openAddLinkDialog),
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
  const preferred = resource.preferred
  if (!preferred?.location) return Promise.resolve('')
  if (preferred.type !== 'url' && !resource.available) return Promise.resolve('')
  return defaultOpenWith(preferred.location)
}

async function openResource(resource: ResourceView) {
  const preferred = resource.preferred
  if (!preferred?.location) return
  if (preferred.type !== 'url' && !resource.available) return
  await openExternal(preferred.location)
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
 * 拷贝资源到系统剪贴板：本地文件写入文件对象（可在文件管理器或外部应用直接粘贴），
 * 网页链接写入 URL 文本。优先使用首选来源，首选失效时回退到第一个可用来源。
 */
async function copyResource(resource: ResourceView) {
  const source = resource.preferred?.available
    ? resource.preferred
    : (resource.sources.find(item => item.available) ?? primarySource(resource))
  if (!source || !source.location) return
  if (source.type === 'file' && !source.available) return
  try {
    if (source.type === 'file') {
      await runtime.system.writeClipboardFilePath(source.location)
    } else {
      await runtime.system.writeClipboardText(source.location)
    }
    toast.success('已复制到剪贴板', { position: 'top-center' })
  } catch (cause) {
    console.error('复制资源到剪贴板失败', cause)
    toast.warning('无法复制到剪贴板，请稍后重试', { position: 'top-center' })
  }
}

/*
 * 设为桌面壁纸：与 ResourceList 的菜单门控同一口径——锁定 preferred 来源；file 来源要求可用，
 * URL 来源先经后端下载到缓存再设置（remote=true）。成功与失败都用 toast 给出可感知的反馈。
 */
async function setWallpaperFor(resource: ResourceView) {
  const source = primarySource(resource)
  if (!source) return
  if (source.type !== 'url' && !source.available) return
  if (source.type === 'url' && !source.location) return
  try {
    await runtime.system.setWallpaper(source.location, source.type === 'url')
    toast.success('已设为桌面壁纸', { position: 'top-center' })
  } catch (cause) {
    console.error('设置桌面壁纸失败', cause)
    toast.warning('无法设置桌面壁纸，请稍后重试', { position: 'top-center' })
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
  workflow.openConfirmDialog({
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
  workflow.openConfirmDialog({
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

function restoreDeletedFocus() {
  if (pendingDeleteFocus === null) return
  const index = pendingDeleteFocus
  pendingDeleteFocus = null
  void nextTick(() => resourceListRef.value?.focusNearest(index))
}

/*
 * 「导入来自 › 链接」打开添加对话框并直接翻开链接输入。
 *
 * 用户已经声明了要从链接导入，不该再让他在对话框里点一次「添加链接」；仍然保留外层
 * 对话框，是因为链接提交后它会被并入同一个待添加队列，用户还能在提交前改名称与标签。
 */
function openAddLinkDialog() {
  workflow.openAddDialog()
  // 同步调用是安全的：AddDialog 的 open watch 复位的是它自己的子面板状态，
  // 而 openLinkDialog 写的是同一个 ref，后写的这一次才是用户要的结果。
  addDialogRef.value?.openLinkDialog()
}

function renameQueueItem(itemId: string, title: string) {
  addQueue.renameItem(itemId, title)
}

async function handleRename(resourceId: string, title: string) {
  try {
    await renameResource(resourceId, title)
  } catch {
    // 错误由 reportError 呈现，详情 drawer 保持当前 Resource。
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
    // 错误由 reportError 呈现。store 未更新，重新渲染不会把 input 拉回旧值，
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
    // 错误由 reportError 呈现；弹窗保持打开，草稿已在本地更新，用户可继续修改后再次保存。
  }
}

function handleRecoverSource(source: ResourceSourceView) {
  const resource = store.resources.find(item => item.sources.some(itemSource => itemSource.id === source.id))
  if (!resource) return
  workflow.openRestoreDialog([createLibraryRestoreQueueItem(resource, source)])
}

function handleBatchRestore() {
  if (!canRestore.value) return
  workflow.openRestoreDialog(createLibraryRestoreQueue(selectedResources.value))
}

onMounted(() => {
  isLibraryActive = true
  window.addEventListener('scroll', recordLibraryScroll, { passive: true })
  void loadResources()
    .catch(() => {
      // 初次加载错误由 reportError 呈现，并保留重试入口。
    })
    .finally(() => {
      scheduleRestoreLibraryScroll()
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
      @add="workflow.openAddDialog()"
      @select="toggleSelectionMode"
      @select-all="toggleCheckAll"
      @delete-selected="requestDeleteSelected"
      @restore="handleBatchRestore"
      @reset="store.resetFilters()"
      @back="router.back()"
      @forward="router.forward()"
    />
  </header>

  <div
    class="flex min-h-0 flex-1"
    :style="{ minHeight: `calc(var(--wui-layout-viewport-height, 100dvh) - ${headerHeight}px)` }"
  >
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
        @copy="copyResource"
        @set-wallpaper="setWallpaperFor"
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
      @copy="copyResource"
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
      :open-external="openExternal"
      @recover="handleRecoverSource"
    />
  </div>

  <AddDialog
    ref="addDialogRef"
    :open="addOpen"
    :queue="queue"
    :busy="submitting"
    :mobile="mobile"
    :tag-colors="store.tagColors"
    :previews="previewEntries"
    :progress="importProgress"
    @pick-files="workflow.pickFiles()"
    @pick-files-only="workflow.pickFilesOnly()"
    @pick-directories="workflow.pickDirectories()"
    @add-url="workflow.requestAddURLs($event)"
    @request-file-paths="workflow.pasteFilePaths($event)"
    @remove="addQueue.removeItem"
    @rename="renameQueueItem"
    @edit-tags="editQueueTags"
    @submit="workflow.submitQueue()"
    @update:open="workflow.setAddOpen($event)"
    @closed="workflow.handleAddDialogClosed()"
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
    @save="handleSaveTags"
  />

  <RestoreDialog
    :open="restoreOpen"
    :queue="restoreQueue"
    :busy="restoreBusy"
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
    @update:open="workflow.setRestoreOpen($event)"
    @submit="workflow.submitRestoreQueue($event)"
  />

  <ConfirmDialog
    :open="confirmOpen"
    :title="confirmRequest?.title ?? ''"
    :message="confirmRequest?.message ?? ''"
    :confirm-label="confirmButtonLabel"
    :danger="confirmRequest?.danger ?? false"
    :busy="confirmBusy"
    :busy-cancel-label="confirmRequest?.busyCancelLabel"
    :compact="confirmRequest?.compact ?? false"
    @confirm="workflow.runConfirmedAction()"
    @cancel="workflow.cancelConfirmDialog()"
    @closed="restoreDeletedFocus"
  />

  <web-ui-back-top />
</template>

<route lang="json">
{
  "meta": {
    "keepAlive": true
  }
}
</route>
