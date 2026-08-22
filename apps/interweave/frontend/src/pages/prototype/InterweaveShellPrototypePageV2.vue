<script setup lang="ts">
import type { WebUiEvent, WebUiLayout, WebUiSelect } from '@greypan/web-ui'
import type { WebUiContextMenu } from '@greypan/web-ui/components/context-menu'
import {
  lucideChevronLeft,
  lucideChevronRight,
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
  lucideSlidersHorizontal,
  lucideTrash2,
  lucideTriangleAlert
} from '@greypan/web-ui/icons'
import { computed, ref } from 'vue'

// --- Navigation ---
const activeNav = ref<'library' | 'map'>('library')
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
  设计: 'bg-blue-50 text-blue-600',
  开发: 'bg-emerald-50 text-emerald-600',
  素材: 'bg-purple-50 text-purple-600',
  灵感: 'bg-amber-50 text-amber-600',
  参考: 'bg-pink-50 text-pink-600',
  工具: 'bg-cyan-50 text-cyan-600',
  归档: 'bg-gray-100 text-gray-500'
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
    createdAt: '2025-01-10',
    modifiedAt: '2025-01-10'
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
    modifiedAt: '2024-12-01',
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
  }
]

// --- Selection & Drawer ---
const selectedId = ref<string | null>(null)
const drawerOpen = ref(false)
const selectedResource = computed(() => resources.find(r => r.id === selectedId.value) ?? null)
function selectResource(id: string) {
  selectedId.value = id
  drawerOpen.value = true
}

// --- Icon mapping ---
const resourceTypeIcons: Record<Resource['resourceType'], typeof lucideFile> = {
  image: lucideImage,
  video: lucideFilm,
  audio: lucideMusic,
  document: lucideFileText,
  web: lucideGlobe,
  json: lucideFile,
  folder: lucideFolderOpen
}
function getResourceIcon(resource: Resource) {
  return resourceTypeIcons[resource.resourceType]
}
function getSourceIcon(resource: Resource) {
  return resource.sourceType === 'link' ? lucideLink : lucideFile
}

// --- Filter state ---
const filterSource = ref('all')
const filterType = ref('all')
const filterBroken = ref('all')
const filterOpen = ref(false)
const filteredResources = computed(() => {
  return resources.filter(r => {
    if (filterSource.value !== 'all' && r.sourceType !== filterSource.value) return false
    if (filterType.value !== 'all' && r.resourceType !== filterType.value) return false
    if (filterBroken.value === 'valid' && r.broken) return false
    if (filterBroken.value === 'broken' && !r.broken) return false
    return true
  })
})
const hasActiveFilter = computed(
  () => filterSource.value !== 'all' || filterType.value !== 'all' || filterBroken.value !== 'all'
)
function resetFilters() {
  filterSource.value = 'all'
  filterType.value = 'all'
  filterBroken.value = 'all'
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
    class="min-h-dvh color-[#22212a] bg-white"
    :sidebar-collapsed="sidebarCollapsed"
    :sidebar-open="sidebarOpen"
    @sidebar-collapsed-change="updateSidebarCollapsed"
    @sidebar-open-change="updateSidebarOpen"
  >
    <!-- Sidebar -->
    <div slot="sidebar" class="relative z-20 h-full py-4 px-2" aria-label="应用导航">
      <nav class="grid gap-1 mt-4" aria-label="主导航">
        <button
          class="nav-item flex items-center gap-2.5 w-full min-w-10 min-h-10 px-2.5 border-0 rounded-full font-medium cursor-pointer text-[#5b5b66] transition-all duration-150 active:bg-[rgb(34_33_42/0.12)] text-left"
          :class="[
            activeNav === 'library' ? 'text-[var(--wui-color-accent,#08f)] bg-[#DFDFDF]' : 'hover:bg-black/[0.04]',
            sidebarCollapsed ? 'justify-center' : ''
          ]"
          type="button"
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
          class="nav-item flex items-center gap-2.5 w-full min-w-10 min-h-10 px-2.5 border-0 rounded-full font-medium cursor-pointer text-[#5b5b66] transition-all duration-150 active:bg-[rgb(34_33_42/0.12)] text-left"
          :class="[
            activeNav === 'map' ? 'text-[var(--wui-color-accent,#08f)] bg-[#DFDFDF]' : 'hover:bg-black/[0.04]',
            sidebarCollapsed ? 'justify-center' : ''
          ]"
          type="button"
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
    <header slot="header" class="flex gap-4 items-center justify-between w-full px-6 py-2">
      <web-ui-button-group aria-label="页面导航">
        <web-ui-button icon variant="glass" aria-label="后退">
          <web-ui-icon :icon="lucideChevronLeft"></web-ui-icon>
        </web-ui-button>
        <web-ui-button icon variant="glass" aria-label="前进">
          <web-ui-icon :icon="lucideChevronRight"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
      <div class="flex gap-1.5 items-center">
        <web-ui-tooltip content="筛选">
          <web-ui-button
            icon
            :variant="hasActiveFilter ? 'secondary' : 'glass'"
            aria-label="筛选"
            @click="filterOpen = !filterOpen"
          >
            <web-ui-icon :icon="lucideSlidersHorizontal"></web-ui-icon>
          </web-ui-button>
        </web-ui-tooltip>
        <web-ui-tooltip content="新建">
          <web-ui-button icon variant="glass" aria-label="新建">
            <web-ui-icon :icon="lucidePlus"></web-ui-icon>
          </web-ui-button>
        </web-ui-tooltip>
        <web-ui-tooltip content="搜索">
          <web-ui-button icon variant="glass" aria-label="搜索">
            <web-ui-icon :icon="lucideSearch"></web-ui-icon>
          </web-ui-button>
        </web-ui-tooltip>
      </div>
    </header>

    <!-- Filter bar (collapsible) -->
    <div
      class="transition-all duration-200 ease-in-out border-b border-black/5"
      :style="{ height: filterOpen ? 'auto' : '0px', overflow: filterOpen ? 'visible' : 'hidden' }"
    >
      <div class="flex gap-3 items-center px-6 py-2.5 text-sm text-[#5b5b66]">
        <label class="flex items-center gap-1.5">
          来源
          <web-ui-select :value="filterSource" @change="handleFilterSourceChange" style="width: 128px">
            <web-ui-option value="all" label="全部">全部</web-ui-option>
            <web-ui-option value="local" label="本地文件">本地文件</web-ui-option>
            <web-ui-option value="link" label="链接">链接</web-ui-option>
          </web-ui-select>
        </label>
        <label class="flex items-center gap-1.5">
          类型
          <web-ui-select :value="filterType" @change="handleFilterTypeChange" style="width: 128px">
            <web-ui-option value="all" label="全部">全部</web-ui-option>
            <web-ui-option value="image" label="图片">图片</web-ui-option>
            <web-ui-option value="video" label="视频">视频</web-ui-option>
            <web-ui-option value="audio" label="音频">音频</web-ui-option>
            <web-ui-option value="document" label="文档">文档</web-ui-option>
            <web-ui-option value="web" label="网页">网页</web-ui-option>
            <web-ui-option value="json" label="源代码">源代码</web-ui-option>
          </web-ui-select>
        </label>
        <label class="flex items-center gap-1.5">
          状态
          <web-ui-select :value="filterBroken" @change="handleFilterBrokenChange" style="width: 128px">
            <web-ui-option value="all" label="全部">全部</web-ui-option>
            <web-ui-option value="valid" label="有效">有效</web-ui-option>
            <web-ui-option value="broken" label="已失效">已失效</web-ui-option>
          </web-ui-select>
        </label>
        <button
          v-if="hasActiveFilter"
          class="ml-1 text-xs text-[var(--wui-color-accent,#08f)] hover:underline cursor-pointer border-0 bg-transparent p-0"
          @click="resetFilters"
        >
          重置
        </button>
      </div>
    </div>

    <!-- Resource list + Detail drawer -->
    <div class="flex min-h-0 flex-1">
      <div class="flex-1 min-w-0 pb-16">
        <web-ui-context-menu ref="ctxMenuRef" class="block w-full">
          <!-- Empty state -->
          <div v-if="filteredResources.length === 0" class="flex flex-col items-center justify-center py-24">
            <web-ui-empty description="没有匹配的资源"></web-ui-empty>
          </div>

          <!-- Resource rows -->
          <div v-else class="w-full h-full px-2 pt-1">
            <div
              v-for="resource in filteredResources"
              :key="resource.id"
              class="resource-row group relative flex items-center gap-3 px-3 py-2 cursor-pointer transition-all duration-100 rounded-xl"
              :class="[
                selectedId === resource.id ? 'bg-black/[0.06]' : 'hover:bg-black/[0.04]',
                resource.broken ? 'opacity-60' : ''
              ]"
              @click="selectResource(resource.id)"
              @contextmenu="onResourceContextmenu(resource, $event)"
            >
              <web-ui-icon :icon="getSourceIcon(resource)" :size="13" class="shrink-0 text-[#a0a0aa]"></web-ui-icon>
              <web-ui-icon :icon="getResourceIcon(resource)" :size="22" class="shrink-0 text-[#5b5b66]"></web-ui-icon>
              <div class="flex flex-col min-w-0 gap-0.5 flex-1">
                <div class="flex items-center gap-1.5">
                  <span
                    class="truncate text-[13px] leading-tight"
                    :class="resource.broken ? 'text-[#b0b0b8] line-through' : 'text-[#22212a]'"
                    >{{ resource.name }}</span
                  >
                  <web-ui-icon
                    v-if="resource.broken"
                    :icon="lucideTriangleAlert"
                    :size="12"
                    class="shrink-0 text-amber-500"
                  ></web-ui-icon>
                </div>
                <div v-if="resource.tags && resource.tags.length > 0" class="flex gap-1 flex-wrap">
                  <span
                    v-for="tag in resource.tags"
                    :key="tag"
                    class="inline-block px-2 py-0.5 rounded-full text-xs leading-tight whitespace-nowrap"
                    :class="tagColors[tag] || 'bg-gray-50 text-gray-500 ring-1 ring-gray-200'"
                    >{{ tag }}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Context menu items -->
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" :size="14" :icon="lucideEye"></web-ui-icon>
            预览
          </web-ui-dropdown-item>
          <web-ui-dropdown-item submenu>
            <web-ui-icon slot="prefix" :size="14" :icon="lucideExternalLink"></web-ui-icon>
            打开方式
            <web-ui-dropdown-item>
              <web-ui-icon slot="prefix" :size="14" :icon="lucideExternalLink"></web-ui-icon>
              系统默认应用
            </web-ui-dropdown-item>
            <web-ui-dropdown-item v-show="contextResource?.resourceType === 'image'">
              <web-ui-icon slot="prefix" :size="14" :icon="lucideEye"></web-ui-icon>
              预览
            </web-ui-dropdown-item>
            <web-ui-dropdown-item v-show="contextResource?.resourceType === 'image'">
              <web-ui-icon slot="prefix" :size="14" :icon="lucideImage"></web-ui-icon>
              看图
            </web-ui-dropdown-item>
            <web-ui-dropdown-item v-show="contextResource?.resourceType === 'video'">
              <web-ui-icon slot="prefix" :size="14" :icon="lucidePlay"></web-ui-icon>
              视频播放器
            </web-ui-dropdown-item>
            <web-ui-dropdown-item v-show="contextResource?.resourceType === 'video'">
              <web-ui-icon slot="prefix" :size="14" :icon="lucideClapperboard"></web-ui-icon>
              iMovie
            </web-ui-dropdown-item>
            <web-ui-dropdown-item v-show="contextResource?.resourceType === 'audio'">
              <web-ui-icon slot="prefix" :size="14" :icon="lucideMusic"></web-ui-icon>
              音乐播放器
            </web-ui-dropdown-item>
            <web-ui-dropdown-item v-show="contextResource?.resourceType === 'audio'">
              <web-ui-icon slot="prefix" :size="14" :icon="lucideHeadphones"></web-ui-icon>
              GarageBand
            </web-ui-dropdown-item>
            <web-ui-dropdown-item v-show="contextResource?.resourceType === 'document'">
              <web-ui-icon slot="prefix" :size="14" :icon="lucideFileText"></web-ui-icon>
              文本编辑
            </web-ui-dropdown-item>
            <web-ui-dropdown-item v-show="contextResource?.resourceType === 'document'">
              <web-ui-icon slot="prefix" :size="14" :icon="lucidePenLine"></web-ui-icon>
              Notion
            </web-ui-dropdown-item>
            <web-ui-dropdown-item v-show="contextResource?.resourceType === 'json'">
              <web-ui-icon slot="prefix" :size="14" :icon="lucideFile"></web-ui-icon>
              VS Code
            </web-ui-dropdown-item>
            <web-ui-dropdown-item v-show="contextResource?.resourceType === 'web'">
              <web-ui-icon slot="prefix" :size="14" :icon="lucideGlobe"></web-ui-icon>
              Safari
            </web-ui-dropdown-item>
            <web-ui-dropdown-item v-show="contextResource?.resourceType === 'web'">
              <web-ui-icon slot="prefix" :size="14" :icon="lucideGlobe"></web-ui-icon>
              Chrome
            </web-ui-dropdown-item>
          </web-ui-dropdown-item>
          <web-ui-dropdown-item v-show="contextResource?.broken">
            <web-ui-icon slot="prefix" :size="14" :icon="lucideRefreshCw"></web-ui-icon>
            找回资源
          </web-ui-dropdown-item>
          <web-ui-dropdown-divider></web-ui-dropdown-divider>
          <web-ui-dropdown-item>
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
        request-only
        style="--wui-drawer-width: 640px; max-width: 60%"
        @open-change="drawerOpen = $event.detail.open"
      >
        <div class="grid gap-5">
          <!-- Preview placeholder -->
          <div
            v-if="selectedResource"
            class="flex items-center justify-center h-36 rounded-xl bg-[#f5f5f7] border border-black/5"
          >
            <web-ui-icon :icon="getResourceIcon(selectedResource)" :size="48" class="text-[#c0c0c8]"></web-ui-icon>
          </div>

          <!-- Title -->
          <div v-if="selectedResource" class="flex items-center gap-2.5">
            <web-ui-icon
              :icon="getResourceIcon(selectedResource)"
              :size="20"
              class="shrink-0 text-[#5b5b66]"
            ></web-ui-icon>
            <span class="font-semibold text-[15px] leading-tight truncate">{{ selectedResource.name }}</span>
          </div>

          <!-- Quick actions -->
          <web-ui-button-group
            v-if="selectedResource"
            class="self-start"
            style="--wui-shadow-glass: 0 2px 16px rgb(0 0 0 / 0.06)"
          >
            <web-ui-button>预览</web-ui-button>
            <web-ui-button>打开方式</web-ui-button>
            <web-ui-button v-show="selectedResource.broken">找回资源</web-ui-button>
            <web-ui-button style="--wui-button-color: #ef4444">删除</web-ui-button>
          </web-ui-button-group>

          <!-- Tags -->
          <div v-if="selectedResource?.tags && selectedResource.tags.length > 0" class="flex gap-1.5 flex-wrap">
            <span
              v-for="tag in selectedResource.tags"
              :key="tag"
              class="inline-block px-2 py-0.5 rounded-full text-xs leading-tight whitespace-nowrap"
              :class="tagColors[tag] || 'bg-gray-50 text-gray-500 ring-1 ring-gray-200'"
              >{{ tag }}</span
            >
          </div>

          <!-- Metadata -->
          <div
            v-if="selectedResource"
            class="meta-table grid gap-0 text-[13px] rounded-xl border border-black/5 overflow-hidden"
          >
            <div class="meta-row flex justify-between px-3.5 py-2.5">
              <span class="text-[#8a8a94]">来源</span>
              <span class="text-[#22212a]">{{ selectedResource.sourceType === 'local' ? '本地文件' : '链接' }}</span>
            </div>
            <div class="meta-row flex justify-between px-3.5 py-2.5 border-t border-black/5">
              <span class="text-[#8a8a94]">类型</span>
              <span class="text-[#22212a]">{{ selectedResource.resourceType }}</span>
            </div>
            <div
              v-if="selectedResource.size"
              class="meta-row flex justify-between px-3.5 py-2.5 border-t border-black/5"
            >
              <span class="text-[#8a8a94]">文件大小</span>
              <span class="text-[#22212a] tabular-nums">{{ selectedResource.size }}</span>
            </div>
            <div class="meta-row flex justify-between px-3.5 py-2.5 border-t border-black/5">
              <span class="text-[#8a8a94]">状态</span>
              <span :class="selectedResource.broken ? 'text-red-500' : 'text-emerald-600'">{{
                selectedResource.broken ? '已失效' : '有效'
              }}</span>
            </div>
            <div
              v-if="selectedResource.createdAt"
              class="meta-row flex justify-between px-3.5 py-2.5 border-t border-black/5"
            >
              <span class="text-[#8a8a94]">创建时间</span>
              <span class="text-[#22212a] tabular-nums">{{ selectedResource.createdAt }}</span>
            </div>
            <div
              v-if="selectedResource.modifiedAt"
              class="meta-row flex justify-between px-3.5 py-2.5 border-t border-black/5"
            >
              <span class="text-[#8a8a94]">修改时间</span>
              <span class="text-[#22212a] tabular-nums">{{ selectedResource.modifiedAt }}</span>
            </div>
            <div
              v-if="selectedResource.path"
              class="meta-row flex justify-between items-start px-3.5 py-2.5 border-t border-black/5"
            >
              <span class="text-[#8a8a94] shrink-0">路径</span>
              <span class="text-[#22212a] text-right truncate ml-4" :title="selectedResource.path">{{
                selectedResource.path
              }}</span>
            </div>
            <div
              v-if="selectedResource.url"
              class="meta-row flex justify-between items-start px-3.5 py-2.5 border-t border-black/5"
            >
              <span class="text-[#8a8a94] shrink-0">URL</span>
              <span
                class="text-[var(--wui-color-accent,#08f)] text-right truncate ml-4"
                :title="selectedResource.url"
                >{{ selectedResource.url }}</span
              >
            </div>
          </div>
        </div>
      </web-ui-drawer>
    </div>
    <web-ui-back-top></web-ui-back-top>
  </web-ui-layout>
</template>

<style scoped>
.meta-table .meta-row:nth-child(odd) {
  background-color: #fafafa;
}

.resource-row + .resource-row::before {
  content: '';

  position: absolute;
  top: 0;
  right: 12px;
  left: 36px;

  height: 1px;

  background: rgb(0 0 0 / 0.05);
}
</style>
