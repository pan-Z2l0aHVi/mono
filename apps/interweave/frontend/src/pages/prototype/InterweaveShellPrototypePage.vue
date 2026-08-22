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
  lucideTrash2
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
  设计: 'bg-blue-100 text-blue-700',
  开发: 'bg-green-100 text-green-700',
  素材: 'bg-purple-100 text-purple-700',
  灵感: 'bg-amber-100 text-amber-700',
  参考: 'bg-pink-100 text-pink-700',
  工具: 'bg-cyan-100 text-cyan-700',
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
}

const resources: Resource[] = [
  { id: '1', name: '图片名称aaa.png', sourceType: 'local', resourceType: 'image', tags: ['素材', '设计'] },
  { id: '2', name: '文件名称11.md', sourceType: 'local', resourceType: 'document', tags: ['开发'] },
  { id: '3', name: '视频xxx.mp4', sourceType: 'local', resourceType: 'video' },
  { id: '4', name: '音频123.mp3', sourceType: 'local', resourceType: 'audio', tags: ['灵感'] },
  { id: '5', name: '文档xyz.word', sourceType: 'local', resourceType: 'document', tags: ['参考', '设计'] },
  {
    id: '6',
    name: '网页url1 title',
    sourceType: 'link',
    resourceType: 'web',
    url: 'https://example.com',
    tags: ['灵感']
  },
  {
    id: '7',
    name: '失效网页url2 title',
    sourceType: 'link',
    resourceType: 'web',
    url: 'https://expired.com',
    broken: true
  },
  { id: '8', name: '文档yyy.json', sourceType: 'local', resourceType: 'json', tags: ['开发', '工具'] },
  { id: '9', name: '失效文件名称22.md', sourceType: 'local', resourceType: 'document', broken: true, tags: ['归档'] },
  { id: '10', name: '音频123.mp3', sourceType: 'local', resourceType: 'audio' }
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
const filteredResources = computed(() => {
  return resources.filter(r => {
    if (filterSource.value !== 'all' && r.sourceType !== filterSource.value) return false
    if (filterType.value !== 'all' && r.resourceType !== filterType.value) return false
    if (filterBroken.value === 'valid' && r.broken) return false
    if (filterBroken.value === 'broken' && !r.broken) return false
    return true
  })
})
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
    :sidebarCollapsed.prop="sidebarCollapsed"
    :sidebarOpen.prop="sidebarOpen"
    @sidebar-collapsed-change="updateSidebarCollapsed"
    @sidebar-open-change="updateSidebarOpen"
  >
    <!-- Sidebar -->
    <div slot="sidebar" class="relative z-20 h-full py-4 px-2" aria-label="应用导航">
      <nav class="grid gap-2" aria-label="主导航">
        <button
          class="flex items-center gap-2 w-full min-w-10 min-h-10 px-2 border-0 rounded-full font-medium cursor-pointer text-[#5b5b66] transition-colors duration-150 active:bg-[rgb(34_33_42/0.12)] text-left"
          :class="[
            activeNav === 'library' ? 'text-[var(--wui-color-accent,#08f)] bg-[#DFDFDF]' : 'bg-transparent',
            sidebarCollapsed ? 'justify-center' : ''
          ]"
          type="button"
          @click="selectNav('library')"
        >
          <web-ui-tooltip
            portal
            placement="right"
            :content="sidebarCollapsed ? '资料库' : ''"
            :disabled.prop="!sidebarCollapsed"
          >
            <web-ui-icon :icon="lucideFolderOpen"></web-ui-icon>
          </web-ui-tooltip>
          <span v-if="!sidebarCollapsed" class="text-sm whitespace-nowrap overflow-hidden">资料库</span>
        </button>
        <button
          class="flex items-center gap-2 w-full min-w-10 min-h-10 px-2 border-0 rounded-full font-medium cursor-pointer text-[#5b5b66] transition-colors duration-150 active:bg-[rgb(34_33_42/0.12)] text-left"
          :class="[
            activeNav === 'map' ? 'text-[var(--wui-color-accent,#08f)] bg-[#DFDFDF]' : 'bg-transparent',
            sidebarCollapsed ? 'justify-center' : ''
          ]"
          type="button"
          @click="selectNav('map')"
        >
          <web-ui-tooltip
            portal
            placement="right"
            :content="sidebarCollapsed ? '关系图谱' : ''"
            :disabled.prop="!sidebarCollapsed"
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
      <div class="flex gap-2 items-center">
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

    <!-- Filter bar -->
    <div class="flex gap-3 items-center px-6 py-2 border-b border-black/5 text-sm text-[#5b5b66]">
      <label class="flex items-center gap-2">
        来源
        <web-ui-select :value="filterSource" @change="handleFilterSourceChange">
          <web-ui-option value="all" label="全部">全部</web-ui-option>
          <web-ui-option value="local" label="本地文件">本地文件</web-ui-option>
          <web-ui-option value="link" label="链接">链接</web-ui-option>
        </web-ui-select>
      </label>
      <label class="flex items-center gap-2">
        类型
        <web-ui-select :value="filterType" @change="handleFilterTypeChange">
          <web-ui-option value="all" label="全部">全部</web-ui-option>
          <web-ui-option value="image" label="图片">图片</web-ui-option>
          <web-ui-option value="video" label="视频">视频</web-ui-option>
          <web-ui-option value="audio" label="音频">音频</web-ui-option>
          <web-ui-option value="document" label="文档">文档</web-ui-option>
          <web-ui-option value="web" label="网页">网页</web-ui-option>
          <web-ui-option value="json" label="源代码">源代码</web-ui-option>
        </web-ui-select>
      </label>
      <label class="flex items-center gap-2">
        状态
        <web-ui-select :value="filterBroken" @change="handleFilterBrokenChange">
          <web-ui-option value="all" label="全部">全部</web-ui-option>
          <web-ui-option value="valid" label="有效">有效</web-ui-option>
          <web-ui-option value="broken" label="已失效">已失效</web-ui-option>
        </web-ui-select>
      </label>
    </div>

    <!-- Resource list + Detail drawer -->
    <div class="flex min-h-0">
      <div class="flex-1 min-w-0 pb-16">
        <web-ui-context-menu ref="ctxMenuRef" class="block w-full">
          <div class="w-full h-full px-2">
            <div
              v-for="resource in filteredResources"
              :key="resource.id"
              class="resource-row relative flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors duration-100 active:bg-black/[0.06] rounded-[12px]"
              :class="{ 'bg-black/[0.05]': selectedId === resource.id, 'opacity-50': resource.broken }"
              @click="selectResource(resource.id)"
              @contextmenu="onResourceContextmenu(resource, $event)"
            >
              <web-ui-icon :icon="getSourceIcon(resource)" :size="14" class="shrink-0 text-[#8a8a94]"></web-ui-icon>
              <web-ui-icon :icon="getResourceIcon(resource)" :size="24" class="shrink-0 text-[#5b5b66]"></web-ui-icon>
              <div class="flex flex-col min-w-0 gap-1">
                <span
                  class="truncate text-sm"
                  :class="resource.broken ? 'text-[#b0b0b8] line-through' : 'text-[#22212a]'"
                  >{{ resource.name }}</span
                >
                <div v-if="resource.tags && resource.tags.length > 0" class="flex gap-1 flex-wrap">
                  <span
                    v-for="tag in resource.tags"
                    :key="tag"
                    class="inline-block px-2 py-px rounded-full text-xs leading-tight whitespace-nowrap"
                    :class="tagColors[tag] || 'bg-gray-100 text-gray-500'"
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
        style="

--wui-drawer-width: 400px"
        @open-change="drawerOpen = $event.detail.open"
      >
        <div class="grid gap-4">
          <div class="flex items-center gap-2" v-if="selectedResource">
            <web-ui-icon :icon="getResourceIcon(selectedResource)" :size="24" class="text-[#5b5b66]"></web-ui-icon>
            <span class="font-semibold text-base truncate">{{ selectedResource.name }}</span>
          </div>
          <div class="flex gap-2" v-if="selectedResource">
            <web-ui-button variant="secondary">预览</web-ui-button>
            <web-ui-button variant="secondary">打开方式</web-ui-button>
          </div>
          <div class="grid gap-2 text-xs" v-if="selectedResource">
            <div class="flex justify-between text-[#5b5b66]">
              <span>来源类型</span>
              <span class="text-[#22212a]">{{ selectedResource.sourceType === 'local' ? '本地文件' : '链接' }}</span>
            </div>
            <div class="flex justify-between text-[#5b5b66]">
              <span>资源类型</span>
              <span class="text-[#22212a]">{{ selectedResource.resourceType }}</span>
            </div>
            <div class="flex justify-between text-[#5b5b66]">
              <span>状态</span>
              <span :class="selectedResource.broken ? 'text-red-500' : 'text-[#22212a]'">{{
                selectedResource.broken ? '已失效' : '有效'
              }}</span>
            </div>
            <div
              v-if="selectedResource.tags && selectedResource.tags.length > 0"
              class="flex justify-between text-[#5b5b66]"
            >
              <span>标签</span>
              <div class="flex gap-1 flex-wrap justify-end">
                <span
                  v-for="tag in selectedResource.tags"
                  :key="tag"
                  class="inline-block px-1.5 py-px rounded-full text-[11px] leading-tight whitespace-nowrap"
                  :class="tagColors[tag] || 'bg-gray-100 text-gray-500'"
                  >{{ tag }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </web-ui-drawer>
    </div>
    <web-ui-back-top></web-ui-back-top>
  </web-ui-layout>
</template>

<style scoped>
.resource-row + .resource-row::before {
  content: '';

  position: absolute;
  top: 0;
  right: 12px;
  left: 12px;

  height: 1px;

  background: rgb(0 0 0 / 0.05);
}
</style>
