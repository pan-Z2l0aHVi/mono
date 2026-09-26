<script setup lang="ts">
import type { WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import { computed, nextTick, onMounted, onScopeDispose, ref, type ComponentPublicInstance } from 'vue'
import { useRouter } from 'vue-router'

import { createLibraryAddQueue } from '@/components/library/addQueue'
import LibraryAddDialog from '@/components/library/LibraryAddDialog.vue'
import LibraryConfirmDialog from '@/components/library/LibraryConfirmDialog.vue'
import LibraryDetailDrawer from '@/components/library/LibraryDetailDrawer.vue'
import LibraryEditTagsDialog from '@/components/library/LibraryEditTagsDialog.vue'
import LibraryPreviewDrawer from '@/components/library/LibraryPreviewDrawer.vue'
import LibraryResourceList from '@/components/library/LibraryResourceList.vue'
import LibraryRestoreDialog from '@/components/library/LibraryRestoreDialog.vue'
import LibraryToolbar from '@/components/library/LibraryToolbar.vue'
import { DRAWER_TITLE_EDITOR_KEY, type NameEditorRef } from '@/components/library/rename'
import {
  createLibraryRestoreQueue,
  createLibraryRestoreQueueItem,
  restoreLibraryQueue,
  type LibraryRestoreQueueItem
} from '@/components/library/restore'
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
  deleteResources,
  saveTags,
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
const addingResources = ref(false)
const confirmBusy = ref(false)
const confirmRequest = ref<ConfirmRequest | null>(null)
const confirmError = ref('')
const addError = ref('')
const stopDroppedFiles = subscribeToDroppedFiles(paths => {
  if (addOpen.value) addQueue.enqueueFileLocations(paths)
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
const emptyDescription = computed(() => (store.hasActiveFilter ? '没有符合条件的资源' : '资源库还是空的'))
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
  if (selectionMode.value) {
    toggleChecked(resource.id)
    return
  }
  activeResourceId.value = resource.id
  detailOpen.value = true
  // 打开详情顺手验一下失效 URL：只在当前判为不可用时探测（策略见 probeURLSourceOnOpen）。
  // 编辑标签与预览不经过这里——它们不是「打开详情」，不该发出网络请求。
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

function toggleCheckAll() {
  const visibleIds = visibleResources.value.map(resource => resource.id)
  if (allVisibleSelected.value) {
    checkedIds.value = checkedIds.value.filter(id => !visibleIds.includes(id))
    return
  }
  checkedIds.value = [...new Set([...checkedIds.value, ...visibleIds])]
}

function requestDeleteResource(resource: ResourceView) {
  confirmError.value = ''
  confirmRequest.value = {
    title: '删除资源',
    message: `删除「${resource.title}」后无法恢复。`,
    confirmLabel: '删除',
    danger: true,
    action: async () => {
      const deletedIds = await deleteResources([resource.id])
      finishDelete(deletedIds)
    }
  }
}

function requestDeleteSelected() {
  const ids = [...checkedIds.value]
  if (!ids.length) return
  confirmError.value = ''
  confirmRequest.value = {
    title: '删除资源',
    message: `删除选中的 ${ids.length} 个资源后无法恢复。`,
    confirmLabel: '删除',
    danger: true,
    action: async () => {
      const deletedIds = await deleteResources(ids)
      finishDelete(deletedIds)
    }
  }
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
  confirmError.value = ''
  confirmRequest.value = {
    title: '移除待添加项',
    message: `移除「${item.title}」后不会加入资源库。`,
    confirmLabel: '移除',
    danger: true,
    action: () => addQueue.removeItem(itemId)
  }
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
  confirmRequest.value = null
  confirmError.value = ''
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

async function pasteFilePaths() {
  try {
    addError.value = ''
    const paths = await getClipboardFilePaths()
    if (addOpen.value) addQueue.enqueueFileLocations(paths)
  } catch (cause) {
    addError.value = takeOperationError(cause, '读取剪贴板文件失败')
  }
}

async function pickFiles() {
  try {
    addError.value = ''
    const paths = await chooseFilePaths()
    if (addOpen.value) addQueue.enqueueFileLocations(paths)
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
    // 错误由 runtimeError 呈现，保留草稿以便修正后重试。
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
    <LibraryToolbar
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

      <LibraryResourceList
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
        @start-rename="renameResourceFromMenu"
        @edit-tags="editResourceTags"
        @delete="requestDeleteResource"
        @recover="handleRecoverSource"
        @toggle="toggleChecked"
        @rename-change="handleResourceNameChange"
        @cancel-rename="stopResourceRename"
      />
    </main>

    <LibraryDetailDrawer
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
      @edit-tags="editResourceTags"
      @delete="requestDeleteResource"
      @preview="previewResource"
      @recover="handleRecoverSource"
    />
    <LibraryPreviewDrawer
      v-model:open="previewOpen"
      :resource="selectedResource"
      :mobile="mobile"
      :media-url-for="resourceMediaURL"
      :open-external="openExternal"
      @open-failed="runtimeError = takeOperationError($event, '无法在系统浏览器中打开')"
    />
  </div>

  <LibraryAddDialog
    :open="addOpen"
    :queue="queue"
    :busy="addingResources"
    :error="addError"
    :mobile="mobile"
    @pick-files="pickFiles"
    @request-file-paths="pasteFilePaths"
    @remove="requestQueueRemoval"
    @rename="renameQueueItem"
    @edit-tags="editQueueTags"
    @submit="submitQueue"
    @update:open="setAddOpen"
  />

  <LibraryEditTagsDialog
    v-model:open="tagsOpen"
    :target="activeTagTarget"
    :all-tag-names="allTagNames"
    :busy="pendingResourceIds.includes(activeTagTarget?.id ?? '')"
    :error="runtimeError"
    @save="handleSaveTags"
  />

  <LibraryRestoreDialog
    :open="restoreOpen"
    :queue="restoreQueue"
    :busy="restoreBusy"
    :error="restoreError"
    :mobile="mobile"
    :active-item-id="activeRestoreItemId"
    @update:open="setRestoreOpen"
    @submit="submitRestoreQueue"
  />

  <LibraryConfirmDialog
    :open="confirmRequest !== null"
    :title="confirmRequest?.title ?? ''"
    :message="confirmRequest?.message ?? ''"
    :confirm-label="confirmRequest?.confirmLabel ?? '确认'"
    :danger="confirmRequest?.danger ?? false"
    :busy="confirmBusy"
    :error="confirmError"
    :compact="confirmRequest?.title === '移除待添加项'"
    @confirm="runConfirmedAction"
    @cancel="closeConfirmDialog"
  />

  <web-ui-back-top />
</template>
