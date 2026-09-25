<script setup lang="ts">
import type { WebUiEditableText, WebUiEvent, WebUiLayout, WebUiSvgDrawLines } from '@greypan/web-ui'
import { lucideFolderOpen, lucideLayoutGrid } from '@greypan/web-ui/icons'
import { computed, nextTick, onMounted, onScopeDispose, ref, type ComponentPublicInstance } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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

const route = useRoute()
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
  resourceMediaURL,
  subscribeToDroppedFiles,
  subscribeToPasteFileRequest
} = useLibraryRuntime()

const sidebarCollapsed = ref(false)
const sidebarOpen = ref(false)
const desktopSidebarWidth = ref('240px')
const mobileQuery = window.matchMedia('(max-width: 640px)')
const mobile = ref(mobileQuery.matches)
const sidebarWidth = computed(() => (mobile.value ? 'min(320px, 80vw)' : desktopSidebarWidth.value))
const filterOpen = ref(false)
const searchOpen = ref(false)
const selectionMode = ref(false)
const checkedIds = ref<string[]>([])
const activeResourceId = ref<string | null>(null)
const detailOpen = ref(false)
const previewOpen = ref(false)
const tagsOpen = ref(false)
const addOpen = ref(false)
const restoreOpen = ref(false)
const restoreQueue = ref<LibraryRestoreQueueItem[]>([])
const restoreBusy = ref(false)
const restoreError = ref('')
const activeRestoreItemId = ref<string | null>(null)
const queue = ref<LibraryQueueItem[]>([])
const addingResources = ref(false)
const confirmBusy = ref(false)
const confirmRequest = ref<ConfirmRequest | null>(null)
const confirmError = ref('')
const addError = ref('')
const stopDroppedFiles = subscribeToDroppedFiles(paths => {
  if (addOpen.value) enqueueFileLocations(paths)
})
const stopPasteFileRequest = subscribeToPasteFileRequest(() => {
  addOpen.value = true
  void pasteFilePaths()
})
onScopeDispose(() => {
  stopDroppedFiles()
  stopPasteFileRequest()
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

const navItems = [
  { key: 'library' as const, label: '资料库', path: '/library', icon: lucideFolderOpen },
  { key: 'map' as const, label: '关系图谱', path: '/map', icon: lucideLayoutGrid }
]

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

const navDrawRefs = ref<Record<'library' | 'map', WebUiSvgDrawLines | null>>({
  library: null,
  map: null
})

function setNavDrawRef(key: 'library' | 'map', element: unknown) {
  navDrawRefs.value[key] = (element as WebUiSvgDrawLines | null) ?? null
}

const navItemClass =
  'flex items-center gap-2 w-full min-w-9 min-h-9 px-2.5 border-0 rounded-full font-medium cursor-pointer text-left transition-all duration-150 text-(--wui-color-text) [--wui-icon-color:var(--wui-color-accent,#08f)] active:bg-[rgb(34_33_42/0.12)] dark:active:bg-white/15 data-[active=true]:bg-(--wui-color-surface-control,#dfdfdf) data-[active=true]:hover:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_90%,var(--wui-color-text,#1b1b1b))] data-[active=true]:active:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_70%,var(--wui-color-text,#1b1b1b))]'

function syncMobile() {
  mobile.value = mobileQuery.matches
}

mobileQuery.addEventListener('change', syncMobile)
onScopeDispose(() => mobileQuery.removeEventListener('change', syncMobile))

function updateSidebarCollapsed(event: WebUiEvent<WebUiLayout, 'sidebar-collapsed-change'>) {
  sidebarCollapsed.value = event.detail.collapsed
}

function updateSidebarOpen(event: WebUiEvent<WebUiLayout, 'sidebar-open-change'>) {
  sidebarOpen.value = event.detail.open
}

function updateSidebarWidth(event: WebUiEvent<WebUiLayout, 'sidebar-width-change'>) {
  desktopSidebarWidth.value = event.detail.width
}

function selectNav(next: 'library' | 'map') {
  void navDrawRefs.value[next]?.replay()

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    navDrawRefs.value[next]?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.3)', offset: 0.4 }, { transform: 'scale(1)' }],
      { duration: 720, easing: 'ease-out' }
    )
  }

  const path = next === 'library' ? '/library' : '/map'
  sidebarOpen.value = false
  if (route.path !== path) void router.push(path)
}

function selectResource(resource: ResourceView) {
  if (selectionMode.value) {
    toggleChecked(resource.id)
    return
  }
  activeResourceId.value = resource.id
  detailOpen.value = true
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
    action: () => {
      queue.value = queue.value.filter(candidate => candidate.id !== itemId)
    }
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
  queue.value = []
  addError.value = ''
  addOpen.value = true
}

function setAddOpen(open: boolean) {
  addOpen.value = open
  if (!open) addError.value = ''
}

function queueId(kind: LibraryQueueItem['kind']) {
  return `queue-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function titleFromLocation(location: string) {
  if (location.startsWith('http://') || location.startsWith('https://')) {
    const parsed = new URL(location)
    const pathTitle = decodeURIComponent(parsed.pathname).split('/').filter(Boolean).at(-1)
    return pathTitle ?? parsed.hostname
  }
  return (
    location
      .split(/[\\/]/)
      .at(-1)
      ?.replace(/\.[^.]+$/, '') || location
  )
}

function enqueueFileLocations(locations: string[]) {
  const existingLocations = new Set(queue.value.map(item => item.location))
  for (const value of locations) {
    const location = value.trim()
    if (!location || existingLocations.has(location)) continue
    queue.value.push({
      id: queueId('file'),
      kind: 'file',
      title: titleFromLocation(location),
      location
    })
    existingLocations.add(location)
  }
}

async function pasteFilePaths() {
  try {
    addError.value = ''
    const paths = await getClipboardFilePaths()
    if (addOpen.value) enqueueFileLocations(paths)
  } catch (cause) {
    addError.value = takeOperationError(cause, '读取剪贴板文件失败')
  }
}

async function pickFiles() {
  try {
    addError.value = ''
    enqueueFileLocations(await chooseFilePaths())
  } catch (cause) {
    addError.value = takeOperationError(cause, '选择文件失败')
  }
}

function renameQueueItem(itemId: string, title: string) {
  queue.value = queue.value.map(item => (item.id === itemId ? { ...item, title } : item))
}

async function submitQueue() {
  if (!queue.value.length || addingResources.value) return
  addError.value = ''
  addingResources.value = true
  const remaining = new Set(queue.value.map(item => item.id))
  try {
    for (const item of queue.value) {
      await addResource(item)
      remaining.delete(item.id)
    }
    queue.value = []
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
  <web-ui-layout
    header-glow
    sidebarResizable
    class="min-h-dvh overflow-x-clip text-[#22212a] bg-white dark:text-(--wui-color-text) dark:bg-(--wui-color-page)"
    :sidebarCollapsed="sidebarCollapsed"
    :sidebarOpen="sidebarOpen"
    :sidebarWidth="sidebarWidth"
    @sidebar-collapsed-change="updateSidebarCollapsed"
    @sidebar-open-change="updateSidebarOpen"
    @sidebar-width-change="updateSidebarWidth"
  >
    <div slot="sidebar" class="relative z-20 h-full pt-14 pb-4 px-2 max-[640px]:px-0" aria-label="应用导航">
      <nav class="grid gap-1" aria-label="主导航">
        <button
          v-for="item in navItems"
          :key="item.key"
          type="button"
          :class="[
            navItemClass,
            route.path === item.path ? '' : 'hover:bg-black/4 dark:hover:bg-white/6',
            sidebarCollapsed ? 'justify-center' : ''
          ]"
          :data-active="route.path === item.path"
          :aria-current="route.path === item.path ? 'page' : undefined"
          :aria-label="item.label"
          @click="selectNav(item.key)"
        >
          <web-ui-tooltip
            portal
            placement="right"
            :content="sidebarCollapsed ? item.label : ''"
            :disabled="!sidebarCollapsed"
          >
            <web-ui-svg-draw-lines :ref="element => setNavDrawRef(item.key, element)" :duration="720" easing="ease-out">
              <web-ui-icon :icon="item.icon" :size="18" />
            </web-ui-svg-draw-lines>
          </web-ui-tooltip>
          <span v-if="!sidebarCollapsed" class="text-sm whitespace-nowrap overflow-hidden">{{ item.label }}</span>
        </button>
      </nav>
    </div>

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
      <LibraryPreviewDrawer v-model:open="previewOpen" :resource="selectedResource" :mobile="mobile" />
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
      @submit="submitQueue"
      @update:open="setAddOpen"
    />

    <LibraryEditTagsDialog
      v-model:open="tagsOpen"
      :resource="selectedResource"
      :all-tag-names="store.allTagNames"
      :busy="pendingResourceIds.includes(activeResourceId ?? '')"
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
  </web-ui-layout>
</template>
