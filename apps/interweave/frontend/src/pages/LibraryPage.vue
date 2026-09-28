<script setup lang="ts">
import type { WebUiEditableText, WebUiEvent, WebUiTextarea } from '@greypan/web-ui'
import { computed, nextTick, onMounted, onScopeDispose, ref, type ComponentPublicInstance } from 'vue'
import { useRouter } from 'vue-router'

import AddDialog from '@/components/library/AddDialog.vue'
import { createLibraryAddQueue, queueItemTitle } from '@/components/library/addQueue'
import ConfirmDialog from '@/components/library/ConfirmDialog.vue'
import DetailDrawer from '@/components/library/DetailDrawer.vue'
import DuplicateConfirmDialog from '@/components/library/DuplicateConfirmDialog.vue'
import EditTagsDialog from '@/components/library/EditTagsDialog.vue'
import PreviewDrawer from '@/components/library/PreviewDrawer.vue'
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
import { canGoBack, canGoForward } from '@/composables/useHistoryNav'
import { useLibraryRuntime } from '@/composables/useLibraryRuntime'
import { useMediaQuery } from '@/composables/useMediaQuery'
import type { LibraryQueueItem } from '@/services/library'
import { useLibraryStore } from '@/stores/library'
import type { ResourceSourceView, ResourceView } from '@/stores/library'

interface ConfirmRequest {
  title: string
  message: string
  confirmLabel: string
  danger: boolean
  /** 紧凑变体走窄一档的弹窗宽度（320px）。由调用点声明，不再从标题文案反推。 */
  compact?: boolean
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
  replaceFileSource,
  replaceURLSource,
  chooseFilePaths,
  chooseFilePath,
  getClipboardFilePaths,
  resourceMediaURL,
  subscribeToDroppedFiles,
  subscribeToPasteFileRequest,
  subscribeToSourceAvailability,
  probeURLSourceOnOpen
} = useLibraryRuntime()

const mobile = useMediaQuery('(max-width: 640px)')
const filterOpen = ref(false)
const searchOpen = ref(false)
const selectionMode = ref(false)
const checkedIds = ref<string[]>([])
const activeResourceId = ref<string | null>(null)
const activeTagTarget = ref<ResourceView | LibraryQueueItem | null>(null)
const detailOpen = ref(false)
const previewOpen = ref(false)
const tagsOpen = ref(false)
const addOpen = ref(false)
const restoreOpen = ref(false)
const restoreQueue = ref<LibraryRestoreQueueItem[]>([])
const restoreBusy = ref(false)
const restoreError = ref('')
const activeRestoreItemId = ref<string | null>(null)
const addQueue = createLibraryAddQueue(runtime)
const queue = addQueue.queue
const duplicatePrompt = addQueue.duplicatePrompt
const addingResources = ref(false)
const confirmBusy = ref(false)
const confirmOpen = ref(false)
const confirmRequest = ref<ConfirmRequest | null>(null)
const confirmError = ref('')
const addError = ref('')
const stopDroppedFiles = subscribeToDroppedFiles(paths => {
  if (addOpen.value) void addQueue.enqueueFileLocations(paths)
})
const stopPasteFileRequest = subscribeToPasteFileRequest(() => {
  addOpen.value = true
  void pasteFilePaths()
})
const stopSourceAvailability = subscribeToSourceAvailability(event => {
  store.applySourceAvailability(event.source_id, event.available, event.size_bytes)
})
onScopeDispose(() => {
  stopDroppedFiles()
  stopPasteFileRequest()
  stopSourceAvailability()
  void addQueue.close()
})

const visibleResources = computed(() => store.filteredResources)
const selectedResource = computed(
  () => store.resources.find(resource => resource.id === activeResourceId.value) ?? null
)
const allVisibleSelected = computed(
  () =>
    visibleResources.value.length > 0 &&
    visibleResources.value.every(resource => checkedIds.value.includes(resource.id))
)
const selectedResources = computed(() => store.resources.filter(resource => checkedIds.value.includes(resource.id)))
const canRestore = computed(
  () =>
    selectedResources.value.length > 0 &&
    selectedResources.value.every(resource => resource.sources.some(source => !source.available))
)
// 标题由 runtimeAvailable 决定（资源库为空 / 桌面服务未连接），描述必须跟着同一判据走：
// 未连接时给出「为什么是空的」的说明，正常使用为空时才讲资源库本身，否则会出现
// 「桌面服务未连接」配「资源库还是空的」这种自相矛盾的组合。
const emptyDescription = computed(() => {
  if (!runtime.isAvailable) return '浏览器预览无法连接桌面服务，请在桌面应用中使用。'
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
  void nextTick(() => {
    resourceNameEditors.value[key]?.select()
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

function renameResourceFromMenu(resource: ResourceView) {
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

function toggleSelectionMode() {
  selectionMode.value = !selectionMode.value
  if (selectionMode.value) {
    stopResourceRename()
    setDetailOpen(false)
  } else {
    checkedIds.value = []
  }
}

function setDetailOpen(open: boolean) {
  detailOpen.value = open
  if (!open) {
    if (editingNameKey.value === DRAWER_TITLE_EDITOR_KEY) stopResourceRename()
    activeResourceId.value = null
  }
}

function toggleChecked(resourceId: string) {
  checkedIds.value = checkedIds.value.includes(resourceId)
    ? checkedIds.value.filter(id => id !== resourceId)
    : [...checkedIds.value, resourceId]
}

// 扫选要的是「置成某个状态」而不是「翻一下」：一行被指针划过两次不能自己弹回去。
function setResourceChecked(resourceId: string, checked: boolean) {
  const isChecked = checkedIds.value.includes(resourceId)
  if (isChecked === checked) return
  checkedIds.value = checked ? [...checkedIds.value, resourceId] : checkedIds.value.filter(id => id !== resourceId)
}

function toggleCheckAll() {
  const visibleIds = visibleResources.value.map(resource => resource.id)
  if (allVisibleSelected.value) {
    checkedIds.value = checkedIds.value.filter(id => !visibleIds.includes(id))
    return
  }
  checkedIds.value = [...new Set([...checkedIds.value, ...visibleIds])]
}

function requestDeleteResource(resource: ResourceView) {
  openConfirmDialog({
    title: '删除资源',
    message: `删除「${resource.title}」后无法恢复。`,
    confirmLabel: '删除',
    danger: true,
    action: async () => {
      const deletedIds = await deleteResources([resource.id])
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
      const deletedIds = await deleteResources(ids)
      finishDelete(deletedIds)
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

function requestQueueRemoval(itemId: string) {
  const item = queue.value.find(candidate => candidate.id === itemId)
  if (!item) return
  openConfirmDialog({
    title: '移除待添加项',
    message: `移除「${queueItemTitle(item)}」后不会加入资源库。`,
    confirmLabel: '移除',
    danger: true,
    compact: true,
    action: () => addQueue.removeItem(itemId)
  })
}

function openConfirmDialog(request: ConfirmRequest) {
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
  /*
   * 只翻 open，不清内容（#189）。
   *
   * dialog 关闭后仍有 260ms 退场动画，期间弹窗保持可见。原先这里在同一个 tick 把
   * confirmRequest 置空，标题、说明、按钮文案一起塌成空串，弹窗高度单帧掉 61.6px；
   * 紧凑变体还因为宽度从标题字符串派生，从 320px 跳回默认的 360px。内容改到下一次打开时
   * 整体替换，退场期间没有任何一帧的盒子尺寸变化，也不需要在页面侧复述退场时长。
   */
  confirmOpen.value = false
}

function takeOperationError(cause: unknown, fallback: string) {
  const message = cause instanceof Error && cause.message.trim() ? cause.message : runtimeError.value || fallback
  runtimeError.value = ''
  return message
}

function openAddDialog() {
  addError.value = ''
  addOpen.value = true
}

function setAddOpen(open: boolean) {
  addOpen.value = open
  if (!open) {
    addError.value = ''
    void addQueue.close()
  }
}

/*
 * 粘贴（#188）。
 *
 * OS 的剪贴板文件接口只认文件，剪贴板里是网页链接时它返回空数组；原先这条路径零次
 * 迭代就结束，既不添加也不报错。剪贴板文本由 paste 事件带上来，拿不到文件时按链接再试
 * 一次，文本存在又不是合法链接时给一句可读的错误，而不是静默吞掉。
 */
async function pasteFilePaths(clipboardText = '') {
  try {
    addError.value = ''
    const paths = await getClipboardFilePaths()
    if (!addOpen.value) return
    if (paths.length) {
      await addQueue.enqueueFileLocations(paths)
      return
    }
    const url = normalizeLibraryURL(clipboardText)
    if (url) {
      await addQueue.enqueueURL(url)
      return
    }
    if (clipboardText.trim()) addError.value = '剪贴板里没有文件，也不是有效的 http 或 https 链接'
  } catch (cause) {
    addError.value = takeOperationError(cause, '读取剪贴板文件失败')
  }
}

async function pickFiles() {
  try {
    addError.value = ''
    const paths = await chooseFilePaths()
    if (addOpen.value) await addQueue.enqueueFileLocations(paths)
  } catch (cause) {
    addError.value = takeOperationError(cause, '选择文件失败')
  }
}

function renameQueueItem(itemId: string, title: string) {
  addQueue.renameItem(itemId, title)
}

async function submitQueue() {
  if (!queue.value.length || addingResources.value) return
  addError.value = ''
  addingResources.value = true
  const remaining = new Set(queue.value.map(item => item.id))
  const items = [...queue.value]
  try {
    for (const item of items) {
      await addQueue.waitForPreview(item.id)
      try {
        await addResource(item)
        remaining.delete(item.id)
      } finally {
        await addQueue.releasePreview(item.id)
      }
    }
    await addQueue.close()
    addOpen.value = false
  } catch (cause) {
    queue.value = queue.value.filter(item => remaining.has(item.id))
    addError.value = takeOperationError(cause, '添加资源失败，请稍后重试')
  } finally {
    addingResources.value = false
  }
}

async function handleRename(resourceId: string, title: string) {
  try {
    await renameResource(resourceId, title)
  } catch {
    // 错误由 runtimeError 呈现，详情抽屉保持当前 Resource。
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
    // 错误由 runtimeError 呈现。store 未更新，重新渲染不会把输入框拉回旧值，
    // 这里显式写回，否则失焦后文本停在未落库的状态上。
    // 抽屉可能已经切到或关掉了：editor 为空说明字段已卸载，或它已经属于别的资源，
    // 这两种情况写回都会落到不该落的输入框上。
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
    return
  }
  try {
    await saveTags(resourceId, tagNames)
  } catch {
    // 错误由 runtimeError 呈现；弹窗保持打开，草稿已在本地更新，用户可继续修改后再次保存。
  }
}

function openRestoreDialog(items: LibraryRestoreQueueItem[]) {
  if (!items.length || restoreBusy.value) return
  restoreQueue.value = items
  restoreError.value = ''
  activeRestoreItemId.value = null
  restoreOpen.value = true
}

function setRestoreOpen(open: boolean) {
  restoreOpen.value = open
  if (!open && !restoreBusy.value) {
    restoreQueue.value = []
    restoreError.value = ''
    activeRestoreItemId.value = null
  }
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
      chooseFilePath,
      replaceFileSource,
      replaceURLSource,
      onItemStart: itemId => {
        activeRestoreItemId.value = itemId
      }
    })
    const completedIds = new Set(result.completedIds)
    restoreQueue.value = items.filter(item => !completedIds.has(item.id))
    if (result.failed) {
      restoreError.value = takeOperationError(result.failed.cause, '找回资源失败，请稍后重试')
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
  <header slot="header" class="w-full">
    <Toolbar
      :search-query="store.searchQuery"
      :filter-source="store.filterSource"
      :filter-kind="store.filterKind"
      :filter-availability="store.filterAvailability"
      :filter-tag="store.filterTag"
      :sort="store.sort"
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

  <div class="flex min-h-0 flex-1">
    <main class="flex-1 min-w-0 px-6 max-[640px]:px-3 pb-16 pt-2">
      <div
        v-if="runtimeError"
        class="mb-3 flex min-h-10 items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/12 dark:text-red-200"
        role="alert"
      >
        <span class="min-w-0 wrap-break-word">{{ runtimeError }}</span>
        <web-ui-button size="28" variant="ghost" @click="runtimeError = ''">关闭</web-ui-button>
      </div>

      <ResourceList
        :resources="visibleResources"
        :active-resource-id="activeResourceId"
        :checked-ids="checkedIds"
        :selection-mode="selectionMode"
        :editing-name-key="editingNameKey"
        :editor-ref="setNameEditorRef"
        :loading="isLoading"
        :runtime-available="runtime.isAvailable"
        :empty-description="emptyDescription"
        :media-url-for="resourceMediaURL"
        @select="selectResource"
        @preview="previewResource"
        @detail="openResourceDetail"
        @start-rename="renameResourceFromMenu"
        @edit-tags="editResourceTags"
        @delete="requestDeleteResource"
        @recover="handleRecoverSource"
        @toggle="toggleChecked"
        @set-checked="setResourceChecked"
        @rename-change="handleResourceNameChange"
        @cancel-rename="stopResourceRename"
      />
    </main>

    <DetailDrawer
      :open="detailOpen"
      :resource="selectedResource"
      :mobile="mobile"
      :editing-name-key="editingNameKey"
      :editor-ref="setNameEditorRef(DRAWER_TITLE_EDITOR_KEY)"
      :replacing-source-ids="replacingSourceIds"
      @update:open="setDetailOpen"
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
      :media-url-for="resourceMediaURL"
    />
  </div>

  <AddDialog
    :open="addOpen"
    :queue="queue"
    :busy="addingResources"
    :error="addError"
    :mobile="mobile"
    :tag-colors="store.tagColors"
    @pick-files="pickFiles"
    @request-file-paths="pasteFilePaths"
    @remove="requestQueueRemoval"
    @rename="renameQueueItem"
    @edit-tags="editQueueTags"
    @submit="submitQueue"
    @update:open="setAddOpen"
  />

  <!--
    逐项重复确认：入队链每命中一个库内已有位置就挂起一项，由这里裁决。
    添加对话框关闭时 addQueue.close() 会把挂起的提示按「取消」结算，因此不会留下悬空弹窗。
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
    @update:open="setRestoreOpen"
    @submit="submitRestoreQueue"
  />

  <ConfirmDialog
    :open="confirmOpen"
    :title="confirmRequest?.title ?? ''"
    :message="confirmRequest?.message ?? ''"
    :confirm-label="confirmRequest?.confirmLabel ?? '确认'"
    :danger="confirmRequest?.danger ?? false"
    :busy="confirmBusy"
    :error="confirmError"
    :compact="confirmRequest?.compact ?? false"
    @confirm="runConfirmedAction"
    @cancel="closeConfirmDialog"
  />

  <web-ui-back-top />
</template>
