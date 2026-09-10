<script setup lang="ts">
import type {
  WebUiAutocomplete,
  WebUiDialog,
  WebUiDrawer,
  WebUiDropdown,
  WebUiEvent,
  WebUiInput,
  WebUiLayout,
  WebUiPopover,
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
  'flex items-center gap-2 w-full min-w-9 min-h-9 px-2.5 border-0 rounded-full font-medium cursor-pointer text-left transition-all duration-150 text-[#5b5b66] active:bg-[rgb(34_33_42/0.12)] dark:text-[var(--wui-color-text)] dark:active:bg-white/15 data-[active=true]:text-[var(--wui-color-accent,#08f)] data-[active=true]:bg-[var(--wui-color-surface-control,#dfdfdf)] data-[active=true]:hover:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_90%,var(--wui-color-text,#1b1b1b))] data-[active=true]:active:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_70%,var(--wui-color-text,#1b1b1b))]'
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

const defaultTagClass = 'bg-black/[0.05] text-gray-500 dark:bg-white/10 dark:text-neutral-300'
function getTagClass(tag: string) {
  return tagColors[tag] ?? defaultTagClass
}

// --- Resource data ---
interface Resource {
  id: string
  name: string
  ext?: string
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
    name: '图片名称aaa',
    ext: 'png',
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
    name: '文件名称11',
    ext: 'md',
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
    name: '视频xxx',
    ext: 'mp4',
    sourceType: 'local',
    resourceType: 'video',
    size: '156 MB',
    createdAt: '2025-04-10',
    modifiedAt: '2025-04-10',
    path: '/Users/me/Movies/xxx.mp4'
  },
  {
    id: '4',
    name: '音频123',
    ext: 'mp3',
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
    name: '文档xyz',
    ext: 'word',
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
    name: '文档yyy',
    ext: 'json',
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
    name: '失效文件名称22',
    ext: 'md',
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
    name: '音频123',
    ext: 'mp3',
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
    name: '标签极多的资源',
    ext: 'json',
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
  closeTagPopover()
  closeDrawerTagEditor()
  drawerOpen.value = true
}
function openPreviewDrawer() {
  previewDrawerOpen.value = true
}
function handleDetailDrawerOpenChange(event: WebUiEvent<WebUiDrawer, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  drawerOpen.value = event.detail.open
  if (!event.detail.open) closeDrawerTagEditor()
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

const resourceTypeLabels: Record<Resource['resourceType'], string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
  document: '文档',
  web: '网页',
  json: '源代码',
  folder: '文件夹'
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

const listRenamingId = ref<string | null>(null)
const drawerRenamingId = ref<string | null>(null)
const resourceNameDraft = ref('')
const listResourceRenameInputRef = ref<WebUiInput | null>(null)
const drawerResourceRenameInputRef = ref<WebUiInput | null>(null)

function startResourceRename(resource: Resource, surface: 'list' | 'drawer' = 'list') {
  if (surface === 'drawer') {
    drawerRenamingId.value = resource.id
    listRenamingId.value = null
  } else {
    listRenamingId.value = resource.id
    drawerRenamingId.value = null
  }
  resourceNameDraft.value = resource.name
  void nextTick(() => {
    const host = surface === 'drawer' ? drawerResourceRenameInputRef.value : listResourceRenameInputRef.value
    const input = host?.shadowRoot?.querySelector<HTMLInputElement>('input')
    input?.focus()
    input?.select()
  })
}

function commitResourceRename(resource: Resource, surface: 'list' | 'drawer' = 'list') {
  const renamingId = surface === 'drawer' ? drawerRenamingId.value : listRenamingId.value
  if (renamingId !== resource.id) return
  const name = resourceNameDraft.value.trim()
  if (name) resource.name = name
  if (surface === 'drawer') drawerRenamingId.value = null
  else listRenamingId.value = null
  resourceNameDraft.value = ''
}

function handleResourceRenameKeydown(event: KeyboardEvent, resource: Resource, surface: 'list' | 'drawer' = 'list') {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitResourceRename(resource, surface)
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    listRenamingId.value = null
    drawerRenamingId.value = null
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
  { name: '设计稿', ext: 'png', meta: '2.4 MB · 图片', icon: lucideImage, tone: 'blue', tags: ['设计'] },
  { name: '会议记录', ext: 'md', meta: '18 KB · 文档', icon: lucideFileText, tone: 'green', tags: ['会议'] },
  { name: '产品演示', ext: 'mp4', meta: '156 MB · 视频', icon: lucideFilm, tone: 'purple', tags: ['演示'] },
  { name: '产品发布流程', meta: '链接 · Notion 页面', icon: lucideLink, tone: 'green', tags: ['参考'] },
  { name: '竞品功能对比', meta: '链接 · 在线表格', icon: lucideGlobe, tone: 'blue', tags: ['工具'] },
  { name: '用户访谈录音', ext: 'mp3', meta: '8.2 MB · 音频', icon: lucideHeadphones, tone: 'green', tags: [] },
  { name: '网页收藏', meta: '链接 · 网页', icon: lucideGlobe, tone: 'blue', tags: [] },
  { name: '原始素材包', ext: 'zip', meta: '248 MB · 压缩包', icon: lucideFile, tone: 'purple', tags: [] },
  { name: '需求说明', ext: 'md', meta: '22 KB · 文档', icon: lucideFileText, tone: 'green', tags: ['开发'] },
  { name: '未命名截图', ext: 'png', meta: '1.8 MB · 图片', icon: lucideImage, tone: 'blue', tags: [] }
]
const queueToneClass: Record<string, string> = {
  blue: 'bg-[rgb(2_132_199/0.1)] text-[#0284c7]',
  green: 'bg-[rgb(5_150_105/0.1)] text-[#059669]',
  purple: 'bg-[rgb(124_58_237/0.1)] text-[#7c3aed]'
}
const addQueue = reactive(
  Array.from({ length: 10 }, (_, index) => {
    const source = addQueueSources[index]
    return { ...source, id: `add-item-${index + 1}`, tags: [...source.tags] }
  })
)
function getQueueTagOptions(item: (typeof addQueue)[number]) {
  const candidates = [...new Set([...allTags, ...addQueue.flatMap(entry => entry.tags)])]
  return candidates.filter(tag => !item.tags.includes(tag)).sort()
}

function openAddDialog() {
  addDialogOpen.value = true
  addDragActive.value = false
  addPasteCaptured.value = false
  queueRenamingId.value = null
  closeQueueTagEditor()
  queueNameDraft.value = ''
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
    input?.click()
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
  closeQueueTagEditor()
}

function handleQueueTagInput(event: WebUiEvent<WebUiAutocomplete, 'input'>) {
  queueTagDraft.value = event.target.value
}

function isQueueTagEditorTarget(target: EventTarget | null, itemId: string) {
  if (!(target instanceof Element)) return false
  return target.closest(`[data-queue-tag-editor="${itemId}"]`) !== null
}

function handleQueueTagBlur(event: Event, item: (typeof addQueue)[number]) {
  setTimeout(() => {
    if (queueTagEditingId.value !== item.id) return
    const nextTarget =
      event instanceof FocusEvent && event.relatedTarget instanceof Element
        ? event.relatedTarget
        : document.activeElement
    if (isQueueTagEditorTarget(nextTarget, item.id)) return
    closeQueueTagEditor()
  }, 0)
}

function closeQueueTagEditor() {
  queueTagEditingId.value = null
  queueTagDraft.value = ''
  queueTagPresetTags.value = new Set()
}

function handleQueueTagChange(event: WebUiEvent<WebUiAutocomplete, 'change'>, item: (typeof addQueue)[number]) {
  addQueueTagFromField(item, event.target)
  closeQueueTagEditor()
}

function removeQueueTag(item: (typeof addQueue)[number], index: number) {
  item.tags.splice(index, 1)
}

function removeAddQueue(item: (typeof addQueue)[number]) {
  const index = addQueue.findIndex(entry => entry.id === item.id)
  if (index === -1) return

  addQueue.splice(index, 1)
  queueRenamingId.value = null
  queueNameDraft.value = ''
  if (queueTagEditingId.value === item.id) closeQueueTagEditor()
}

function getQueueTagActionLabel(item: (typeof addQueue)[number]) {
  if (queueTagEditingId.value !== item.id) return '添加标签'
  return queueTagDraft.value.trim() ? '确认添加' : '取消'
}

function getQueueTagClass(item: (typeof addQueue)[number], tag: string) {
  if (queueTagEditingId.value === item.id && !queueTagPresetTags.value.has(tag) && !allTags.includes(tag)) {
    return 'bg-[var(--wui-color-surface-control,#dfdfdf)] text-[var(--wui-color-text-secondary,#5b5b66)] dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_12%,transparent)] dark:text-[var(--wui-color-text-secondary)]'
  }
  return getTagClass(tag)
}

// --- Drawer tag editing ---
const drawerTagEditing = ref(false)
const drawerTagDraft = ref('')
const drawerTagPresetTags = ref<Set<string>>(new Set())
const drawerTagAutocompleteRef = ref<WebUiAutocomplete | null>(null)

const drawerTagOptions = computed(() =>
  [...new Set(allTags)].filter(tag => !selectedResource.value?.tags?.includes(tag)).sort()
)

function setDrawerTagAutocompleteRef(el: Element | ComponentPublicInstance | null) {
  drawerTagAutocompleteRef.value = el instanceof Element ? (el as WebUiAutocomplete) : null
}

function closeDrawerTagEditor() {
  drawerTagEditing.value = false
  drawerTagDraft.value = ''
  drawerTagPresetTags.value = new Set()
}

function toggleDrawerTagEditor() {
  const next = !drawerTagEditing.value
  drawerTagEditing.value = next
  drawerTagDraft.value = ''
  drawerTagPresetTags.value = next ? new Set(selectedResource.value?.tags ?? []) : new Set()
  if (!next) return
  void nextTick(() => {
    const input = drawerTagAutocompleteRef.value?.shadowRoot?.querySelector<HTMLInputElement>('.autocomplete-input')
    input?.focus()
    input?.click()
  })
}

function addDrawerTagFromField(field?: WebUiAutocomplete | null) {
  const resource = selectedResource.value
  const tag = (field?.value ?? drawerTagDraft.value).trim()
  if (resource && tag && resource.tags && !resource.tags.includes(tag)) resource.tags.push(tag)
  if (field) field.value = ''
  drawerTagDraft.value = ''
}

function commitDrawerTag() {
  addDrawerTagFromField(drawerTagAutocompleteRef.value)
  closeDrawerTagEditor()
}

function handleDrawerTagInput(event: WebUiEvent<WebUiAutocomplete, 'input'>) {
  drawerTagDraft.value = event.target.value
}

function handleDrawerTagChange(event: WebUiEvent<WebUiAutocomplete, 'change'>) {
  addDrawerTagFromField(event.target)
  closeDrawerTagEditor()
}

function removeDrawerTag(index: number) {
  selectedResource.value?.tags?.splice(index, 1)
}

function isDrawerTagEditorTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return target.closest('[data-drawer-tag-editor]') !== null
}

function handleDrawerTagBlur(event: Event) {
  setTimeout(() => {
    if (!drawerTagEditing.value) return
    const nextTarget =
      event instanceof FocusEvent && event.relatedTarget instanceof Element
        ? event.relatedTarget
        : document.activeElement
    if (isDrawerTagEditorTarget(nextTarget)) return
    closeDrawerTagEditor()
  }, 0)
}

function getDrawerTagClass(tag: string) {
  if (drawerTagEditing.value && !drawerTagPresetTags.value.has(tag) && !allTags.includes(tag)) {
    return 'bg-[var(--wui-color-surface-control,#dfdfdf)] text-[var(--wui-color-text-secondary,#5b5b66)] dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_12%,transparent)] dark:text-[var(--wui-color-text-secondary)]'
  }
  return getTagClass(tag)
}

// --- Context menu tag popover ---
const tagPopoverResourceId = ref<string | null>(null)
const tagPopoverResource = computed(() => resources.find(r => r.id === tagPopoverResourceId.value) ?? null)
const contextTagEditing = ref(false)
const contextTagDraft = ref('')
const contextTagPresetTags = ref<Set<string>>(new Set())
const contextTagAutocompleteRef = ref<WebUiAutocomplete | null>(null)

const contextTagOptions = computed(() =>
  [...new Set(allTags)].filter(tag => !tagPopoverResource.value?.tags?.includes(tag)).sort()
)

function setContextTagAutocompleteRef(el: Element | ComponentPublicInstance | null) {
  contextTagAutocompleteRef.value = el instanceof Element ? (el as WebUiAutocomplete) : null
}

function closeContextTagEditor() {
  contextTagEditing.value = false
  contextTagDraft.value = ''
  contextTagPresetTags.value = new Set()
}

function closeTagPopover() {
  closeContextTagEditor()
  tagPopoverResourceId.value = null
}

function focusContextTagInput() {
  const input = contextTagAutocompleteRef.value?.shadowRoot?.querySelector<HTMLInputElement>('.autocomplete-input')
  input?.focus()
  input?.click()
}

function openContextTagEditor() {
  if (!contextResource.value) return
  tagPopoverResourceId.value = contextResource.value.id
  contextTagEditing.value = true
  contextTagPresetTags.value = new Set(contextResource.value.tags ?? [])
  ctxMenuRef.value?.close()
  void nextTick(focusContextTagInput)
}

function toggleContextTagEditor() {
  const next = !contextTagEditing.value
  contextTagEditing.value = next
  contextTagDraft.value = ''
  contextTagPresetTags.value = next ? new Set(tagPopoverResource.value?.tags ?? []) : new Set()
  if (!next) return
  void nextTick(focusContextTagInput)
}

function handleTagPopoverOpenChange(event: WebUiEvent<WebUiPopover, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  if (!event.detail.open) closeTagPopover()
}

function addContextTagFromField(field?: WebUiAutocomplete | null) {
  const resource = tagPopoverResource.value
  const tag = (field?.value ?? contextTagDraft.value).trim()
  if (resource && tag && resource.tags && !resource.tags.includes(tag)) resource.tags.push(tag)
  if (field) field.value = ''
  contextTagDraft.value = ''
}

function commitContextTag() {
  addContextTagFromField(contextTagAutocompleteRef.value)
  closeContextTagEditor()
}

function handleContextTagInput(event: WebUiEvent<WebUiAutocomplete, 'input'>) {
  contextTagDraft.value = event.target.value
}

function handleContextTagChange(event: WebUiEvent<WebUiAutocomplete, 'change'>) {
  addContextTagFromField(event.target)
  closeContextTagEditor()
}

function removeContextTag(index: number) {
  tagPopoverResource.value?.tags?.splice(index, 1)
}

function isContextTagEditorTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return (
    target.closest('[data-context-tag-editor], [data-context-tag-autocomplete], [data-context-tag-popover]') !== null
  )
}

function handleContextTagBlur(event: Event) {
  setTimeout(() => {
    if (!contextTagEditing.value) return
    const nextTarget =
      event instanceof FocusEvent && event.relatedTarget instanceof Element
        ? event.relatedTarget
        : document.activeElement
    if (isContextTagEditorTarget(nextTarget)) return
    closeContextTagEditor()
  }, 0)
}

function getContextTagClass(tag: string) {
  if (contextTagEditing.value && !contextTagPresetTags.value.has(tag) && !allTags.includes(tag)) {
    return 'bg-[var(--wui-color-surface-control,#dfdfdf)] text-[var(--wui-color-text-secondary,#5b5b66)] dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_12%,transparent)] dark:text-[var(--wui-color-text-secondary)]'
  }
  return getTagClass(tag)
}

watch(tagPopoverResourceId, (id, _, onCleanup) => {
  if (!id) return
  const handleDocumentClick = (event: Event) => {
    const path = event.composedPath?.() ?? []
    if (path.some(node => node instanceof Element && node.hasAttribute('data-context-tag-option'))) return
    if (isContextTagEditorTarget(event.target)) return
    closeTagPopover()
  }
  const handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') closeTagPopover()
  }
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleDocumentKeydown)
  onCleanup(() => {
    document.removeEventListener('click', handleDocumentClick)
    document.removeEventListener('keydown', handleDocumentKeydown)
  })
})

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
    class="min-h-dvh overflow-x-clip text-[#22212a] bg-white [--wui-layout-mobile-toggle-inset:24px] dark:text-[var(--wui-color-text)] dark:bg-[var(--wui-color-page)]"
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
      <div class="flex gap-4 items-center justify-between px-6 py-2 max-[640px]:pl-0">
        <!-- 窄屏时布局组件的展开 Toggle 自带 24px 左缩进（--wui-layout-mobile-toggle-inset），header 内容去掉左内边距避免双重缩进。 -->
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
          <web-ui-tooltip content="筛选和排序">
            <web-ui-button
              icon
              :variant="hasActiveFilter ? 'secondary' : 'glass'"
              aria-label="筛选和排序"
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
            class="[--wui-input-width:min(240px,calc(100vw-180px))]"
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
            <web-ui-select :value="filterSource" class="[--wui-input-width:128px]" @change="handleFilterSourceChange">
              <web-ui-option value="all" label="全部来源">全部来源</web-ui-option>
              <web-ui-option value="local" label="本地文件">本地文件</web-ui-option>
              <web-ui-option value="link" label="链接">链接</web-ui-option>
            </web-ui-select>
          </label>
          <label :class="filterLabelClass">
            <web-ui-select :value="filterType" class="[--wui-input-width:128px]" @change="handleFilterTypeChange">
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
            <web-ui-select :value="filterBroken" class="[--wui-input-width:128px]" @change="handleFilterBrokenChange">
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
              class="[--wui-input-width:200px]"
            >
              <web-ui-option v-for="tag in allTags" :key="tag" :value="tag" :label="tag">{{ tag }}</web-ui-option>
            </web-ui-autocomplete>
          </label>
          <label :class="filterLabelClass">
            <web-ui-select
              :value="sortOrder"
              aria-label="排序"
              @change="handleSortChange"
              class="[--wui-input-width:48px]"
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
      <div class="flex-1 min-w-0 px-6 pb-16 pt-2">
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
              class="group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-100 rounded-xl"
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
                    v-if="listRenamingId === resource.id"
                    :ref="setListResourceRenameRef"
                    :value="resourceNameDraft"
                    borderless
                    class="block w-full min-w-0 max-w-[60%] [--wui-input-width:100%]"
                    :aria-label="`修改 ${resource.name} 的名称`"
                    @click.stop
                    @input="handleResourceNameInput"
                    @keydown="handleResourceRenameKeydown($event, resource, 'list')"
                    @blur="commitResourceRename(resource, 'list')"
                  />
                  <template v-else>
                    <span
                      class="text-sm font-medium leading-snug break-words line-clamp-2 max-w-[60%] max-[640px]:max-w-full"
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
                  <template v-if="resource.ext"
                    ><span class="text-[#d8d8de] dark:text-[var(--wui-color-text-tertiary)]">·</span
                    >{{ resource.ext.toUpperCase() }}</template
                  >
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

              <web-ui-popover
                trigger="manual"
                placement="bottom-start"
                portal
                class="absolute inset-x-0 top-full h-0"
                data-context-tag-popover
                :open="tagPopoverResourceId === resource.id"
                @open-change="handleTagPopoverOpenChange"
              >
                <span slot="trigger"></span>
                <div
                  v-if="tagPopoverResourceId === resource.id"
                  class="grid w-[240px] gap-2"
                  data-context-tag-editor
                  @click.stop
                  @contextmenu.stop
                >
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span
                      v-for="(tag, tagIndex) in tagPopoverResource?.tags"
                      :key="tag"
                      class="inline-flex h-5 items-center gap-0.5 rounded-full px-[7px] py-1 text-xs leading-none has-[web-ui-button]:pr-0.5"
                      :class="getContextTagClass(tag)"
                    >
                      {{ tag }}
                      <web-ui-button
                        class="shrink-0 [--wui-button-color:currentColor]"
                        icon
                        variant="ghost"
                        size="16"
                        :aria-label="`移除标签 ${tag}`"
                        @click="removeContextTag(tagIndex)"
                      >
                        <web-ui-icon :icon="lucideX" :size="10"></web-ui-icon>
                      </web-ui-button>
                    </span>
                    <web-ui-tooltip
                      :content="contextTagDraft.trim() ? '确认标签' : contextTagEditing ? '收起标签编辑' : '添加标签'"
                      placement="top"
                    >
                      <web-ui-button
                        v-if="contextTagEditing"
                        icon
                        :variant="contextTagDraft.trim() ? 'primary' : 'glass'"
                        size="20"
                        :aria-label="contextTagDraft.trim() ? '确认标签' : '收起标签编辑'"
                        @pointerdown.prevent
                        @click="contextTagDraft.trim() ? commitContextTag() : closeContextTagEditor()"
                      >
                        <web-ui-icon :icon="contextTagDraft.trim() ? lucideCheck : lucideX" :size="12"></web-ui-icon>
                      </web-ui-button>
                      <web-ui-button
                        v-else
                        icon
                        variant="glass"
                        size="20"
                        aria-label="添加标签"
                        @click="toggleContextTagEditor()"
                      >
                        <web-ui-icon :icon="lucidePlus" :size="12"></web-ui-icon>
                      </web-ui-button>
                    </web-ui-tooltip>
                  </div>
                  <web-ui-autocomplete
                    v-if="contextTagEditing"
                    :ref="setContextTagAutocompleteRef"
                    :value="contextTagDraft"
                    data-context-tag-autocomplete
                    class="block w-full min-w-0 [--wui-autocomplete-max-width:100%] [--wui-input-width:100%]"
                    borderless
                    allow-custom-value
                    portal
                    placeholder="输入或选择标签"
                    aria-label="添加标签"
                    @input="handleContextTagInput"
                    @blur="handleContextTagBlur"
                    @change="handleContextTagChange"
                  >
                    <web-ui-option
                      v-for="tag in contextTagOptions"
                      :key="tag"
                      :value="tag"
                      :label="tag"
                      data-context-tag-option
                      >{{ tag }}</web-ui-option
                    >
                    <div slot="empty">
                      {{
                        tagPopoverResource?.tags?.includes(contextTagDraft.trim())
                          ? '该标签已添加'
                          : `未找到「${contextTagDraft}」，按 Enter 新建`
                      }}
                    </div>
                  </web-ui-autocomplete>
                </div>
              </web-ui-popover>
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
          <web-ui-dropdown-item
            v-if="contextResource && !contextResource.broken"
            @click="contextResource && openContextTagEditor()"
          >
            <web-ui-icon slot="prefix" :size="14" :icon="lucideTags"></web-ui-icon>
            管理标签
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider v-if="contextResource && !contextResource.broken"></web-ui-dropdown-divider>
          <web-ui-dropdown-item
            class="text-[var(--wui-color-danger,#ef4444)]"
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
        class="[--wui-drawer-width:min(640px,max(60vw,320px))]"
        @open-change="handleDetailDrawerOpenChange"
      >
        <div class="grid gap-5">
          <!-- Preview placeholder -->
          <div
            v-if="selectedResource"
            class="flex items-center justify-center h-36 rounded-xl bg-[#f5f5f7] dark:bg-[var(--wui-color-surface-raised)]"
          >
            <web-ui-icon
              :icon="getResourceIcon(selectedResource)"
              :size="48"
              class="text-[#c0c0c8] dark:text-[var(--wui-color-text-tertiary)]"
            ></web-ui-icon>
          </div>

          <!-- Title -->
          <h2 v-if="selectedResource" class="group/title flex items-center gap-3 min-h-9 m-0">
            <web-ui-icon
              :icon="getResourceIcon(selectedResource)"
              :size="22"
              class="shrink-0 text-[#5b5b66] dark:text-[var(--wui-color-text-secondary)]"
            ></web-ui-icon>
            <web-ui-input
              v-if="drawerRenamingId === selectedResource.id"
              :ref="setDrawerResourceRenameRef"
              :value="resourceNameDraft"
              borderless
              class="block w-full min-w-0 max-w-full flex-[1_1_auto] [--wui-input-width:100%]"
              :aria-label="`修改 ${selectedResource.name} 的名称`"
              @click.stop
              @input="handleResourceNameInput"
              @keydown="handleResourceRenameKeydown($event, selectedResource, 'drawer')"
              @blur="commitResourceRename(selectedResource, 'drawer')"
            />
            <span
              v-else
              class="font-semibold text-[17px] leading-snug text-[#22212a] break-words min-w-0 dark:text-[var(--wui-color-text)]"
            >
              {{ selectedResource.name }}
            </span>
            <web-ui-button
              v-if="drawerRenamingId !== selectedResource.id"
              class="shrink-0 opacity-0 transition-opacity duration-120 group-hover/title:opacity-100 group-focus-within/title:opacity-100"
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
              class="[--wui-button-color:var(--wui-color-danger,#ef4444)]"
              @click="selectedResource && confirmDeleteResource(selectedResource)"
              >删除</web-ui-button
            >
          </web-ui-button-group>

          <!-- Tags -->
          <div v-if="selectedResource" class="flex flex-col items-start gap-1.5" data-drawer-tag-editor>
            <div class="flex flex-wrap items-center gap-1.5">
              <span
                v-for="(tag, tagIndex) in selectedResource.tags"
                :key="tag"
                class="inline-flex h-5 items-center gap-0.5 rounded-full px-[7px] py-1 text-xs leading-none has-[web-ui-button]:pr-0.5"
                :class="getDrawerTagClass(tag)"
              >
                {{ tag }}
                <web-ui-button
                  class="shrink-0 [--wui-button-color:currentColor]"
                  icon
                  variant="ghost"
                  size="16"
                  :aria-label="`移除标签 ${tag}`"
                  @click="removeDrawerTag(tagIndex)"
                >
                  <web-ui-icon :icon="lucideX" :size="10"></web-ui-icon>
                </web-ui-button>
              </span>
              <web-ui-tooltip
                :content="drawerTagDraft.trim() ? '确认标签' : drawerTagEditing ? '收起标签编辑' : '添加标签'"
                placement="top"
              >
                <web-ui-button
                  v-if="drawerTagEditing"
                  icon
                  :variant="drawerTagDraft.trim() ? 'primary' : 'glass'"
                  size="20"
                  :aria-label="drawerTagDraft.trim() ? '确认标签' : '收起标签编辑'"
                  @pointerdown.prevent
                  @click="drawerTagDraft.trim() ? commitDrawerTag() : closeDrawerTagEditor()"
                >
                  <web-ui-icon :icon="drawerTagDraft.trim() ? lucideCheck : lucideX" :size="12"></web-ui-icon>
                </web-ui-button>
                <web-ui-button
                  v-else
                  icon
                  variant="glass"
                  size="20"
                  aria-label="添加标签"
                  @click="toggleDrawerTagEditor()"
                >
                  <web-ui-icon :icon="lucidePlus" :size="12"></web-ui-icon>
                </web-ui-button>
              </web-ui-tooltip>
            </div>
            <web-ui-autocomplete
              v-if="drawerTagEditing"
              :ref="setDrawerTagAutocompleteRef"
              :value="drawerTagDraft"
              class="block w-[200px] min-w-0 max-w-[200px] [--wui-autocomplete-max-width:240px] [--wui-input-width:200px]"
              borderless
              allow-custom-value
              portal
              placeholder="输入或选择标签"
              aria-label="添加标签"
              @input="handleDrawerTagInput"
              @blur="handleDrawerTagBlur"
              @change="handleDrawerTagChange"
            >
              <web-ui-option v-for="tag in drawerTagOptions" :key="tag" :value="tag" :label="tag">{{
                tag
              }}</web-ui-option>
              <div slot="empty">
                {{
                  selectedResource?.tags?.includes(drawerTagDraft.trim())
                    ? '该标签已添加'
                    : `未找到「${drawerTagDraft}」，按 Enter 新建`
                }}
              </div>
            </web-ui-autocomplete>
          </div>

          <!-- Metadata -->
          <div v-if="selectedResource" class="grid text-[13px]">
            <div class="grid grid-cols-[80px_minmax(0,1fr)] items-baseline gap-x-6 py-2.5">
              <span class="text-[#8a8a94] dark:text-[var(--wui-color-text-secondary)]">来源</span>
              <span class="min-w-0 text-[#22212a] dark:text-[var(--wui-color-text)]">{{
                selectedResource.sourceType === 'local' ? '本地文件' : '链接'
              }}</span>
            </div>
            <div class="grid grid-cols-[80px_minmax(0,1fr)] items-baseline gap-x-6 py-2.5">
              <span class="text-[#8a8a94] dark:text-[var(--wui-color-text-secondary)]">类型</span>
              <span class="min-w-0 text-[#22212a] dark:text-[var(--wui-color-text)]">{{
                resourceTypeLabels[selectedResource.resourceType]
              }}</span>
            </div>
            <div v-if="selectedResource.size" class="grid grid-cols-[80px_minmax(0,1fr)] items-baseline gap-x-6 py-2.5">
              <span class="text-[#8a8a94] dark:text-[var(--wui-color-text-secondary)]">文件大小</span>
              <span class="min-w-0 tabular-nums text-[#22212a] dark:text-[var(--wui-color-text)]">{{
                selectedResource.size
              }}</span>
            </div>
            <div class="grid grid-cols-[80px_minmax(0,1fr)] items-baseline gap-x-6 py-2.5">
              <span class="text-[#8a8a94] dark:text-[var(--wui-color-text-secondary)]">状态</span>
              <span
                :class="
                  selectedResource.broken
                    ? 'min-w-0 text-[#ef4444] dark:text-[var(--wui-color-danger)]'
                    : 'min-w-0 text-[#059669] dark:text-[var(--wui-color-success)]'
                "
                >{{ selectedResource.broken ? '已失效' : '有效' }}</span
              >
            </div>
            <div
              v-if="selectedResource.createdAt"
              class="grid grid-cols-[80px_minmax(0,1fr)] items-baseline gap-x-6 py-2.5"
            >
              <span class="text-[#8a8a94] dark:text-[var(--wui-color-text-secondary)]">创建时间</span>
              <span class="min-w-0 tabular-nums text-[#22212a] dark:text-[var(--wui-color-text)]">{{
                selectedResource.createdAt
              }}</span>
            </div>
            <div
              v-if="selectedResource.modifiedAt"
              class="grid grid-cols-[80px_minmax(0,1fr)] items-baseline gap-x-6 py-2.5"
            >
              <span class="text-[#8a8a94] dark:text-[var(--wui-color-text-secondary)]">修改时间</span>
              <span class="min-w-0 tabular-nums text-[#22212a] dark:text-[var(--wui-color-text)]">{{
                selectedResource.modifiedAt
              }}</span>
            </div>
            <div v-if="selectedResource.path" class="grid grid-cols-[80px_minmax(0,1fr)] items-baseline gap-x-6 py-2.5">
              <span class="text-[#8a8a94] dark:text-[var(--wui-color-text-secondary)]">路径</span>
              <span
                class="min-w-0 truncate text-[#22212a] dark:text-[var(--wui-color-text)]"
                :title="selectedResource.path"
                >{{ selectedResource.path }}</span
              >
            </div>
            <div v-if="selectedResource.url" class="grid grid-cols-[80px_minmax(0,1fr)] items-baseline gap-x-6 py-2.5">
              <span class="text-[#8a8a94] dark:text-[var(--wui-color-text-secondary)]">URL</span>
              <span class="min-w-0 truncate text-[var(--wui-color-accent,#08f)]" :title="selectedResource.url">{{
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
        class="[--wui-drawer-width:max(60vw,320px)]"
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
            class="flex items-center justify-center h-52 rounded-xl bg-[#f5f5f7] dark:bg-[var(--wui-color-surface-raised)]"
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
      class="[--wui-dialog-max-width:min(80vw,880px)] [--wui-dialog-max-height:min(90vh,640px)]"
      @open-change="handleAddDialogOpenChange"
    >
      <div
        slot="body"
        class="m-[8px_4px_4px] grid h-[min(calc(90vh-56px),584px)] w-[min(calc(80vw-56px),824px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden"
      >
        <header class="pb-3 max-[640px]:pb-1.5">
          <div class="flex items-center justify-start">
            <h2
              id="add-dialog-title"
              class="m-0 shrink-0 text-[20px] font-[650] leading-[1.3] text-[#22212a] dark:text-[var(--wui-color-text)]"
            >
              添加资源
            </h2>
          </div>

          <p
            v-if="addPasteCaptured"
            class="mt-3 flex w-fit items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--wui-color-accent,#08f)_8%,transparent)] px-2.5 py-1.5 text-xs text-[var(--wui-color-accent,#08f)]"
            role="status"
          >
            <web-ui-icon :icon="lucideClipboardPaste" :size="16"></web-ui-icon>
            已捕获剪贴板内容
          </p>
        </header>

        <main class="grid min-h-0 grid-cols-2 gap-5 max-[640px]:gap-4 max-[900px]:grid-cols-1 max-[900px]:grid-rows-2">
          <section class="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5 overflow-hidden">
            <p
              class="m-0 min-w-0 truncate text-[13px] leading-6 text-[#6a6a6a] dark:text-[var(--wui-color-text-secondary)]"
            >
              选择本地文件、拖拽到上传区，或直接粘贴剪贴板内容。
            </p>
            <label
              class="grid h-full cursor-pointer place-content-center justify-items-center gap-3 rounded-[20px] bg-[#f0f0f4] px-6 py-7 transition-[background-color] duration-[160ms] hover:bg-[#e9e9ee] dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_4%,transparent)] dark:hover:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_7%,transparent)] max-[640px]:gap-2 max-[640px]:px-4 max-[640px]:py-2 max-[900px]:p-5"
              :class="
                addDragActive ? 'scale-[1.005] bg-[color-mix(in_srgb,var(--wui-color-accent,#08f)_9%,transparent)]' : ''
              "
              @dragenter.prevent="addDragActive = true"
              @dragover.prevent="addDragActive = true"
              @dragleave.prevent="addDragActive = false"
              @drop.prevent="handleAddDrop"
            >
              <input type="file" multiple class="sr-only" aria-label="选择要添加的文件" />
              <span
                class="grid size-[52px] place-items-center rounded-[18px] bg-[color-mix(in_srgb,var(--wui-color-accent,#08f)_10%,transparent)] text-[var(--wui-color-accent,#08f)] transition-[background-color] duration-[160ms] dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_8%,transparent)] dark:text-[var(--wui-color-text-secondary)] max-[640px]:size-10 max-[640px]:rounded-xl"
              >
                <web-ui-icon :icon="lucideUpload" :size="24"></web-ui-icon>
              </span>
              <span
                class="text-[15px] font-semibold leading-[1.4] text-[#22212a] dark:text-[var(--wui-color-text)] max-[640px]:text-[13px]"
                >拖拽文件到此处，或点击选择</span
              >
              <span
                class="text-xs leading-[1.4] text-[#6a6a6a] dark:text-[var(--wui-color-text-secondary)] max-[640px]:text-[11px]"
                >支持图片、文档、音视频等格式，可批量添加</span
              >
            </label>
          </section>

          <aside
            class="relative grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5 overflow-hidden border-0 bg-transparent p-0"
            aria-labelledby="add-queue-title"
          >
            <div class="flex min-h-6 items-center justify-between">
              <h3
                id="add-queue-title"
                class="m-0 flex items-center gap-1.5 text-[13px] font-semibold text-[#22212a] dark:text-[var(--wui-color-text)]"
              >
                待添加
              </h3>
              <span
                class="rounded-full bg-black/[0.04] px-2 py-1 text-xs leading-none text-[#6a6a6a] dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_6%,transparent)] dark:text-[var(--wui-color-text-secondary)]"
                >{{ addQueue.length }} 项</span
              >
            </div>
            <ol
              class="m-0 flex h-full min-h-0 list-none flex-col gap-2 overflow-y-auto p-0 [scrollbar-gutter:auto] [scrollbar-width:auto]"
            >
              <li
                v-for="(item, itemIndex) in addQueue"
                :key="item.id"
                class="flex items-start gap-2.5 rounded-2xl px-3 py-2.5 transition-colors duration-100 hover:bg-black/[0.03] dark:hover:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_5%,transparent)]"
              >
                <span class="grid size-8 shrink-0 place-items-center rounded-[10px]" :class="queueToneClass[item.tone]">
                  <web-ui-icon :icon="item.icon" :size="16"></web-ui-icon>
                </span>
                <span class="grid min-w-0 flex-[1_1_auto] gap-[5px]">
                  <div class="flex h-8 items-center gap-2">
                    <span class="flex h-8 min-w-0 flex-[1_1_auto] items-center gap-1.5">
                      <web-ui-input
                        v-if="queueRenamingId === item.id"
                        :ref="setQueueRenameRef"
                        :value="queueNameDraft"
                        full
                        borderless
                        class="min-w-0 flex-[1_1_auto]"
                        :aria-label="`修改 ${item.name} 的名称`"
                        @input="handleQueueNameInput"
                        @keydown="handleQueueRenameKeydown($event, item)"
                        @blur="commitQueueRename(item)"
                      />
                      <span
                        v-else
                        class="min-w-0 flex-[0_1_auto] overflow-hidden text-[14px] font-medium leading-[1.35] text-ellipsis whitespace-nowrap text-[#22212a] dark:text-[var(--wui-color-text)]"
                        >{{ item.name }}</span
                      >
                      <web-ui-tooltip
                        v-if="queueRenamingId !== item.id"
                        content="编辑名称"
                        :placement="itemIndex < 5 ? 'bottom' : 'top'"
                      >
                        <web-ui-button
                          icon
                          variant="ghost"
                          size="28"
                          aria-label="编辑名称"
                          @click="startQueueRename(item)"
                        >
                          <web-ui-icon :icon="lucidePenLine" :size="14"></web-ui-icon>
                        </web-ui-button>
                      </web-ui-tooltip>
                    </span>
                    <span class="ml-auto flex shrink-0 items-center gap-1">
                      <web-ui-tooltip content="移除" :placement="itemIndex < 5 ? 'bottom' : 'top'">
                        <web-ui-button
                          class="[--wui-button-color:var(--wui-color-danger,#dc2626)]"
                          icon
                          variant="ghost"
                          size="28"
                          aria-label="移除待添加项"
                          @click="removeAddQueue(item)"
                        >
                          <web-ui-icon :icon="lucideTrash2" :size="14"></web-ui-icon>
                        </web-ui-button>
                      </web-ui-tooltip>
                    </span>
                  </div>
                  <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span
                      class="shrink-0 text-xs leading-5 whitespace-nowrap text-[#6a6a6a] dark:text-[var(--wui-color-text-secondary)]"
                      >{{ item.ext ? `${item.meta} · ${item.ext.toUpperCase()}` : item.meta }}</span
                    >
                    <div
                      class="flex min-w-0 flex-[0_0_100%] flex-wrap items-center gap-[5px]"
                      :data-queue-tag-editor="item.id"
                    >
                      <span
                        v-for="(tag, tagIndex) in item.tags"
                        :key="tag"
                        class="inline-flex h-5 items-center gap-0.5 rounded-full px-[7px] py-1 text-xs leading-none has-[web-ui-button]:pr-0.5"
                        :class="getQueueTagClass(item, tag)"
                      >
                        {{ tag }}
                        <web-ui-button
                          class="shrink-0 [--wui-button-color:currentColor]"
                          icon
                          variant="ghost"
                          size="16"
                          :aria-label="`移除标签 ${tag}`"
                          @click="removeQueueTag(item, tagIndex)"
                        >
                          <web-ui-icon :icon="lucideX" :size="10"></web-ui-icon>
                        </web-ui-button>
                      </span>
                      <web-ui-tooltip
                        :content="getQueueTagActionLabel(item)"
                        :placement="itemIndex < 5 ? 'bottom' : 'top'"
                      >
                        <web-ui-button
                          v-if="queueTagEditingId === item.id"
                          class="shrink-0"
                          icon
                          :variant="queueTagDraft.trim() ? 'primary' : 'glass'"
                          size="20"
                          :aria-label="getQueueTagActionLabel(item)"
                          @pointerdown.prevent
                          @click="queueTagDraft.trim() ? commitQueueTag(item) : closeQueueTagEditor()"
                        >
                          <web-ui-icon :icon="queueTagDraft.trim() ? lucideCheck : lucideX" :size="12"></web-ui-icon>
                        </web-ui-button>
                        <web-ui-button
                          v-else
                          class="shrink-0"
                          icon
                          variant="glass"
                          size="20"
                          aria-label="添加标签"
                          @click="toggleQueueTagEditor(item)"
                        >
                          <web-ui-icon :icon="lucidePlus" :size="12"></web-ui-icon>
                        </web-ui-button>
                      </web-ui-tooltip>
                    </div>
                  </div>
                  <web-ui-autocomplete
                    v-if="queueTagEditingId === item.id"
                    :ref="setQueueTagInputRef"
                    :value="queueTagDraft"
                    :data-queue-tag-editor="item.id"
                    class="mt-0.5 block w-[200px] min-w-0 max-w-[200px] [--wui-autocomplete-max-width:240px] [--wui-input-width:200px]"
                    borderless
                    allow-custom-value
                    portal
                    placeholder="输入或选择标签"
                    aria-label="添加标签"
                    @input="handleQueueTagInput"
                    @blur="handleQueueTagBlur($event, item)"
                    @change="handleQueueTagChange($event, item)"
                  >
                    <web-ui-option v-for="tag in getQueueTagOptions(item)" :key="tag" :value="tag" :label="tag">{{
                      tag
                    }}</web-ui-option>
                    <div slot="empty">
                      {{
                        item.tags.includes(queueTagDraft.trim())
                          ? '该标签已添加'
                          : `未找到「${queueTagDraft}」，按 Enter 新建`
                      }}
                    </div>
                  </web-ui-autocomplete>
                </span>
              </li>
            </ol>
          </aside>
        </main>

        <footer class="flex items-center justify-end pt-3.5 max-[640px]:pt-2.5">
          <div class="flex gap-3">
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
