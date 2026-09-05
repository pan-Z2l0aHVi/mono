<script setup lang="ts">
import type { WebUiAutocomplete, WebUiDrawer, WebUiEvent, WebUiInput, WebUiLayout, WebUiSelect } from '@greypan/web-ui'
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
  lucideTrash2,
  lucideTriangleAlert,
  lucideCode,
  heroiconsBarsArrowDown16Solid,
  heroiconsBarsArrowUp16Solid,
  lucideListRestart,
  tablerSortAscendingLetters
} from '@greypan/web-ui/icons'
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'

import { canGoBack, canGoForward } from '@/composables/useHistoryNav'

// --- Navigation ---
const router = useRouter()
const activeNav = ref<'library' | 'map'>('library')
const navItemClass =
  'nav-item flex items-center gap-2.5 w-full min-w-10 min-h-10 px-2.5 border-0 rounded-full font-medium cursor-pointer text-[#5b5b66] transition-all duration-150 active:bg-[rgb(34_33_42/0.12)] text-left dark:text-[var(--wui-color-text)] dark:active:bg-white/15'
function selectNav(next: 'library' | 'map') {
  activeNav.value = next
}

// --- Sidebar toggle ---
const sidebarCollapsed = ref(false)
const sidebarOpen = ref(false)
function updateSidebarCollapsed(event: WebUiEvent<WebUiLayout, 'sidebar-collapsed-change'>) {
  sidebarCollapsed.value = event.detail.collapsed
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

const resources: Resource[] = [
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
]

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
function handleTagChange(e: WebUiEvent<WebUiAutocomplete, 'change'>) {
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
</script>

<template>
  <web-ui-layout
    header-glow
    class="min-h-dvh overflow-x-clip text-[#22212a] bg-white dark:text-[var(--wui-color-text)] dark:bg-[var(--wui-color-page)]"
    :sidebarCollapsed="sidebarCollapsed"
    :sidebarOpen="sidebarOpen"
    @sidebar-collapsed-change="updateSidebarCollapsed"
    @sidebar-open-change="updateSidebarOpen"
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
            <web-ui-button icon variant="primary" aria-label="新建">
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
              @change="handleTagChange"
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

              <!-- Tags (secondary, md+) -->
              <div
                v-if="resource.tags && resource.tags.length"
                class="hidden md:flex gap-1.5 flex-wrap justify-end max-w-[25%]"
              >
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
          <web-ui-dropdown-item v-if="contextResource && !contextResource.broken">
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
          <web-ui-dropdown-item v-if="contextResource?.broken">
            <web-ui-icon slot="prefix" :size="14" :icon="lucideRefreshCw"></web-ui-icon>
            找回资源
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider></web-ui-dropdown-divider>
          <web-ui-dropdown-item style="color: var(--wui-color-danger, #ef4444)">
            <web-ui-icon slot="prefix" :size="14" :icon="lucideTrash2"></web-ui-icon>
            删除
          </web-ui-dropdown-item>
        </web-ui-context-menu>
      </div>

      <!-- Detail Drawer -->
      <web-ui-drawer
        :open="drawerOpen"
        placement="right"
        :closable="false"
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
          <h2 v-if="selectedResource" class="flex items-center gap-3 m-0">
            <web-ui-icon
              :icon="getResourceIcon(selectedResource)"
              :size="22"
              class="shrink-0 text-[#5b5b66] dark:text-[var(--wui-color-text-secondary)]"
            ></web-ui-icon>
            <span
              class="font-semibold text-[17px] leading-snug text-[#22212a] break-words min-w-0 dark:text-[var(--wui-color-text)]"
            >
              {{ selectedResource.name }}
            </span>
          </h2>

          <!-- Quick actions -->
          <web-ui-button-group v-if="selectedResource" class="self-start">
            <web-ui-button v-if="!selectedResource.broken" @click="openPreviewDrawer">
              <web-ui-icon slot="prefix" :size="14" :icon="lucideEye"></web-ui-icon>
              预览
            </web-ui-button>
            <web-ui-button v-if="!selectedResource.broken">打开方式</web-ui-button>
            <web-ui-button v-if="selectedResource.broken">找回资源</web-ui-button>
            <web-ui-button style="--wui-button-color: var(--wui-color-danger, #ef4444)">删除</web-ui-button>
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

          <!-- Preview nested drawer -->
          <web-ui-drawer
            :open="previewDrawerOpen"
            closable
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
    </div>
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
