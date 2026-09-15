<script setup lang="ts">
import type {
  WebUiAutocomplete,
  WebUiDialog,
  WebUiDrawer,
  WebUiDropdown,
  WebUiEvent,
  WebUiInput,
  WebUiLayout,
  WebUiSelect,
  WebUiSvgDrawLines
} from '@greypan/web-ui'
import type { WebUiContextMenu } from '@greypan/web-ui/components/context-menu'
import {
  lucideChevronLeft,
  lucideChevronRight,
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
import { computed, nextTick, onScopeDispose, reactive, ref, watch, type ComponentPublicInstance } from 'vue'
import { useRouter } from 'vue-router'

import { canGoBack, canGoForward } from '@/composables/useHistoryNav'

// --- Navigation ---
const router = useRouter()
const activeNav = ref<'library' | 'map'>('library')
const navDrawRefs = ref<Record<'library' | 'map', WebUiSvgDrawLines | null>>({
  library: null,
  map: null
})
function setNavDrawRef(key: 'library' | 'map', element: unknown) {
  navDrawRefs.value[key] = (element as WebUiSvgDrawLines | null) ?? null
}
const navItemClass =
  'flex items-center gap-2 w-full min-w-9 min-h-9 px-2.5 border-0 rounded-full font-medium cursor-pointer text-left transition-all duration-150 text-[#5b5b66] active:bg-[rgb(34_33_42/0.12)] dark:text-[var(--wui-color-text)] dark:active:bg-white/15 data-[active=true]:text-[var(--wui-color-accent,#08f)] data-[active=true]:bg-[var(--wui-color-surface-control,#dfdfdf)] data-[active=true]:hover:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_90%,var(--wui-color-text,#1b1b1b))] data-[active=true]:active:bg-[color-mix(in_srgb,var(--wui-color-surface-control,#dfdfdf)_70%,var(--wui-color-text,#1b1b1b))]'
function selectNav(next: 'library' | 'map') {
  activeNav.value = next
  void navDrawRefs.value[next]?.replay()

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const iconHost = navDrawRefs.value[next]
  if (!iconHost?.animate) return
  iconHost.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)', offset: 0.4 }, { transform: 'scale(1)' }], {
    duration: 720,
    easing: 'ease-out'
  })
}

// --- Sidebar toggle ---
const sidebarCollapsed = ref(false)
const sidebarOpen = ref(false)
const desktopSidebarWidth = ref('240px')
const mobileSidebarWidth = 'min(320px, 80vw)'
const mobileSidebarQuery = window.matchMedia('(max-width: 640px)')
const isMobileSidebarViewport = ref(mobileSidebarQuery.matches)
const isMobile = isMobileSidebarViewport
const sidebarWidth = computed(() => (isMobileSidebarViewport.value ? mobileSidebarWidth : desktopSidebarWidth.value))
function syncMobileSidebarViewport() {
  isMobileSidebarViewport.value = mobileSidebarQuery.matches
}
syncMobileSidebarViewport()
mobileSidebarQuery.addEventListener('change', syncMobileSidebarViewport)
onScopeDispose(() => mobileSidebarQuery.removeEventListener('change', syncMobileSidebarViewport))
function updateSidebarCollapsed(event: WebUiEvent<WebUiLayout, 'sidebar-collapsed-change'>) {
  sidebarCollapsed.value = event.detail.collapsed
}
function handleSidebarWidthChange(event: WebUiEvent<WebUiLayout, 'sidebar-width-change'>) {
  desktopSidebarWidth.value = event.detail.width
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
interface ResourceOrigin {
  id: string
  kind: 'local' | 'link'
  label: string
  status: 'normal' | 'broken'
  path?: string
  url?: string
}

interface Resource {
  id: string
  name: string
  ext?: string
  sourceType: 'local' | 'link'
  resourceType: 'image' | 'video' | 'audio' | 'document' | 'web' | 'json' | 'folder'
  tags?: string[]
  origins?: ResourceOrigin[]
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
    origins: [
      {
        id: '12-local',
        kind: 'local',
        label: '文件系统',
        status: 'normal',
        path: '/Users/me/Projects/multi-tag-resource.json'
      },
      {
        id: '12-remote',
        kind: 'link',
        label: '远程链接',
        status: 'normal',
        url: 'https://example.com/multi-tag-resource.json'
      }
    ],
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
const detailDrawerRef = ref<WebUiDrawer>()
const previewDrawerRef = ref<WebUiDrawer>()
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

async function syncDrawerSheetHeight(drawer: WebUiDrawer | undefined) {
  if (!drawer) return
  await drawer.updateComplete
  const dialog = drawer.shadowRoot?.querySelector('dialog')
  if (!dialog) return
  dialog.style.height = isMobile.value && drawer.placement === 'bottom' ? '80vh' : ''
}

watch([isMobile, drawerOpen, previewDrawerOpen], () => {
  void nextTick(() => {
    void syncDrawerSheetHeight(detailDrawerRef.value)
    void syncDrawerSheetHeight(previewDrawerRef.value)
  })
})

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

function getOriginValue(origin: ResourceOrigin) {
  return origin.kind === 'local' ? origin.path : origin.url
}

function getOriginIcon(origin: ResourceOrigin) {
  return origin.kind === 'local' ? lucideFile : lucideLink
}

const metadataRowClass =
  "relative flex min-w-0 items-center justify-between gap-4 px-4 py-3 after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-black/[0.06] after:content-[''] last:after:hidden dark:after:bg-white/[0.08]"
const metadataLabelClass = 'shrink-0 text-[13px] leading-5 text-[#8a8a94] dark:text-[var(--wui-color-text-secondary)]'
const metadataValueClass =
  'min-w-0 truncate text-right text-[13px] font-medium leading-5 text-[#22212a] dark:text-[var(--wui-color-text)]'

const selectedOrigins = computed<Array<ResourceOrigin>>(() => {
  const resource = selectedResource.value
  if (!resource) return []
  if (resource.origins?.length) return resource.origins
  return [
    {
      id: `${resource.id}-primary`,
      kind: resource.sourceType,
      label: resource.sourceType === 'local' ? '文件系统' : '远程链接',
      status: resource.broken ? 'broken' : 'normal',
      path: resource.path,
      url: resource.url
    }
  ]
})

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
const queueRenameInputRef = ref<WebUiInput | null>(null)
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

function openAddDialog() {
  addDialogOpen.value = true
  addDragActive.value = false
  addPasteCaptured.value = false
  queueRenamingId.value = null
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

function removeAddQueue(item: (typeof addQueue)[number]) {
  requestRemovalConfirmation({
    title: '移除待添加项',
    message: `移除「${item.name}」后不会加入资料库。`,
    confirmLabel: '移除',
    action: () => {
      const index = addQueue.findIndex(entry => entry.id === item.id)
      if (index === -1) return

      addQueue.splice(index, 1)
      queueRenamingId.value = null
      queueNameDraft.value = ''
    }
  })
}

// --- Edit tags dialog ---
type EditTagsTarget = Resource | (typeof addQueue)[number]
const editTagsDialogOpen = ref(false)
const editTagsTarget = ref<EditTagsTarget | null>(null)
const editTagsDraftTags = ref<string[]>([])
const editTagsDraft = ref('')
const editTagsAutocompleteRef = ref<WebUiAutocomplete | null>(null)

const editTagsOptions = computed(() =>
  [...new Set(allTags)].filter(tag => !editTagsDraftTags.value.includes(tag)).sort()
)

function setEditTagsAutocompleteRef(el: Element | ComponentPublicInstance | null) {
  editTagsAutocompleteRef.value = el instanceof Element ? (el as WebUiAutocomplete) : null
}

function openEditTagsDialog(target: EditTagsTarget) {
  if (!target.tags) target.tags = []
  editTagsTarget.value = target
  editTagsDraftTags.value = [...target.tags]
  editTagsDraft.value = ''
  editTagsDialogOpen.value = true
  void nextTick(() => {
    const input = editTagsAutocompleteRef.value?.shadowRoot?.querySelector<HTMLInputElement>('.autocomplete-input')
    input?.focus()
    input?.click()
  })
}

function closeEditTagsDialog() {
  editTagsDialogOpen.value = false
  // 关闭动画期间不清空 draft/target：若此刻清空 editTagsDraftTags，标签块
  // （v-if="editTagsDraftTags.length"）会在退场动画的第一帧卸载，对话框内容高度
  // 骤降 ~50px，造成关闭时的高度跳变（#124）。这些状态在下次 openEditTagsDialog()
  // 打开时统一重置，关闭期间保留不产生可见影响。
}

function handleEditTagsDialogOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  if (!event.detail.open) closeEditTagsDialog()
}

function addEditTagFromField(field?: WebUiAutocomplete | null) {
  const tag = (field?.value ?? editTagsDraft.value).trim()
  if (tag && !editTagsDraftTags.value.includes(tag)) editTagsDraftTags.value.push(tag)
  if (field) field.value = ''
  editTagsDraft.value = ''
}

function handleEditTagsInput(event: WebUiEvent<WebUiAutocomplete, 'input'>) {
  editTagsDraft.value = event.target.value
}

function handleEditTagsChange(event: WebUiEvent<WebUiAutocomplete, 'change'>) {
  addEditTagFromField(event.target)
}

function removeEditTag(index: number) {
  const tag = editTagsDraftTags.value[index]
  if (!tag) return

  requestRemovalConfirmation({
    title: '移除标签',
    message: `移除「${tag}」后需重新添加。`,
    confirmLabel: '移除',
    action: () => {
      const currentIndex = editTagsDraftTags.value.indexOf(tag)
      if (currentIndex !== -1) editTagsDraftTags.value.splice(currentIndex, 1)
    }
  })
}

// --- Removal confirmation ---
interface PendingRemoval {
  title: string
  message: string
  confirmLabel: string
  action: () => void
}

const removalConfirmOpen = ref(false)
const pendingRemoval = ref<PendingRemoval | null>(null)

function requestRemovalConfirmation(pending: PendingRemoval) {
  pendingRemoval.value = pending
  removalConfirmOpen.value = true
}

function handleRemovalConfirm() {
  pendingRemoval.value?.action()
  removalConfirmOpen.value = false
}

function handleRemovalCancel() {
  removalConfirmOpen.value = false
}

function confirmEditTags() {
  const target = editTagsTarget.value
  if (target) target.tags = [...editTagsDraftTags.value]
  closeEditTagsDialog()
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
    <div slot="sidebar" class="relative z-20 h-full pt-14 pb-4 px-2 max-[640px]:px-0" aria-label="应用导航">
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
            <web-ui-svg-draw-lines
              :ref="element => setNavDrawRef('library', element)"
              :duration="720"
              easing="ease-out"
            >
              <web-ui-icon :icon="lucideFolderOpen"></web-ui-icon>
            </web-ui-svg-draw-lines>
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
            <web-ui-svg-draw-lines :ref="element => setNavDrawRef('map', element)" :duration="720" easing="ease-out">
              <web-ui-icon :icon="lucideLayoutGrid"></web-ui-icon>
            </web-ui-svg-draw-lines>
          </web-ui-tooltip>
          <span v-if="!sidebarCollapsed" class="text-sm whitespace-nowrap overflow-hidden">关系图谱</span>
        </button>
      </nav>
    </div>

    <!-- Header -->
    <header slot="header" class="w-full">
      <div class="flex gap-4 items-center px-6 py-2 max-[640px]:px-3 max-[640px]:pl-0">
        <!-- 窄屏时布局组件的展开 Toggle 自带左缩进（--wui-layout-mobile-toggle-inset，8px），header 内容去掉左内边距避免双重缩进。 -->
        <web-ui-button-group aria-label="页面导航" class="max-[640px]:hidden">
          <web-ui-button icon variant="glass" aria-label="后退" :disabled="!canGoBack" @click="router.back()">
            <web-ui-icon :icon="lucideChevronLeft"></web-ui-icon>
          </web-ui-button>
          <web-ui-button icon variant="glass" aria-label="前进" :disabled="!canGoForward" @click="router.forward()">
            <web-ui-icon :icon="lucideChevronRight"></web-ui-icon>
          </web-ui-button>
        </web-ui-button-group>
        <div class="flex gap-1.5 items-center ml-auto">
          <web-ui-tooltip v-if="!(searchOpen && isMobile)" content="添加资源" portal>
            <web-ui-button icon variant="primary" aria-label="添加资源" @click="openAddDialog">
              <web-ui-icon :icon="lucidePlus"></web-ui-icon>
            </web-ui-button>
          </web-ui-tooltip>
          <web-ui-tooltip v-if="!(searchOpen && isMobile)" content="筛选和排序" portal>
            <web-ui-button
              icon
              :variant="hasActiveFilter ? 'secondary' : 'glass'"
              aria-label="筛选和排序"
              @click="filterOpen = !filterOpen"
            >
              <web-ui-icon :icon="filterOpen ? lucideChevronUp : lucideListFilter"></web-ui-icon>
            </web-ui-button>
          </web-ui-tooltip>
          <web-ui-tooltip v-if="!searchOpen" content="搜索" portal>
            <web-ui-button icon aria-label="搜索" @click="openSearch">
              <web-ui-icon :icon="lucideSearch"></web-ui-icon>
            </web-ui-button>
          </web-ui-tooltip>
          <web-ui-input
            v-else
            ref="searchInputRef"
            :value="searchQuery"
            clearable
            placeholder="搜索资源"
            aria-label="搜索资源"
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
        <!-- 移动端负 margin 补偿 toggle 按钮宽度，使筛选内容左边缘与 header slot 内容对齐。 -->
        <div
          class="flex flex-wrap gap-3 items-center px-6 max-[640px]:px-3 max-[640px]:-ml-[56px] py-2.5 text-sm text-[#5b5b66] dark:text-[var(--wui-color-text-secondary)]"
        >
          <label :class="filterLabelClass">
            <web-ui-select
              portal
              :value="filterSource"
              class="[--wui-input-width:128px]"
              @change="handleFilterSourceChange"
            >
              <web-ui-option value="all" label="全部来源">全部来源</web-ui-option>
              <web-ui-option value="local" label="本地文件">本地文件</web-ui-option>
              <web-ui-option value="link" label="链接">链接</web-ui-option>
            </web-ui-select>
          </label>
          <label :class="filterLabelClass">
            <web-ui-select
              portal
              :value="filterType"
              class="[--wui-input-width:128px]"
              @change="handleFilterTypeChange"
            >
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
            <web-ui-select
              portal
              :value="filterBroken"
              class="[--wui-input-width:128px]"
              @change="handleFilterBrokenChange"
            >
              <web-ui-option value="all" label="可用性">可用性</web-ui-option>
              <web-ui-option value="valid" label="正常">正常</web-ui-option>
              <web-ui-option value="broken" label="已失效">已失效</web-ui-option>
            </web-ui-select>
          </label>
          <label :class="filterLabelClass">
            <web-ui-autocomplete
              portal
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
              portal
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
              <web-ui-option value="latest" label="最新">最近修改</web-ui-option>
              <web-ui-option value="earliest" label="最早">较早修改</web-ui-option>
            </web-ui-select>
          </label>
          <web-ui-button v-if="hasActiveFilter" variant="ghost" @click="resetFilters"
            ><web-ui-icon slot="prefix" :icon="lucideListRestart"></web-ui-icon>重置筛选</web-ui-button
          >
        </div>
      </div>
    </header>

    <!-- Resource list + Detail drawer -->
    <div class="flex min-h-0 flex-1">
      <div class="flex-1 min-w-0 px-6 max-[640px]:px-3 pb-16 pt-2">
        <web-ui-context-menu ref="ctxMenuRef" class="block w-full">
          <!-- Empty state -->
          <div v-if="filteredResources.length === 0" class="flex flex-col items-center justify-center py-24">
            <web-ui-empty size="large" description="没有符合条件的资源"></web-ui-empty>
          </div>

          <!-- Resource rows -->
          <div v-else class="w-full h-full">
            <div
              v-for="resource in filteredResources"
              :key="resource.id"
              class="group relative flex items-center gap-3 px-4 max-[640px]:px-2 py-3 cursor-pointer transition-colors duration-100 rounded-xl"
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
                  class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#9a9aa4] dark:text-[var(--wui-color-text-secondary)]"
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
            @click="contextResource && openEditTagsDialog(contextResource)"
          >
            <web-ui-icon
              slot="prefix"
              :size="14"
              :icon="lucideTags"
              class="text-[var(--wui-color-accent,#08f)]"
            ></web-ui-icon>
            编辑标签
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider v-if="contextResource && !contextResource.broken"></web-ui-dropdown-divider>
          <web-ui-dropdown-item
            style="color: var(--wui-color-danger, #ef4444)"
            @click="contextResource && confirmDeleteResource(contextResource)"
          >
            <web-ui-icon
              slot="prefix"
              :size="14"
              :icon="lucideTrash2"
              class="text-[var(--wui-color-danger,#ef4444)]"
            ></web-ui-icon>
            删除
          </web-ui-dropdown-item>
        </web-ui-context-menu>
      </div>

      <!-- Detail Drawer -->
      <web-ui-drawer
        ref="detailDrawerRef"
        :open="drawerOpen"
        :placement="isMobile ? 'bottom' : 'right'"
        draggable
        controlled
        class="max-[640px]:[--wui-drawer-height:80vh] max-[640px]:[--wui-drawer-inset:0px] max-[640px]:[--wui-drawer-radius:28px_28px_0_0] [--wui-drawer-width:min(640px,max(60vw,320px))]"
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
            <web-ui-button
              v-if="!selectedResource.broken"
              class="[--wui-button-color:var(--wui-color-accent,#08f)]"
              @click="openPreviewDrawer"
            >
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
            <web-ui-button v-if="selectedResource.broken">恢复资源</web-ui-button>
            <web-ui-button
              class="[--wui-button-color:var(--wui-color-danger,#ef4444)]"
              @click="selectedResource && confirmDeleteResource(selectedResource)"
              >删除</web-ui-button
            >
          </web-ui-button-group>

          <!-- Tags -->
          <div v-if="selectedResource" class="flex flex-wrap items-center gap-1.5">
            <span
              v-for="tag in selectedResource.tags"
              :key="tag"
              class="inline-block px-2 py-0.5 rounded-full text-xs leading-tight whitespace-nowrap"
              :class="getTagClass(tag)"
              >{{ tag }}</span
            >
            <web-ui-tooltip content="编辑标签" placement="top">
              <web-ui-button
                class="[--wui-button-color:var(--wui-color-accent,#08f)]"
                icon
                variant="ghost"
                size="20"
                aria-label="编辑标签"
                @click="selectedResource && openEditTagsDialog(selectedResource)"
              >
                <web-ui-icon :icon="lucideTags" :size="12"></web-ui-icon>
              </web-ui-button>
            </web-ui-tooltip>
          </div>

          <!-- Metadata -->
          <div
            v-if="selectedResource"
            class="mt-2 overflow-hidden rounded-3xl bg-white shadow-[0_0_0_0.5px_rgb(0_0_0/0.08),0_1px_3px_rgb(0_0_0/0.06)] dark:bg-[var(--wui-color-surface-raised)] dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.12)]"
          >
            <div v-for="origin in selectedOrigins" :key="origin.id" :class="metadataRowClass" class="items-start">
              <span class="flex min-w-0 flex-[1_1_auto] items-start gap-2.5">
                <web-ui-icon
                  class="mt-0.5 shrink-0 text-[#8a8a94] dark:text-[var(--wui-color-text-secondary)]"
                  :icon="getOriginIcon(origin)"
                  :size="15"
                ></web-ui-icon>
                <span class="grid min-w-0 flex-[1_1_auto] gap-0.5">
                  <span class="text-[13px] font-medium leading-5 text-[#22212a] dark:text-[var(--wui-color-text)]">{{
                    origin.label
                  }}</span>
                  <span
                    v-if="getOriginValue(origin)"
                    class="block min-w-0 truncate text-xs leading-5"
                    :class="
                      origin.kind === 'link'
                        ? 'text-[var(--wui-color-accent,#08f)]'
                        : 'text-[#78716c] dark:text-[#a8a29e]'
                    "
                    :title="getOriginValue(origin)"
                    >{{ getOriginValue(origin) }}</span
                  >
                </span>
              </span>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-xs leading-none"
                :class="
                  origin.status === 'broken'
                    ? 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200'
                "
                >{{ origin.status === 'broken' ? '已失效' : '正常' }}</span
              >
            </div>
            <div :class="metadataRowClass">
              <span :class="metadataLabelClass">类型</span>
              <span :class="metadataValueClass">{{ resourceTypeLabels[selectedResource.resourceType] }}</span>
            </div>
            <div v-if="selectedResource.size" :class="metadataRowClass">
              <span :class="metadataLabelClass">大小</span>
              <span :class="[metadataValueClass, 'tabular-nums']">{{ selectedResource.size }}</span>
            </div>
            <div :class="metadataRowClass">
              <span :class="metadataLabelClass">状态</span>
              <span
                :class="
                  selectedResource.broken
                    ? 'text-right text-[13px] font-medium leading-5 text-[#ef4444] dark:text-[var(--wui-color-danger)]'
                    : metadataValueClass
                "
                >{{ selectedResource.broken ? '已失效' : '正常' }}</span
              >
            </div>
            <div v-if="selectedResource.createdAt" :class="metadataRowClass">
              <span :class="metadataLabelClass">创建于</span>
              <span :class="[metadataValueClass, 'tabular-nums']">{{ selectedResource.createdAt }}</span>
            </div>
            <div v-if="selectedResource.modifiedAt" :class="metadataRowClass">
              <span :class="metadataLabelClass">修改于</span>
              <span :class="[metadataValueClass, 'tabular-nums']">{{ selectedResource.modifiedAt }}</span>
            </div>
          </div>
        </div>
      </web-ui-drawer>

      <!-- Standalone Preview Drawer (opened from context menu and detail drawer's "预览" button) -->
      <web-ui-drawer
        ref="previewDrawerRef"
        :open="previewDrawerOpen"
        :placement="isMobile ? 'bottom' : 'right'"
        draggable
        controlled
        class="max-[640px]:[--wui-drawer-height:80vh] max-[640px]:[--wui-drawer-inset:0px] max-[640px]:[--wui-drawer-radius:28px_28px_0_0] [--wui-drawer-width:max(60vw,320px)]"
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
      <div slot="title">删除资源</div>
      <template v-if="deleteTargetResource">
        <p class="m-0 text-[14px] text-[#5b5b66] dark:text-[var(--wui-color-text-secondary)]">
          删除「<span class="font-medium text-[#22212a] dark:text-[var(--wui-color-text)]">{{
            deleteTargetResource.name
          }}</span
          >」后无法恢复。
        </p>
      </template>
      <div slot="footer" class="flex gap-3">
        <web-ui-button full variant="secondary" @click="handleDeleteCancel">取消</web-ui-button>
        <web-ui-button full variant="danger" @click="handleDeleteConfirm">删除</web-ui-button>
      </div>
    </web-ui-dialog>

    <!-- Removal confirmation dialog -->
    <web-ui-dialog
      :open="removalConfirmOpen"
      controlled
      no-backdrop-close
      class="max-[640px]:[--wui-dialog-width:90vw] [--wui-dialog-width:320px]"
      @open-change="handleRemovalCancel"
    >
      <div slot="title">{{ pendingRemoval?.title }}</div>
      <p class="m-0 text-[14px] text-[#5b5b66] dark:text-[var(--wui-color-text-secondary)]">
        {{ pendingRemoval?.message }}
      </p>
      <div slot="footer" class="flex gap-3">
        <web-ui-button full variant="secondary" @click="handleRemovalCancel">取消</web-ui-button>
        <web-ui-button full variant="danger" @click="handleRemovalConfirm">
          {{ pendingRemoval?.confirmLabel }}
        </web-ui-button>
      </div>
    </web-ui-dialog>

    <!-- Add dialog (prototype only) -->
    <web-ui-dialog
      :open="addDialogOpen"
      controlled
      no-backdrop-close
      horizontal
      :style="{ '--wui-dialog-footer-justify': isMobile ? undefined : 'flex-end' }"
      class="[--wui-dialog-width:min(90vw,880px)] [--wui-dialog-max-height:min(90vh,640px)]"
      @open-change="handleAddDialogOpenChange"
    >
      <span slot="title">添加资源</span>

      <p
        v-if="addPasteCaptured"
        class="mb-3 flex w-fit items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--wui-color-accent,#08f)_8%,transparent)] px-2.5 py-1.5 text-xs text-[var(--wui-color-accent,#08f)]"
        role="status"
      >
        <web-ui-icon :icon="lucideClipboardPaste" :size="16"></web-ui-icon>
        已读取剪贴板内容
      </p>

      <main
        class="grid min-h-0 grid-cols-2 gap-5 max-[640px]:gap-4 max-[900px]:grid-cols-1 max-[900px]:grid-rows-2"
        style="height: min(calc(90vh - 108px), calc(var(--wui-dialog-max-height, 640px) - 108px))"
      >
        <section class="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5 overflow-hidden">
          <p
            class="m-0 min-w-0 truncate text-[13px] leading-6 text-[#6a6a6a] dark:text-[var(--wui-color-text-secondary)]"
          >
            选择本地文件，或将其拖入上传区；也可以直接粘贴内容。
          </p>
          <label
            class="grid h-full cursor-pointer place-content-center justify-items-center gap-3 rounded-3xl bg-[#f0f0f4] px-6 py-7 transition-[background-color] duration-[160ms] hover:bg-[#e9e9ee] dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_4%,transparent)] dark:hover:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_7%,transparent)] max-[640px]:gap-2 max-[640px]:px-4 max-[640px]:py-2 max-[900px]:p-5"
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
              >拖入文件，或点按选择</span
            >
            <span
              class="text-xs leading-[1.4] text-[#6a6a6a] dark:text-[var(--wui-color-text-secondary)] max-[640px]:text-[11px]"
              >支持图片、文档、音频和视频，可一次添加多项</span
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
              将添加
            </h3>
            <span
              class="rounded-full bg-black/[0.04] px-2 py-1 text-xs leading-none text-[#6a6a6a] dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_6%,transparent)] dark:text-[var(--wui-color-text-secondary)]"
              >{{ addQueue.length }} 项</span
            >
          </div>
          <ol
            class="m-0 h-full min-h-0 list-none overflow-y-auto rounded-3xl bg-white p-0 [scrollbar-gutter:auto] [scrollbar-width:auto] dark:bg-[var(--wui-color-surface-raised)]"
          >
            <li
              v-for="(item, itemIndex) in addQueue"
              :key="item.id"
              :class="metadataRowClass"
              class="items-start transition-colors duration-100 hover:bg-black/[0.03] dark:hover:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_5%,transparent)]"
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
                        aria-label="从添加列表中移除"
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
                  <div class="flex min-w-0 flex-[0_0_100%] flex-wrap items-center gap-[5px]">
                    <span
                      v-for="tag in item.tags"
                      :key="tag"
                      class="inline-block px-2 py-0.5 rounded-full text-xs leading-tight whitespace-nowrap"
                      :class="getTagClass(tag)"
                      >{{ tag }}</span
                    >
                    <web-ui-tooltip content="编辑标签" :placement="itemIndex < 5 ? 'bottom' : 'top'">
                      <web-ui-button
                        class="shrink-0 [--wui-button-color:var(--wui-color-accent,#08f)]"
                        icon
                        variant="ghost"
                        size="20"
                        aria-label="编辑标签"
                        @click="openEditTagsDialog(item)"
                      >
                        <web-ui-icon :icon="lucideTags" :size="12"></web-ui-icon>
                      </web-ui-button>
                    </web-ui-tooltip>
                  </div>
                </div>
              </span>
            </li>
          </ol>
        </aside>
      </main>

      <web-ui-button slot="footer" :full="isMobile" variant="secondary" @click="addDialogOpen = false"
        >取消</web-ui-button
      >
      <web-ui-button slot="footer" :full="isMobile" variant="primary" @click="addDialogOpen = false">
        <web-ui-icon slot="prefix" :icon="lucidePlus" :size="16"></web-ui-icon>
        {{ addQueue.length > 1 ? '批量添加' : '添加' }}
      </web-ui-button>
    </web-ui-dialog>

    <!-- Edit tags dialog -->
    <web-ui-dialog
      :open="editTagsDialogOpen"
      controlled
      no-backdrop-close
      class="max-[640px]:[--wui-dialog-desc-gap:22px] max-[640px]:[--wui-dialog-footer-gap:12px] max-[640px]:[--wui-dialog-padding:22px_20px_20px] max-[640px]:[--wui-dialog-title-gap:18px] max-[640px]:[--wui-dialog-width:90vw] [--wui-dialog-width:320px]"
      @open-change="handleEditTagsDialogOpenChange"
    >
      <span slot="title">编辑标签</span>
      <div class="grid gap-4">
        <div class="grid gap-1.5">
          <span class="text-xs font-medium text-[#6a6a6a] dark:text-[var(--wui-color-text-secondary)]">添加标签</span>
          <web-ui-autocomplete
            :ref="setEditTagsAutocompleteRef"
            :value="editTagsDraft"
            class="block w-full min-w-0 [--wui-autocomplete-max-width:100%] [--wui-input-width:100%]"
            allow-custom-value
            portal
            placeholder="输入或选择标签"
            aria-label="添加标签"
            @input="handleEditTagsInput"
            @change="handleEditTagsChange"
          >
            <web-ui-option v-for="tag in editTagsOptions" :key="tag" :value="tag" :label="tag">{{ tag }}</web-ui-option>
            <div slot="empty">
              {{
                editTagsDraftTags.includes(editTagsDraft.trim())
                  ? '标签已存在'
                  : `未找到「${editTagsDraft}」，按 Enter 键新建`
              }}
            </div>
          </web-ui-autocomplete>
        </div>
        <div class="grid gap-2">
          <span class="text-xs font-medium text-[#6a6a6a] dark:text-[var(--wui-color-text-secondary)]">当前标签</span>
          <div
            v-if="editTagsDraftTags.length"
            class="flex min-h-[66px] flex-wrap items-center gap-1.5 rounded-2xl bg-black/[0.03] p-2.5 dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_4%,transparent)]"
          >
            <span
              v-for="(tag, tagIndex) in editTagsDraftTags"
              :key="tag"
              class="inline-flex h-5 items-center gap-0.5 rounded-full px-[7px] py-1 text-xs leading-none has-[web-ui-button]:pr-0.5"
              :class="getTagClass(tag)"
            >
              {{ tag }}
              <web-ui-button
                class="shrink-0 [--wui-button-color:currentColor]"
                icon
                variant="ghost"
                size="16"
                :aria-label="`移除标签 ${tag}`"
                @click="removeEditTag(tagIndex)"
              >
                <web-ui-icon :icon="lucideX" :size="10"></web-ui-icon>
              </web-ui-button>
            </span>
          </div>
          <div
            v-else
            class="flex items-center gap-2 rounded-2xl border border-dashed border-black/10 px-3 py-3 text-xs text-[#9a9aa4] dark:border-white/10 dark:text-[var(--wui-color-text-tertiary)]"
          >
            <web-ui-icon :icon="lucideTags" :size="14"></web-ui-icon>
            暂无标签
          </div>
        </div>
      </div>
      <div slot="footer" class="grid gap-2">
        <web-ui-button full variant="primary" @click="confirmEditTags">确认</web-ui-button>
        <web-ui-button full variant="secondary" @click="closeEditTagsDialog">取消</web-ui-button>
      </div>
    </web-ui-dialog>
    <web-ui-back-top></web-ui-back-top>
  </web-ui-layout>
</template>
