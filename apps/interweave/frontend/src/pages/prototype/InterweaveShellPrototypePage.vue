<script setup lang="ts">
import type {
  WebUiAutocomplete,
  WebUiDialog,
  WebUiDrawer,
  WebUiDropdown,
  WebUiEvent,
  WebUiInput,
  WebUiLayout,
  WebUiSelect
} from '@greypan/web-ui'
import type { WebUiContextMenu } from '@greypan/web-ui/components/context-menu'
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucideCheck,
  lucideChevronUp,
  lucideClapperboard,
  lucideEye,
  lucideExternalLink,
  lucideFile,
  lucideFileText,
  lucideFilm,
  lucideFolderOpen,
  lucideGlobe,
  lucideHeadphones,
  lucideImage,
  lucideLayoutGrid,
  lucideLink,
  lucideMusic,
  lucidePenLine,
  lucidePlay,
  lucidePlus,
  lucideRefreshCw,
  lucideSearch,
  lucideListFilter,
  lucideTag,
  lucideTags,
  lucideTrash2,
  lucideTriangleAlert,
  lucideCode,
  lucideEllipsisVertical,
  lucideUpload,
  lucideClipboardPaste,
  lucideX,
  heroiconsBarsArrowDown16Solid,
  heroiconsBarsArrowUp16Solid,
  lucideListRestart,
  tablerSortAscendingLetters
} from '@greypan/web-ui/icons'
import { computed, nextTick, reactive, ref, watch, type ComponentPublicInstance } from 'vue'
import { useRouter } from 'vue-router'

import { canGoBack, canGoForward } from '@/composables/useHistoryNav'

// --- Navigation ---
const router = useRouter()
const activeNav = ref<'library' | 'map'>('library')
const navItemClass =
  'nav-item flex items-center gap-2 w-full min-w-9 min-h-9 px-2.5 border-0 rounded-full font-medium cursor-pointer text-[#5b5b66] transition-all duration-150 active:bg-[rgb(34_33_42/0.12)] text-left dark:text-[var(--wui-color-text)] dark:active:bg-white/15'
function selectNav(next: 'library' | 'map') {
  activeNav.value = next
}

// --- Sidebar toggle ---
const sidebarCollapsed = ref(false)
const sidebarOpen = ref(false)
const sidebarWidth = ref('240px')
function updateSidebarCollapsed(event: WebUiEvent<WebUiLayout, 'sidebar-collapsed-change'>) {
  sidebarCollapsed.value = event.detail.collapsed
}
function handleSidebarWidthChange(event: WebUiEvent<WebUiLayout, 'sidebar-width-change'>) {
  sidebarWidth.value = event.detail.width
}
function updateSidebarOpen(event: WebUiEvent<WebUiLayout, 'sidebar-open-change'>) {
  sidebarOpen.value = event.detail.open
}

// --- Tags ---
const tagColors: Record<string, string> = {
  设计: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200',
  开发: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200',
  素材: 'bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-200',
  灵感: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200',
  参考: 'bg-pink-100 text-pink-700 dark:bg-pink-400/15 dark:text-pink-200',
  工具: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-200',
  归档: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-neutral-300',
  文档: 'bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-200',
  重要: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200',
  紧急: 'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-200',
  草稿: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-neutral-300',
  审核: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200',
  发布: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200',
  原型: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200',
  测试: 'bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200',
  备份: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-200'
}

const defaultTagClass =
  'bg-gray-50 text-gray-500 ring-1 ring-gray-200 dark:bg-white/5 dark:text-neutral-300 dark:ring-white/15'
function getTagClass(tag: string) {
  return tagColors[tag] ?? defaultTagClass
}

// --- Resource data ---
interface Resource {
  id: string
  name: string
  sourceType: 'local' | 'link'
  resourceType: 'image' | 'video' | 'audio' | 'document' | 'web' | 'json' | 'folder'
  tags?: string[]
  url?: string
  broken?: boolean
  size?: string
  createdAt?: string
  modifiedAt?: string
  path?: string
}

const resources = reactive<Resource[]>([
  {
    id: '1',
    name: '图片名称aaa.png',
    sourceType: 'local',
    resourceType: 'image',
    tags: ['素材', '设计'],
    size: '2.4 MB',
    createdAt: '2025-06-12',
    modifiedAt: '2025-07-01',
    path: '/Users/me/Documents/images/aaa.png'
  },
  {
    id: '2',
    name: '文件名称11.md',
    sourceType: 'local',
    resourceType: 'document',
    tags: ['开发'],
    size: '18 KB',
    createdAt: '2025-05-20',
    modifiedAt: '2025-06-15',
    path: '/Users/me/Projects/docs/11.md'
  },
  {
    id: '3',
    name: '视频xxx.mp4',
    sourceType: 'local',
    resourceType: 'video',
    size: '156 MB',
    createdAt: '2025-04-10',
    modifiedAt: '2025-04-10',
    path: '/Users/me/Movies/xxx.mp4'
  },
  {
    id: '4',
    name: '音频123.mp3',
    sourceType: 'local',
    resourceType: 'audio',
    tags: ['灵感'],
    size: '8.2 MB',
    createdAt: '2025-03-22',
    modifiedAt: '2025-03-22',
    path: '/Users/me/Music/123.mp3'
  },
  {
    id: '5',
    name: '文档xyz.word',
    sourceType: 'local',
    resourceType: 'document',
    tags: ['参考', '设计'],
    size: '1.1 MB',
    createdAt: '2025-07-05',
    modifiedAt: '2025-08-01',
    path: '/Users/me/Documents/xyz.word'
  },
  {
    id: '6',
    name: '网页url1 title',
    sourceType: 'link',
    resourceType: 'web',
    url: 'https://example.com',
    tags: ['灵感'],
    createdAt: '2025-06-18',
    modifiedAt: '2025-06-18'
  },
  {
    id: '7',
    name: '失效网页url2 title',
    sourceType: 'link',
    resourceType: 'web',
    url: 'https://expired.com',
    broken: true,
    createdAt: '2025-02-27',
    modifiedAt: '2025-03-20'
  },
  {
    id: '8',
    name: '文档yyy.json',
    sourceType: 'local',
    resourceType: 'json',
    tags: ['开发', '工具'],
    size: '4.7 KB',
    createdAt: '2025-07-20',
    modifiedAt: '2025-08-05',
    path: '/Users/me/Projects/yyy.json'
  },
  {
    id: '9',
    name: '失效文件名称22.md',
    sourceType: 'local',
    resourceType: 'document',
    broken: true,
    tags: ['归档'],
    size: '3.2 KB',
    createdAt: '2024-11-03',
    modifiedAt: '2025-05-01',
    path: '/Users/me/Old/22.md'
  },
  {
    id: '10',
    name: '音频123.mp3',
    sourceType: 'local',
    resourceType: 'audio',
    size: '5.6 MB',
    createdAt: '2025-02-14',
    modifiedAt: '2025-02-14',
    path: '/Users/me/Music/123-backup.mp3'
  },
  {
    id: '11',
    name: '这是测试超长资源名称用于验证列表项在名称极长时的换行与布局表现情况这应该会占满当前列表项宽度并在空间不够时自然换行显示完整名称而不是被截断',
    sourceType: 'local',
    resourceType: 'document',
    tags: ['设计'],
    size: '64 KB',
    createdAt: '2025-08-01',
    modifiedAt: '2025-08-10',
    path: '/Users/me/Documents/long-name-test-document.md'
  },
  {
    id: '12',
    name: '标签极多的资源.json',
    sourceType: 'local',
    resourceType: 'json',
    tags: ['设计', '开发', '素材', '灵感', '参考', '工具', '文档', '重要', '紧急', '草稿'],
    size: '12 KB',
    createdAt: '2025-07-15',
    modifiedAt: '2025-08-20',
    path: '/Users/me/Projects/multi-tag-resource.json'
  }
])

// --- Selection & Drawer ---
const selectedId = ref<string | null>(null)
const drawerOpen = ref(false)
const previewDrawerOpen = ref(false)
const selectedResource = computed(() => resources.find(r => r.id === selectedId.value) ?? null)
function selectResource(id: string) {
  selectedId.value = id
  drawerOpen.value = true
}
function openPreviewDrawer() {
  previewDrawerOpen.value = true
}
function handleDetailDrawerOpenChange(event: WebUiEvent<WebUiDrawer, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  drawerOpen.value = event.detail.open
}
function handlePreviewDrawerOpenChange(event: WebUiEvent<WebUiDrawer, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  previewDrawerOpen.value = event.detail.open
}

// --- Icon mapping ---
const resourceTypeIcons: Record<Resource['resourceType'], typeof lucideFile> = {
  image: lucideImage,
  video: lucideFilm,
  audio: lucideMusic,
  document: lucideFileText,
  web: lucideGlobe,
  json: lucideCode,
  folder: lucideFolderOpen
}
function getResourceIcon(resource: Resource) {
  return resourceTypeIcons[resource.resourceType]
}
const typeTint: Record<Resource['resourceType'], string> = {
  image: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200',
  video: 'bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-200',
  audio: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200',
  document: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200',
  web: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-200',
  json: 'bg-green-100 text-green-700 dark:bg-green-400/15 dark:text-green-200',
  folder: 'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-200'
}

function getSourceIcon(resource: Resource) {
  return resource.sourceType === 'link' ? lucideLink : lucideFile
}

// "打开方式" 候选应用，按资源类型分组
const openWithApps: Partial<Record<Resource['resourceType'], Array<{ label: string; icon: typeof lucideEye }>>> = {
  image: [
    { label: '预览', icon: lucideEye },
    { label: '看图', icon: lucideImage }
  ],
  video: [
    { label: '视频播放器', icon: lucidePlay },
    { label: 'iMovie', icon: lucideClapperboard }
  ],
  audio: [
    { label: '音乐播放器', icon: lucideMusic },
    { label: 'GarageBand', icon: lucideHeadphones }
  ],
  document: [
    { label: '文本编辑', icon: lucideFileText },
    { label: 'Notion', icon: lucidePenLine }
  ],
  json: [{ label: 'VS Code', icon: lucideFile }],
  web: [
    { label: 'Safari', icon: lucideGlobe },
    { label: 'Chrome', icon: lucideGlobe }
  ]
}

const currentApps = computed(() => {
  if (!selectedResource.value) return []
  return openWithApps[selectedResource.value.resourceType] ?? []
})

// All unique tags from resources
const allTags = [...new Set(resources.flatMap(r => r.tags ?? []))].sort()

// --- Filter state ---
const filterSource = ref<string>('all')
const filterType = ref<string>('all')
const filterBroken = ref<string>('all')
const filterTag = ref<string>('')
type SortOption = 'name' | 'tagName' | 'latest' | 'earliest'
const sortOrder = ref<SortOption>('latest')
const filterLabelClass =
  'flex items-center gap-1.5 text-[#8a8a94] max-sm:basis-full dark:text-[var(--wui-color-text-secondary)]'

const filterOpen = ref(false)
const searchOpen = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<WebUiInput>()
const filteredResources = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  const filtered = resources.filter(r => {
    if (query && !r.name.toLowerCase().includes(query)) return false
    if (filterSource.value !== 'all' && r.sourceType !== filterSource.value) return false
    if (filterType.value !== 'all' && r.resourceType !== filterType.value) return false
    if (filterBroken.value === 'valid' && r.broken) return false
    if (filterBroken.value === 'broken' && !r.broken) return false
    if (filterTag.value && !(r.tags ?? []).includes(filterTag.value)) return false
    return true
  })

  const getTag = (resource: (typeof resources)[number]) => (resource.tags?.[0] ?? '').toLowerCase()
  const getName = (resource: (typeof resources)[number]) => resource.name.toLowerCase()
  const getTime = (resource: (typeof resources)[number]) =>
    new Date(resource.modifiedAt ?? resource.createdAt ?? '').getTime()

  const compareName = (a: (typeof resources)[number], b: (typeof resources)[number]) =>
    getName(a).localeCompare(getName(b))
  const compareTagName = (a: (typeof resources)[number], b: (typeof resources)[number]) => {
    const byTag = getTag(a).localeCompare(getTag(b))
    return byTag || compareName(a, b)
  }
  const compareTime = (a: (typeof resources)[number], b: (typeof resources)[number]) => getTime(a) - getTime(b)

  return filtered.sort((a, b) => {
    if (sortOrder.value === 'name') return compareName(a, b)
    if (sortOrder.value === 'tagName') return compareTagName(a, b)
    if (sortOrder.value === 'earliest') return compareTime(a, b)
    return compareTime(b, a)
  })
})
const hasActiveFilter = computed(
  () =>
    searchQuery.value.trim() !== '' ||
    filterSource.value !== 'all' ||
    filterType.value !== 'all' ||
    filterBroken.value !== 'all' ||
    filterTag.value !== ''
)
function handleTagInput(e: WebUiEvent<WebUiAutocomplete, 'input'>) {
  filterTag.value = e.target.value
}

function resetFilters() {
  searchQuery.value = ''
  filterSource.value = 'all'
  filterType.value = 'all'
  filterBroken.value = 'all'
  filterTag.value = ''
  sortOrder.value = 'latest'
}
function openSearch() {
  searchOpen.value = true
  void nextTick(() => {
    searchInputRef.value?.shadowRoot?.querySelector('input')?.focus()
  })
}
function closeSearch() {
  searchOpen.value = false
}
function handleSearchInput(event: WebUiEvent<WebUiInput, 'input'>) {
  searchQuery.value = event.target.value
}
function handleSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeSearch()
  }
}
function handleFilterSourceChange(e: WebUiEvent<WebUiSelect, 'change'>) {
  filterSource.value = e.target.value
}
function handleFilterTypeChange(e: WebUiEvent<WebUiSelect, 'change'>) {
  filterType.value = e.target.value
}
function handleFilterBrokenChange(e: WebUiEvent<WebUiSelect, 'change'>) {
  filterBroken.value = e.target.value
}
function handleSortChange(e: WebUiEvent<WebUiSelect, 'change'>) {
  sortOrder.value = e.target.value as SortOption
}

// --- Context menu ---
const contextResource = ref<Resource | null>(null)
const ctxMenuRef = ref<WebUiContextMenu>()
function onResourceContextmenu(resource: Resource, event: MouseEvent) {
  event.preventDefault()
  contextResource.value = resource
  ctxMenuRef.value?.openAt(event.clientX, event.clientY)
}

const resourceRenamingId = ref<string | null>(null)
const resourceNameDraft = ref('')
const listResourceRenameInputRef = ref<WebUiInput | null>(null)
const drawerResourceRenameInputRef = ref<WebUiInput | null>(null)
const resourceRenameSurface = ref<'list' | 'drawer'>('list')

function startResourceRename(resource: Resource, surface: 'list' | 'drawer' = 'list') {
  resourceRenamingId.value = resource.id
  resourceNameDraft.value = resource.name
  resourceRenameSurface.value = surface
  void nextTick(() => {
    const host = surface === 'drawer' ? drawerResourceRenameInputRef.value : listResourceRenameInputRef.value
    const input = host?.shadowRoot?.querySelector<HTMLInputElement>('input')
    input?.focus()
    input?.select()
  })
}

function commitResourceRename(resource: Resource) {
  if (resourceRenamingId.value !== resource.id) return
  const name = resourceNameDraft.value.trim()
  if (name) resource.name = name
  resourceRenamingId.value = null
  resourceNameDraft.value = ''
}

function handleResourceRenameKeydown(event: KeyboardEvent, resource: Resource) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitResourceRename(resource)
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    resourceRenamingId.value = null
    resourceNameDraft.value = ''
  }
}

function handleResourceNameInput(event: WebUiEvent<WebUiInput, 'input'>) {
  resourceNameDraft.value = event.target.value
}

function setListResourceRenameRef(el: Element | ComponentPublicInstance | null) {
  listResourceRenameInputRef.value = el instanceof Element ? (el as WebUiInput) : null
}

function setDrawerResourceRenameRef(el: Element | ComponentPublicInstance | null) {
  drawerResourceRenameInputRef.value = el instanceof Element ? (el as WebUiInput) : null
}

// --- Delete confirmation ---
const deleteConfirmOpen = ref(false)
const deleteTargetResource = ref<Resource | null>(null)
function confirmDeleteResource(resource: Resource) {
  deleteTargetResource.value = resource
  deleteConfirmOpen.value = true
}
function handleDeleteConfirm() {
  // Prototype: just close the dialog (no actual deletion)
  deleteConfirmOpen.value = false
  // Don't null deleteTargetResource here — removing body content mid-exit causes a jarring shrink.
  // It will be overwritten next time confirmDeleteResource() is called.
}
function handleDeleteCancel() {
  deleteConfirmOpen.value = false
}

// --- Preview from context menu ---
function handleContextPreview() {
  if (!contextResource.value) return
  selectedId.value = contextResource.value.id
  // Only open the standalone preview drawer — no need to open detail drawer
  previewDrawerOpen.value = true
}

// --- Add dialog (prototype only) ---
const addDialogOpen = ref(false)
const addDragActive = ref(false)
const addPasteCaptured = ref(false)
const queueRenamingId = ref<string | null>(null)
const queueNameDraft = ref('')
const queueTagEditingId = ref<string | null>(null)
const queueTagDraft = ref('')
const queueTagPresetTags = ref<Set<string>>(new Set())
const queueRenameInputRef = ref<WebUiInput | null>(null)
const queueTagInputRef = ref<WebUiAutocomplete | null>(null)
const addQueueSources = [
  { name: '设计稿.png', meta: '2.4 MB · 图片', icon: lucideImage, tone: 'blue', tags: ['设计'] },
  { name: '会议记录.md', meta: '18 KB · 文档', icon: lucideFileText, tone: 'green', tags: ['会议'] },
  { name: '产品演示.mp4', meta: '156 MB · 视频', icon: lucideFilm, tone: 'purple', tags: ['演示'] },
  { name: '产品发布流程', meta: '链接 · Notion 页面', icon: lucideLink, tone: 'green', tags: ['参考'] },
  { name: '竞品功能对比', meta: '链接 · 在线表格', icon: lucideGlobe, tone: 'blue', tags: ['工具'] },
  { name: '用户访谈录音.mp3', meta: '8.2 MB · 音频', icon: lucideHeadphones, tone: 'green', tags: [] },
  { name: '网页收藏.url', meta: '链接 · 网页', icon: lucideGlobe, tone: 'blue', tags: [] },
  { name: '原始素材包.zip', meta: '248 MB · 压缩包', icon: lucideFile, tone: 'purple', tags: [] },
  { name: '需求说明.md', meta: '22 KB · 文档', icon: lucideFileText, tone: 'green', tags: ['开发'] },
  { name: '未命名截图.png', meta: '1.8 MB · 图片', icon: lucideImage, tone: 'blue', tags: [] }
]
const addQueue = reactive(
  Array.from({ length: 10 }, (_, index) => {
    const source = addQueueSources[index]
    return { ...source, id: `add-item-${index + 1}`, tags: [...source.tags] }
  })
)
const queueTagOptions = computed(() => [...new Set([...allTags, ...addQueue.flatMap(item => item.tags)])].sort())

function openAddDialog() {
  addDialogOpen.value = true
  addDragActive.value = false
  addPasteCaptured.value = false
  queueRenamingId.value = null
  queueTagEditingId.value = null
  queueNameDraft.value = ''
  queueTagDraft.value = ''
}

function handleAddDialogOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  addDialogOpen.value = event.detail.open
}

function handleAddDrop() {
  addDragActive.value = false
}

function startQueueRename(item: (typeof addQueue)[number]) {
  queueTagEditingId.value = null
  queueRenamingId.value = item.id
  queueNameDraft.value = item.name
  void nextTick(() => {
    const input = queueRenameInputRef.value?.shadowRoot?.querySelector<HTMLInputElement>('input')
    input?.focus()
    input?.select()
  })
}

function commitQueueRename(item: (typeof addQueue)[number]) {
  const name = queueNameDraft.value.trim()
  if (name) item.name = name
  queueRenamingId.value = null
  queueNameDraft.value = ''
}

function handleQueueRenameKeydown(event: KeyboardEvent, item: (typeof addQueue)[number]) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitQueueRename(item)
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    queueRenamingId.value = null
    queueNameDraft.value = ''
  }
}

function handleQueueNameInput(event: WebUiEvent<WebUiInput, 'input'>) {
  queueNameDraft.value = event.target.value
}

function setQueueRenameRef(el: Element | ComponentPublicInstance | null) {
  queueRenameInputRef.value = el instanceof Element ? (el as WebUiInput) : null
}

function setQueueTagInputRef(el: Element | ComponentPublicInstance | null) {
  queueTagInputRef.value = el instanceof Element ? (el as WebUiAutocomplete) : null
}

function toggleQueueTagEditor(item: (typeof addQueue)[number]) {
  queueRenamingId.value = null
  const nextId = queueTagEditingId.value === item.id ? null : item.id
  queueTagEditingId.value = nextId
  queueTagDraft.value = ''
  queueTagPresetTags.value = nextId ? new Set(item.tags) : new Set()
  if (!nextId) return
  void nextTick(() => {
    const input = queueTagInputRef.value?.shadowRoot?.querySelector<HTMLInputElement>('.autocomplete-input')
    input?.focus()
  })
}

function addQueueTagFromField(item: (typeof addQueue)[number], field?: WebUiAutocomplete | null) {
  const tag = (field?.value ?? queueTagDraft.value).trim()
  if (tag && !item.tags.includes(tag)) item.tags.push(tag)
  if (field) field.value = ''
  queueTagDraft.value = ''
}

function commitQueueTag(item: (typeof addQueue)[number]) {
  addQueueTagFromField(item, queueTagInputRef.value)
  queueTagEditingId.value = null
  queueTagDraft.value = ''
  queueTagPresetTags.value = new Set()
}

function handleQueueTagInput(event: WebUiEvent<WebUiAutocomplete, 'input'>) {
  queueTagDraft.value = event.target.value
}

function handleQueueTagChange(event: WebUiEvent<WebUiAutocomplete, 'change'>, item: (typeof addQueue)[number]) {
  addQueueTagFromField(item, event.target)
  queueTagEditingId.value = null
  queueTagDraft.value = ''
  queueTagPresetTags.value = new Set()
}

function removeQueueTag(item: (typeof addQueue)[number], index: number) {
  item.tags.splice(index, 1)
}

function getQueueTagClass(item: (typeof addQueue)[number], tag: string) {
  if (queueTagEditingId.value === item.id && !queueTagPresetTags.value.has(tag) && !allTags.includes(tag)) {
    return 'add-queue-tag-new'
  }
  return getTagClass(tag)
}

watch(addDialogOpen, (open, _, onCleanup) => {
  if (!open) return

  const handleDocumentPaste = (event: ClipboardEvent) => {
    event.preventDefault()
    addPasteCaptured.value = true
  }

  document.addEventListener('paste', handleDocumentPaste, true)
  onCleanup(() => document.removeEventListener('paste', handleDocumentPaste, true))
})
</script>

<template>
  <web-ui-layout
    header-glow
    sidebarResizable
    class="min-h-dvh overflow-x-clip text-[#22212a] bg-white dark:text-[var(--wui-color-text)] dark:bg-[var(--wui-color-page)]"
    :sidebarCollapsed="sidebarCollapsed"
    :sidebarOpen="sidebarOpen"
    :sidebarWidth="sidebarWidth"
    @sidebar-collapsed-change="updateSidebarCollapsed"
    @sidebar-open-change="updateSidebarOpen"
    @sidebar-width-change="handleSidebarWidthChange"
  >
    <!-- Sidebar -->
    <div slot="sidebar" class="relative z-20 h-full pt-14 pb-4 px-2" aria-label="应用导航">
      <nav class="grid gap-1" aria-label="主导航">
        <button
          :class="[
            navItemClass,
            activeNav === 'library' ? '' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
            sidebarCollapsed ? 'justify-center' : ''
          ]"
          type="button"
          :data-active="activeNav === 'library'"
          @click="selectNav('library')"
        >
          <web-ui-tooltip
            portal
            placement="right"
            :content="sidebarCollapsed ? '资料库' : ''"
            :disabled="!sidebarCollapsed"
          >
            <web-ui-icon :icon="lucideFolderOpen"></web-ui-icon>
          </web-ui-tooltip>
          <span v-if="!sidebarCollapsed" class="text-sm whitespace-nowrap overflow-hidden">资料库</span>
        </button>
        <button
          :class="[
            navItemClass,
            activeNav === 'map' ? '' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
            sidebarCollapsed ? 'justify-center' : ''
          ]"
          type="button"
          :data-active="activeNav === 'map'"
          @click="selectNav('map')"
        >
          <web-ui-tooltip
            portal
            placement="right"
            :content="sidebarCollapsed ? '关系图谱' : ''"
            :disabled="!sidebarCollapsed"
          >
            <web-ui-icon :icon="lucideLayoutGrid"></web-ui-icon>
          </web-ui-tooltip>
          <span v-if="!sidebarCollapsed" class="text-sm whitespace-nowrap overflow-hidden">关系图谱</span>
        </button>
      </nav>
    </div>

    <!-- Header -->
    <header slot="header" class="w-full">
      <div class="flex gap-4 items-center justify-between px-6 py-2">
        <web-ui-button-group aria-label="页面导航">
          <web-ui-button icon variant="glass" aria-label="后退" :disabled="!canGoBack" @click="router.back()">
            <web-ui-icon :icon="lucideChevronLeft"></web-ui-icon>
          </web-ui-button>
          <web-ui-button icon variant="glass" aria-label="前进" :disabled="!canGoForward" @click="router.forward()">
            <web-ui-icon :icon="lucideChevronRight"></web-ui-icon>
          </web-ui-button>
        </web-ui-button-group>
        <div class="flex gap-1.5 items-center">
          <web-ui-tooltip content="新建">
            <web-ui-button icon variant="primary" aria-label="新建" @click="openAddDialog">
              <web-ui-icon :icon="lucidePlus"></web-ui-icon>
            </web-ui-button>
          </web-ui-tooltip>
          <web-ui-tooltip :content="filterOpen ? '收起筛选' : '筛选'">
            <web-ui-button
              icon
              :variant="hasActiveFilter ? 'secondary' : 'glass'"
              :aria-label="filterOpen ? '收起筛选' : '筛选'"
              @click="filterOpen = !filterOpen"
            >
              <web-ui-icon :icon="filterOpen ? lucideChevronUp : lucideListFilter"></web-ui-icon>
            </web-ui-button>
          </web-ui-tooltip>
          <web-ui-tooltip v-if="!searchOpen" content="搜索">
            <web-ui-button icon aria-label="搜索" @click="openSearch">
              <web-ui-icon :icon="lucideSearch"></web-ui-icon>
            </web-ui-button>
          </web-ui-tooltip>
          <web-ui-input
            v-else
            ref="searchInputRef"
            :value="searchQuery"
            clearable
            placeholder="按名称搜索"
            aria-label="按名称搜索"
            style="--wui-input-width: min(240px, calc(100vw - 180px))"
            @input="handleSearchInput"
            @keydown="handleSearchKeydown"
            @blur="closeSearch"
          >
            <web-ui-icon slot="prefix" :icon="lucideSearch"></web-ui-icon>
          </web-ui-input>
        </div>
      </div>

      <div
        class="transition-all duration-200 ease-in-out"
        :style="{ height: filterOpen ? 'auto' : '0px', overflow: filterOpen ? 'visible' : 'hidden' }"
      >
        <div
          class="flex flex-wrap gap-3 items-center px-6 py-2.5 text-sm text-[#5b5b66] dark:text-[var(--wui-color-text-secondary)]"
        >
          <label :class="filterLabelClass">
            <web-ui-select :value="filterSource" @change="handleFilterSourceChange" style="--wui-input-width: 128px">
              <web-ui-option value="all" label="全部来源">全部来源</web-ui-option>
              <web-ui-option value="local" label="本地文件">本地文件</web-ui-option>
              <web-ui-option value="link" label="链接">链接</web-ui-option>
            </web-ui-select>
          </label>
          <label :class="filterLabelClass">
            <web-ui-select :value="filterType" @change="handleFilterTypeChange" style="--wui-input-width: 128px">
              <web-ui-option value="all" label="全部类型">全部类型</web-ui-option>
              <web-ui-option value="image" label="图片">图片</web-ui-option>
              <web-ui-option value="video" label="视频">视频</web-ui-option>
              <web-ui-option value="audio" label="音频">音频</web-ui-option>
              <web-ui-option value="document" label="文档">文档</web-ui-option>
              <web-ui-option value="web" label="网页">网页</web-ui-option>
              <web-ui-option value="json" label="源代码">源代码</web-ui-option>
            </web-ui-select>
          </label>
          <label :class="filterLabelClass">
            <web-ui-select :value="filterBroken" @change="handleFilterBrokenChange" style="--wui-input-width: 128px">
              <web-ui-option value="all" label="全部状态">全部状态</web-ui-option>
              <web-ui-option value="valid" label="有效">有效</web-ui-option>
              <web-ui-option value="broken" label="已失效">已失效</web-ui-option>
            </web-ui-select>
          </label>
          <label :class="filterLabelClass">
            <web-ui-autocomplete
              :value="filterTag"
              @input="handleTagInput"
              placeholder="标签"
              style="--wui-input-width: 200px"
            >
              <web-ui-option v-for="tag in allTags" :key="tag" :value="tag" :label="tag">{{ tag }}</web-ui-option>
            </web-ui-autocomplete>
          </label>
          <label :class="filterLabelClass">
            <web-ui-select
              :value="sortOrder"
              aria-label="排序"
              @change="handleSortChange"
              style="--wui-input-width: 48px"
            >
              <web-ui-icon
                slot="trigger"
                :icon="
                  sortOrder === 'name'
                    ? tablerSortAscendingLetters
                    : sortOrder === 'tagName'
                      ? lucideTag
                      : sortOrder === 'latest'
                        ? heroiconsBarsArrowDown16Solid
                        : heroiconsBarsArrowUp16Solid
                "
                :size="16"
              ></web-ui-icon>
              <web-ui-option value="name" label="名称">名称</web-ui-option>
              <web-ui-option value="tagName" label="标签名称">标签名称</web-ui-option>
              <web-ui-option value="latest" label="最新">最新</web-ui-option>
              <web-ui-option value="earliest" label="最早">最早</web-ui-option>
            </web-ui-select>
          </label>
          <web-ui-button v-if="hasActiveFilter" variant="ghost" @click="resetFilters"
            ><web-ui-icon slot="prefix" :icon="lucideListRestart"></web-ui-icon>重置</web-ui-button
          >
        </div>
      </div>
    </header>

    <!-- Resource list + Detail drawer -->
    <div class="flex min-h-0 flex-1">
      <div class="flex-1 min-w-0 px-6 pb-16">
        <web-ui-context-menu ref="ctxMenuRef" class="block w-full">
          <!-- Empty state -->
          <div v-if="filteredResources.length === 0" class="flex flex-col items-center justify-center py-24">
            <web-ui-empty size="large" description="没有匹配的资源"></web-ui-empty>
          </div>

          <!-- Resource rows -->
          <div v-else class="w-full h-full">
            <div
              v-for="resource in filteredResources"
              :key="resource.id"
              class="resource-row group relative flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors duration-100 rounded-xl"
              :class="[
                selectedId === resource.id
                  ? 'bg-black/[0.05] dark:bg-white/[0.08]'
                  : 'hover:bg-black/[0.035] dark:hover:bg-white/[0.05]',
                resource.broken ? 'opacity-60' : ''
              ]"
              @click="selectResource(resource.id)"
              @contextmenu="onResourceContextmenu(resource, $event)"
            >
              <!-- Type avatar -->
              <div
                class="flex items-center justify-center size-10 shrink-0 rounded-lg"
                :class="typeTint[resource.resourceType]"
              >
                <web-ui-icon :icon="getResourceIcon(resource)" :size="20"></web-ui-icon>
              </div>

              <!-- Main -->
              <div class="flex flex-col min-w-0 gap-1 flex-1">
                <div class="flex items-center gap-1.5">
                  <web-ui-input
                    v-if="resourceRenamingId === resource.id"
                    :ref="setListResourceRenameRef"
                    :value="resourceNameDraft"
                    borderless
                    class="resource-rename-input"
                    :aria-label="`修改 ${resource.name} 的名称`"
                    @click.stop
                    @input="handleResourceNameInput"
                    @keydown="handleResourceRenameKeydown($event, resource)"
                    @blur="commitResourceRename(resource)"
                  />
                  <template v-else>
                    <span
                      class="block text-sm font-medium leading-snug break-words line-clamp-2 max-w-[60%]"
                      :class="
                        resource.broken
                          ? 'text-[#b0b0b8] line-through dark:text-[var(--wui-color-text-disabled)]'
                          : 'text-[#22212a] dark:text-[var(--wui-color-text)]'
                      "
                      >{{ resource.name }}</span
                    >
                    <web-ui-icon
                      v-if="resource.broken"
                      :icon="lucideTriangleAlert"
                      :size="14"
                      class="shrink-0 text-amber-500"
                    ></web-ui-icon>
                  </template>
                </div>
                <div
                  class="flex items-center gap-1.5 text-xs text-[#9a9aa4] dark:text-[var(--wui-color-text-secondary)]"
                >
                  <span class="inline-flex items-center gap-1">
                    <web-ui-icon
                      :icon="getSourceIcon(resource)"
                      :size="12"
                      class="text-[#bdbdc6] dark:text-[var(--wui-color-text-tertiary)]"
                    ></web-ui-icon>
                    {{ resource.sourceType === 'link' ? '链接' : '本地文件' }}
                  </span>
                  <template v-if="resource.size"
                    ><span class="text-[#d8d8de] dark:text-[var(--wui-color-text-tertiary)]">·</span
                    >{{ resource.size }}</template
                  >
                  <template v-if="resource.modifiedAt"
                    ><span class="text-[#d8d8de] dark:text-[var(--wui-color-text-tertiary)]">·</span
                    >{{ resource.modifiedAt }}</template
                  >
                </div>
              </div>

              <!-- Tags (secondary) -->
              <div v-if="resource.tags && resource.tags.length" class="flex gap-1.5 flex-wrap justify-end max-w-[25%]">
                <span
                  v-for="tag in resource.tags"
                  :key="tag"
                  class="inline-block px-2 py-0.5 rounded-full text-xs leading-tight whitespace-nowrap"
                  :class="getTagClass(tag)"
                  >{{ tag }}</span
                >
              </div>
            </div>
          </div>

          <!-- Context menu items -->
          <web-ui-dropdown-item v-if="contextResource && !contextResource.broken" @click="handleContextPreview">
            <web-ui-icon slot="prefix" :size="14" :icon="lucideEye"></web-ui-icon>
            预览
          </web-ui-dropdown-item>
          <web-ui-dropdown-item v-if="contextResource && !contextResource.broken" submenu>
            <web-ui-icon slot="prefix" :size="14" :icon="lucideExternalLink"></web-ui-icon>
            打开方式
            <web-ui-dropdown-item>
              <web-ui-icon slot="prefix" :size="14" :icon="lucideExternalLink"></web-ui-icon>
              系统默认应用
            </web-ui-dropdown-item>
            <web-ui-dropdown-item v-for="app in openWithApps[contextResource.resourceType] ?? []" :key="app.label">
              <web-ui-icon slot="prefix" :size="14" :icon="app.icon"></web-ui-icon>
              {{ app.label }}
            </web-ui-dropdown-item>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item v-if="contextResource" @click="contextResource && startResourceRename(contextResource)">
            <web-ui-icon slot="prefix" :size="14" :icon="lucidePenLine"></web-ui-icon>
            重命名
          </web-ui-dropdown-item>
          <web-ui-dropdown-item v-if="contextResource?.broken">
            <web-ui-icon slot="prefix" :size="14" :icon="lucideRefreshCw"></web-ui-icon>
            找回资源
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider></web-ui-dropdown-divider>
          <web-ui-dropdown-item v-if="contextResource && !contextResource.broken">
            <web-ui-icon slot="prefix" :size="14" :icon="lucideTags"></web-ui-icon>
            管理标签
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider v-if="contextResource && !contextResource.broken"></web-ui-dropdown-divider>
          <web-ui-dropdown-item
            style="color: var(--wui-color-danger, #ef4444)"
            @click="contextResource && confirmDeleteResource(contextResource)"
          >
            <web-ui-icon slot="prefix" :size="14" :icon="lucideTrash2"></web-ui-icon>
            删除
          </web-ui-dropdown-item>
        </web-ui-context-menu>
      </div>

      <!-- Detail Drawer -->
      <web-ui-drawer
        :open="drawerOpen"
        placement="right"
        draggable
        controlled
        style="--wui-drawer-width: min(640px, max(60vw, 320px))"
        @open-change="handleDetailDrawerOpenChange"
      >
        <div class="grid gap-5">
          <!-- Preview placeholder -->
          <div
            v-if="selectedResource"
            class="flex items-center justify-center h-36 rounded-xl bg-[#f5f5f7] border border-black/5 dark:bg-[var(--wui-color-surface-raised)] dark:border-[var(--wui-color-border)]"
          >
            <web-ui-icon
              :icon="getResourceIcon(selectedResource)"
              :size="48"
              class="text-[#c0c0c8] dark:text-[var(--wui-color-text-tertiary)]"
            ></web-ui-icon>
          </div>

          <!-- Title -->
          <h2 v-if="selectedResource" class="drawer-title flex items-center gap-3 m-0">
            <web-ui-icon
              :icon="getResourceIcon(selectedResource)"
              :size="22"
              class="shrink-0 text-[#5b5b66] dark:text-[var(--wui-color-text-secondary)]"
            ></web-ui-icon>
            <web-ui-input
              v-if="resourceRenamingId === selectedResource.id"
              :ref="setDrawerResourceRenameRef"
              :value="resourceNameDraft"
              borderless
              class="resource-rename-input drawer-rename-input"
              :aria-label="`修改 ${selectedResource.name} 的名称`"
              @click.stop
              @input="handleResourceNameInput"
              @keydown="handleResourceRenameKeydown($event, selectedResource)"
              @blur="commitResourceRename(selectedResource)"
            />
            <span
              v-else
              class="font-semibold text-[17px] leading-snug text-[#22212a] break-words min-w-0 dark:text-[var(--wui-color-text)]"
            >
              {{ selectedResource.name }}
            </span>
            <web-ui-button
              v-if="resourceRenamingId !== selectedResource.id"
              class="drawer-title-edit"
              icon
              variant="ghost"
              size="28"
              aria-label="重命名"
              @click="selectedResource && startResourceRename(selectedResource, 'drawer')"
            >
              <web-ui-icon :icon="lucidePenLine" :size="14"></web-ui-icon>
            </web-ui-button>
          </h2>

          <!-- Quick actions -->
          <web-ui-button-group v-if="selectedResource" class="self-start">
            <web-ui-button v-if="!selectedResource.broken" @click="openPreviewDrawer">
              <web-ui-icon slot="prefix" :size="14" :icon="lucideEye"></web-ui-icon>
              预览
            </web-ui-button>
            <web-ui-dropdown v-if="!selectedResource.broken" placement="bottom-start">
              <web-ui-button slot="trigger">
                打开方式
                <web-ui-icon slot="suffix" :size="14" :icon="lucideEllipsisVertical"></web-ui-icon>
              </web-ui-button>
              <web-ui-dropdown-item>
                <web-ui-icon slot="prefix" :size="14" :icon="lucideExternalLink"></web-ui-icon>
                系统默认应用
              </web-ui-dropdown-item>
              <web-ui-dropdown-item v-for="app in currentApps" :key="app.label">
                <web-ui-icon slot="prefix" :size="14" :icon="app.icon"></web-ui-icon>
                {{ app.label }}
              </web-ui-dropdown-item>
            </web-ui-dropdown>
            <web-ui-button v-if="selectedResource.broken">找回资源</web-ui-button>
            <web-ui-button
              style="--wui-button-color: var(--wui-color-danger, #ef4444)"
              @click="selectedResource && confirmDeleteResource(selectedResource)"
              >删除</web-ui-button
            >
          </web-ui-button-group>

          <!-- Tags -->
          <div v-if="selectedResource?.tags && selectedResource.tags.length > 0" class="flex gap-1.5 flex-wrap">
            <span
              v-for="tag in selectedResource.tags"
              :key="tag"
              class="inline-block px-2 py-0.5 rounded-full text-xs leading-tight whitespace-nowrap"
              :class="getTagClass(tag)"
              >{{ tag }}</span
            >
          </div>

          <!-- Metadata -->
          <div
            v-if="selectedResource"
            class="meta-table grid gap-0 text-[13px] rounded-xl border border-black/5 overflow-hidden dark:border-[var(--wui-color-border)]"
          >
            <div class="meta-row">
              <span class="meta-label">来源</span>
              <span class="meta-value">{{ selectedResource.sourceType === 'local' ? '本地文件' : '链接' }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">类型</span>
              <span class="meta-value">{{ selectedResource.resourceType }}</span>
            </div>
            <div v-if="selectedResource.size" class="meta-row">
              <span class="meta-label">文件大小</span>
              <span class="meta-value tabular-nums">{{ selectedResource.size }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">状态</span>
              <span
                :class="selectedResource.broken ? 'meta-value meta-value-danger' : 'meta-value meta-value-success'"
                >{{ selectedResource.broken ? '已失效' : '有效' }}</span
              >
            </div>
            <div v-if="selectedResource.createdAt" class="meta-row">
              <span class="meta-label">创建时间</span>
              <span class="meta-value tabular-nums">{{ selectedResource.createdAt }}</span>
            </div>
            <div v-if="selectedResource.modifiedAt" class="meta-row">
              <span class="meta-label">修改时间</span>
              <span class="meta-value tabular-nums">{{ selectedResource.modifiedAt }}</span>
            </div>
            <div v-if="selectedResource.path" class="meta-row items-start">
              <span class="meta-label shrink-0">路径</span>
              <span class="meta-value truncate ml-4" :title="selectedResource.path">{{ selectedResource.path }}</span>
            </div>
            <div v-if="selectedResource.url" class="meta-row items-start">
              <span class="meta-label shrink-0">URL</span>
              <span class="meta-value meta-value-link truncate ml-4" :title="selectedResource.url">{{
                selectedResource.url
              }}</span>
            </div>
          </div>
        </div>
      </web-ui-drawer>

      <!-- Standalone Preview Drawer (opened from context menu and detail drawer's "预览" button) -->
      <web-ui-drawer
        :open="previewDrawerOpen"
        placement="right"
        draggable
        controlled
        style="--wui-drawer-width: max(60vw, 320px)"
        @open-change="handlePreviewDrawerOpenChange"
      >
        <h2
          v-if="selectedResource"
          slot="header"
          class="m-0 w-full min-w-0 truncate px-12 text-center text-[17px] font-semibold leading-snug text-[#22212a] dark:text-[var(--wui-color-text)]"
        >
          {{ selectedResource.name }}
        </h2>
        <div v-if="selectedResource" class="grid gap-4">
          <div
            class="flex items-center justify-center h-52 rounded-xl bg-[#f5f5f7] border border-black/5 dark:bg-[var(--wui-color-surface-raised)] dark:border-[var(--wui-color-border)]"
          >
            <web-ui-icon
              :icon="getResourceIcon(selectedResource)"
              :size="40"
              class="text-[#c0c0c8] dark:text-[var(--wui-color-text-tertiary)]"
            ></web-ui-icon>
          </div>
        </div>
      </web-ui-drawer>
    </div>

    <!-- Delete confirmation dialog -->
    <web-ui-dialog :open="deleteConfirmOpen" controlled no-backdrop-close @open-change="handleDeleteCancel">
      <div slot="title">确认删除</div>
      <template v-if="deleteTargetResource">
        <p class="m-0 text-[14px] text-[#5b5b66] dark:text-[var(--wui-color-text-secondary)]">
          确定要删除「<span class="font-medium text-[#22212a] dark:text-[var(--wui-color-text)]">{{
            deleteTargetResource.name
          }}</span
          >」吗？此操作无法撤销。
        </p>
      </template>
      <div slot="footer" class="flex gap-3">
        <web-ui-button full variant="secondary" @click="handleDeleteCancel">取消</web-ui-button>
        <web-ui-button full variant="danger" @click="handleDeleteConfirm">删除</web-ui-button>
      </div>
    </web-ui-dialog>

    <!-- Add dialog (prototype only) -->
    <web-ui-dialog
      :open="addDialogOpen"
      controlled
      style="--wui-dialog-max-width: min(80vw, 880px); --wui-dialog-max-height: min(90vh, 640px)"
      @open-change="handleAddDialogOpenChange"
    >
      <div slot="body" class="add-dialog-body">
        <header class="add-dialog-header">
          <div class="add-dialog-heading">
            <h2 id="add-dialog-title" class="add-dialog-title">添加资源</h2>
          </div>

          <p v-if="addPasteCaptured" class="add-paste-status" role="status">
            <web-ui-icon :icon="lucideClipboardPaste" :size="16"></web-ui-icon>
            已捕获剪贴板内容
          </p>
        </header>

        <main class="add-dialog-main">
          <section class="add-panel add-upload-panel">
            <p class="add-upload-description">选择本地文件、拖拽到上传区，或直接粘贴剪贴板内容。</p>
            <label
              class="add-dropzone"
              :class="{ 'is-active': addDragActive }"
              @dragenter.prevent="addDragActive = true"
              @dragover.prevent="addDragActive = true"
              @dragleave.prevent="addDragActive = false"
              @drop.prevent="handleAddDrop"
            >
              <input type="file" multiple class="sr-only" aria-label="选择要添加的文件" />
              <span class="add-dropzone-icon">
                <web-ui-icon :icon="lucideUpload" :size="24"></web-ui-icon>
              </span>
              <span class="add-dropzone-title">拖拽文件到此处，或点击选择</span>
              <span class="add-dropzone-caption">支持图片、文档、音视频等格式，可批量添加</span>
            </label>
          </section>

          <aside class="add-panel add-queue" aria-labelledby="add-queue-title">
            <div class="add-panel-head">
              <h3 id="add-queue-title" class="add-panel-title">待添加</h3>
              <span class="add-panel-tag">{{ addQueue.length }} 项</span>
            </div>
            <ol class="add-queue-list">
              <li v-for="(item, itemIndex) in addQueue" :key="item.id" class="add-queue-item" :data-tone="item.tone">
                <span class="add-queue-icon">
                  <web-ui-icon :icon="item.icon" :size="16"></web-ui-icon>
                </span>
                <span class="add-queue-main">
                  <div class="add-queue-top">
                    <span class="add-queue-copy">
                      <web-ui-input
                        v-if="queueRenamingId === item.id"
                        :ref="setQueueRenameRef"
                        :value="queueNameDraft"
                        full
                        borderless
                        :aria-label="`修改 ${item.name} 的名称`"
                        @input="handleQueueNameInput"
                        @keydown="handleQueueRenameKeydown($event, item)"
                        @blur="commitQueueRename(item)"
                      />
                      <span v-else class="add-queue-name">{{ item.name }}</span>
                    </span>
                    <span class="add-queue-actions">
                      <web-ui-tooltip content="修改名称" :placement="itemIndex < 5 ? 'bottom' : 'top'">
                        <web-ui-button
                          icon
                          variant="ghost"
                          size="28"
                          aria-label="修改名称"
                          @click="startQueueRename(item)"
                        >
                          <web-ui-icon :icon="lucidePenLine" :size="14"></web-ui-icon>
                        </web-ui-button>
                      </web-ui-tooltip>
                    </span>
                  </div>
                  <div class="add-queue-tag-area">
                    <span class="add-queue-meta">{{ item.meta }}</span>
                    <div class="add-queue-tag-list">
                      <span
                        v-for="(tag, tagIndex) in item.tags"
                        :key="tag"
                        class="add-queue-tag"
                        :class="getQueueTagClass(item, tag)"
                      >
                        {{ tag }}
                        <web-ui-button
                          v-if="queueTagEditingId === item.id"
                          icon
                          variant="ghost"
                          size="16"
                          :aria-label="`移除标签 ${tag}`"
                          @click="removeQueueTag(item, tagIndex)"
                        >
                          <web-ui-icon :icon="lucideX" :size="10"></web-ui-icon>
                        </web-ui-button>
                      </span>
                      <web-ui-tooltip content="添加标签" :placement="itemIndex < 5 ? 'bottom' : 'top'">
                        <web-ui-button
                          v-if="queueTagEditingId === item.id"
                          class="add-queue-tag-toggle"
                          icon
                          variant="primary"
                          size="20"
                          aria-label="添加标签"
                          :disabled="!queueTagDraft.trim()"
                          @click="commitQueueTag(item)"
                        >
                          <web-ui-icon :icon="lucideCheck" :size="12"></web-ui-icon>
                        </web-ui-button>
                        <web-ui-button
                          v-else
                          class="add-queue-tag-toggle"
                          icon
                          variant="secondary"
                          size="20"
                          aria-label="添加标签"
                          @click="toggleQueueTagEditor(item)"
                        >
                          <web-ui-icon :icon="lucidePlus" :size="12"></web-ui-icon>
                        </web-ui-button>
                      </web-ui-tooltip>
                    </div>
                    <web-ui-autocomplete
                      v-if="queueTagEditingId === item.id"
                      :ref="setQueueTagInputRef"
                      :value="queueTagDraft"
                      class="add-queue-tag-input"
                      borderless
                      allow-custom-value
                      portal
                      placeholder="输入或选择标签"
                      aria-label="添加标签"
                      style="--wui-input-width: 100%; --wui-autocomplete-max-width: 240px"
                      @input="handleQueueTagInput"
                      @change="handleQueueTagChange($event, item)"
                    >
                      <web-ui-option v-for="tag in queueTagOptions" :key="tag" :value="tag" :label="tag">{{
                        tag
                      }}</web-ui-option>
                      <div slot="empty">未找到「{{ queueTagDraft }}」，按 Enter 新建</div>
                    </web-ui-autocomplete>
                  </div>
                </span>
              </li>
            </ol>
          </aside>
        </main>

        <footer class="add-dialog-footer">
          <div class="add-dialog-actions">
            <web-ui-button variant="secondary" @click="addDialogOpen = false">取消</web-ui-button>
            <web-ui-button variant="primary" @click="addDialogOpen = false">
              <web-ui-icon slot="prefix" :icon="lucidePlus" :size="16"></web-ui-icon>
              {{ addQueue.length > 1 ? '批量添加' : '添加' }}
            </web-ui-button>
          </div>
        </footer>
      </div>
    </web-ui-dialog>
    <web-ui-back-top></web-ui-back-top>
  </web-ui-layout>
</template>

<style scoped>
.nav-item[data-active='true'] {
  color: var(--wui-color-accent, #08f);
  background-color: var(--wui-color-surface-control, #dfdfdf);
}

.nav-item[data-active='true']:hover {
  background-color: color-mix(in srgb, var(--wui-color-surface-control, #dfdfdf) 90%, var(--wui-color-text, #1b1b1b));
}

.nav-item[data-active='true']:active {
  background-color: color-mix(in srgb, var(--wui-color-surface-control, #dfdfdf) 70%, var(--wui-color-text, #1b1b1b));
}

.meta-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 14px;
}

.meta-row + .meta-row {
  border-top: 1px solid rgb(0 0 0 / 0.05);
}

.meta-label {
  color: #8a8a94;
}

.meta-value {
  color: #22212a;
  text-align: right;
}

.meta-value-success {
  color: #059669;
}

.meta-value-danger {
  color: #ef4444;
}

.meta-value-link {
  color: var(--wui-color-accent, #08f);
}

.resource-rename-input {
  --wui-input-width: 100%;
  --wui-color-focus-ring: transparent;
  display: block;
  width: 100%;
  min-width: 0;
  max-width: 60%;
}

.drawer-rename-input {
  flex: 1 1 auto;
  max-width: 100%;
}

.drawer-title-edit {
  flex-shrink: 0;
  margin-left: auto;
  opacity: 0;
  transition: opacity 120ms;
}

.drawer-title-edit:focus-within,
.drawer-title:hover .drawer-title-edit {
  opacity: 1;
}

.add-dropzone {
  cursor: pointer;

  display: grid;
  gap: 12px;
  place-content: center;
  justify-items: center;

  height: 100%;
  min-height: 240px;
  padding: 28px 24px;
  border: 1.5px dashed rgb(0 0 0 / 0.15);
  border-radius: 20px;

  color: inherit;

  background: #f5f5f7;

  transition:
    border-color 160ms,
    background-color 160ms,
    transform 160ms;
}

.add-dropzone:hover {
  background: #eeeef1;
}

.add-dropzone.is-active {
  transform: scale(1.005);
  border-color: var(--wui-color-accent, #08f);
  background: color-mix(in srgb, var(--wui-color-accent, #08f) 9%, transparent);
}

.add-dropzone:focus-within {
  --wui-internal-glass-focus-ring:
    inset 0 0 0 1px var(--wui-color-accent, #08f),
    0 0 0 var(--wui-focus-ring-width, 3px) var(--wui-color-focus-ring, rgb(0 136 255 / 0.4));

  border-color: var(--wui-color-accent, #08f);
}

.add-dropzone-icon {
  display: grid;
  place-items: center;

  width: 52px;
  height: 52px;
  border-radius: 18px;

  color: var(--wui-color-accent, #08f);

  background: color-mix(in srgb, var(--wui-color-accent, #08f) 10%, transparent);

  transition: background-color 160ms;
}

.add-dropzone-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}

.add-dropzone-caption {
  font-size: 12px;
  line-height: 1.4;
  color: #6a6a6a;
}

/* 扣除 .wui-dialog-body 的 padding，让外层 dialog 而不是 slot 内容占据 80vw/90vh。 */
.add-dialog-body {
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;

  width: min(calc(80vw - 56px), 824px);
  height: min(calc(90vh - 56px), 584px);

  /* 上/左/右对齐为 28px 视觉内边距，同时保持 dialog 占据 80vw/90vh。 */
  margin: 8px 4px 4px;
}

.add-dialog-header {
  padding-bottom: 12px;
}

.add-dialog-heading {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.add-dialog-title {
  flex-shrink: 0;

  margin: 0;

  font-size: 20px;
  font-weight: 650;
  line-height: 1.3;
  color: #22212a;
}

.add-upload-description {
  overflow: hidden;

  min-width: 0;
  margin: 0;

  font-size: 13px;
  line-height: 1.5;
  color: #6a6a6a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-dialog-main {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  min-height: 0;
}

.add-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;

  min-width: 0;
  min-height: 0;
}

.add-upload-panel {
  grid-template-rows: auto minmax(0, 1fr);
}

.add-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.add-panel-title {
  display: flex;
  gap: 6px;
  align-items: center;

  margin: 0;

  font-size: 13px;
  font-weight: 600;
  color: #22212a;
}

.add-panel-tag {
  padding: 4px 8px;
  border-radius: 999px;

  font-size: 12px;
  line-height: 1;
  color: #6a6a6a;

  background: rgb(0 0 0 / 0.04);
}

.add-queue {
  position: relative;

  overflow: hidden;

  padding: 0;
  border: 0;

  background: transparent;
}

.add-queue-list {
  scrollbar-width: auto;
  scrollbar-gutter: auto;

  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;

  height: 100%;
  min-height: 0;
  margin: 0;
  padding: 0;

  list-style: none;
}

.add-queue-item {
  display: flex;
  gap: 10px;
  align-items: center;

  padding: 10px 12px;
  border: 1px solid rgb(0 0 0 / 0.05);
  border-radius: 16px;

  background: white;
}

.add-queue-icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;

  width: 32px;
  height: 32px;
  border-radius: 10px;
}

.add-queue-item[data-tone='blue'] .add-queue-icon {
  color: #0284c7;
  background: rgb(2 132 199 / 0.1);
}

.add-queue-item[data-tone='green'] .add-queue-icon {
  color: #059669;
  background: rgb(5 150 105 / 0.1);
}

.add-queue-item[data-tone='purple'] .add-queue-icon {
  color: #7c3aed;
  background: rgb(124 58 237 / 0.1);
}

.add-queue-copy {
  display: flex;
  flex: 1 1 auto;
  gap: 6px;
  align-items: baseline;

  min-width: 0;
}

.add-queue-copy web-ui-input {
  --wui-color-focus-ring: transparent;
  flex: 1 1 auto;
  min-width: 0;
}

.add-queue-main {
  display: grid;
  flex: 1 1 auto;
  gap: 5px;
  min-width: 0;
}

.add-queue-top {
  display: flex;
  gap: 8px;
  align-items: center;
}

.add-queue-name {
  overflow: hidden;
  flex: 0 1 auto;

  min-width: 0;

  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: #22212a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-queue-meta {
  flex-shrink: 0;

  font-size: 12px;
  line-height: 20px;
  color: #6a6a6a;
  white-space: nowrap;
}

.add-queue-actions {
  display: flex;
  flex-shrink: 0;
  gap: 4px;
  align-items: center;

  margin-left: auto;
}

.add-queue-tag-input {
  display: block;

  width: 100%;
  min-width: 0;
  max-width: 240px;
  margin-top: 8px;
}

.add-queue-tag-area {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;

  min-width: 0;
}

.add-queue-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;

  min-width: 0;
}

.add-queue-tag,
.add-queue-tag-empty {
  display: inline-flex;
  gap: 2px;
  align-items: center;

  height: 20px;
  padding: 4px 7px;
  border-radius: 999px;

  font-size: 12px;
  line-height: 1;
}

.add-queue-tag:has(web-ui-button) {
  padding-right: 2px;
}

.add-queue-tag-empty {
  padding: 4px 7px;
  color: #9a9aa4;
  background: rgb(0 0 0 / 0.05);
}

.add-queue-tag-new {
  color: var(--wui-color-text-secondary, #5b5b66);
  background: var(--wui-color-surface-control, #dfdfdf);
}

.add-queue-tag web-ui-button {
  flex-shrink: 0;
}

.add-queue-tag-toggle {
  flex-shrink: 0;
}

.add-paste-status {
  display: flex;
  gap: 6px;
  align-items: center;

  width: fit-content;
  margin-top: 12px;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--wui-color-accent, #08f) 24%, transparent);
  border-radius: 999px;

  font-size: 12px;
  color: var(--wui-color-accent, #08f);

  background: color-mix(in srgb, var(--wui-color-accent, #08f) 8%, transparent);
}

.add-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;

  padding-top: 14px;
  border-top: 1px solid rgb(0 0 0 / 0.05);
}

.add-dialog-actions {
  display: flex;
  gap: 12px;
}

@media (width <= 900px) {
  .add-dialog-main {
    overflow: hidden;
    grid-template-columns: 1fr;
    grid-template-rows: repeat(2, minmax(0, 1fr));
  }

  .add-dropzone {
    padding: 20px;
  }
}

@media (height <= 640px) {
  .add-dialog-main {
    overflow: hidden;
    gap: 16px;
  }

  .add-dialog-header {
    padding-bottom: 6px;
  }

  .add-dropzone {
    gap: 8px;
    min-height: 0;
    padding: 8px 16px;
  }

  .add-dialog-footer {
    padding-top: 10px;
  }

  .add-dropzone-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }

  .add-dropzone-title {
    font-size: 13px;
  }

  .add-dropzone-caption {
    font-size: 11px;
  }

  .add-panel-head {
    height: 20px;
  }
}

.meta-table .meta-row:nth-child(odd) {
  background-color: color-mix(in srgb, var(--wui-color-text) 3%, var(--wui-color-page));
}

@media (prefers-color-scheme: dark) {
  .meta-row + .meta-row {
    border-top-color: var(--wui-color-border);
  }

  .meta-table .meta-row:nth-child(odd) {
    background-color: color-mix(in srgb, var(--wui-color-text) 6%, var(--wui-color-page));
  }

  .meta-label {
    color: var(--wui-color-text-secondary);
  }

  .meta-value {
    color: var(--wui-color-text);
  }

  .meta-value-success {
    color: var(--wui-color-success);
  }

  .meta-value-danger {
    color: var(--wui-color-danger);
  }

  .add-dropzone {
    border-color: var(--wui-color-border);
    background: color-mix(in srgb, var(--wui-color-text) 3%, transparent);
  }

  .add-dropzone:hover {
    background: color-mix(in srgb, var(--wui-color-text) 6%, transparent);
  }

  .add-dropzone-icon,
  .add-panel-title,
  .add-dropzone-title {
    color: var(--wui-color-text);
  }

  .add-dropzone-icon {
    color: var(--wui-color-text-secondary);
    background: color-mix(in srgb, var(--wui-color-text) 8%, transparent);
  }

  .add-dropzone-caption,
  .add-upload-description,
  .add-queue-meta,
  .add-panel-tag {
    color: var(--wui-color-text-secondary);
  }

  .add-dialog-footer {
    border-top-color: var(--wui-color-border);
  }

  .add-dialog-title,
  .add-queue-name {
    color: var(--wui-color-text);
  }

  .add-panel-tag {
    background: color-mix(in srgb, var(--wui-color-text) 6%, transparent);
  }

  .add-queue-item {
    border-color: var(--wui-color-border);
    background: color-mix(in srgb, var(--wui-color-text) 5%, transparent);
  }

  .add-queue-tag-new {
    color: var(--wui-color-text-secondary);
    background: color-mix(in srgb, var(--wui-color-text) 12%, transparent);
  }
}

.resource-row + .resource-row::before {
  content: '';

  position: absolute;
  top: 0;
  right: 16px;
  left: 16px;

  height: 1px;

  background: color-mix(in srgb, var(--wui-color-text) 5%, transparent);
}
</style>
