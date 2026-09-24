<script setup lang="ts">
import type { WebUiAutocomplete, WebUiEvent, WebUiInput, WebUiSelect } from '@greypan/web-ui'
import {
  biCheck,
  lucideChevronUp,
  lucideListFilter,
  lucideListRestart,
  lucidePlus,
  lucideSearch,
  lucideTrash2
} from '@greypan/web-ui/icons'
import { nextTick, ref, watch } from 'vue'

import type { AvailabilityFilter, ResourceKind, SortOption, SourceType } from '@/stores/library'

const props = defineProps<{
  searchQuery: string
  filterSource: SourceType | 'all'
  filterKind: ResourceKind | 'all'
  filterAvailability: AvailabilityFilter
  filterTag: string
  sort: SortOption
  allTagNames: string[]
  hasActiveFilter: boolean
  filterOpen: boolean
  searchOpen: boolean
  selectionMode: boolean
  selectedCount: number
  allVisibleSelected: boolean
}>()

const emit = defineEmits<{
  'update:searchQuery': [value: string]
  'update:filterSource': [value: SourceType | 'all']
  'update:filterKind': [value: ResourceKind | 'all']
  'update:filterAvailability': [value: AvailabilityFilter]
  'update:filterTag': [value: string]
  'update:sort': [value: SortOption]
  'update:filterOpen': [value: boolean]
  'update:searchOpen': [value: boolean]
  add: []
  select: []
  selectAll: []
  deleteSelected: []
  reset: []
}>()

const searchInputRef = ref<WebUiInput>()

watch(
  () => props.searchOpen,
  open => {
    if (!open) return
    void nextTick(() => searchInputRef.value?.focus())
  }
)

function handleSearchInput(event: WebUiEvent<WebUiInput, 'input'>) {
  emit('update:searchQuery', event.target.value)
}

function handleSearchKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  event.preventDefault()
  emit('update:searchOpen', false)
}

function handleSourceChange(event: WebUiEvent<WebUiSelect, 'change'>) {
  emit('update:filterSource', event.target.value as SourceType | 'all')
}

function handleKindChange(event: WebUiEvent<WebUiSelect, 'change'>) {
  emit('update:filterKind', event.target.value as ResourceKind | 'all')
}

function handleAvailabilityChange(event: WebUiEvent<WebUiSelect, 'change'>) {
  emit('update:filterAvailability', event.target.value as AvailabilityFilter)
}

function handleTagInput(event: WebUiEvent<WebUiAutocomplete, 'input'>) {
  emit('update:filterTag', event.target.value)
}

function handleSortChange(event: WebUiEvent<WebUiSelect, 'change'>) {
  emit('update:sort', event.target.value as SortOption)
}
</script>

<template>
  <div class="w-full">
    <div class="flex min-h-14 items-center gap-2 px-6 max-[640px]:px-3 max-[640px]:pl-0">
      <div class="min-w-0 flex-1">
        <h1 class="m-0 truncate text-[17px] leading-6 font-semibold">资源库</h1>
      </div>

      <div class="ml-auto flex shrink-0 items-center gap-1.5">
        <template v-if="!selectionMode">
          <web-ui-tooltip v-if="!searchOpen" content="搜索" portal>
            <web-ui-button icon aria-label="搜索资源" @click="emit('update:searchOpen', true)">
              <web-ui-icon :icon="lucideSearch" />
            </web-ui-button>
          </web-ui-tooltip>
          <web-ui-input
            v-else
            ref="searchInputRef"
            :value="searchQuery"
            clearable
            placeholder="搜索资源"
            aria-label="搜索资源"
            class="[--wui-input-width:min(260px,calc(100vw-150px))]"
            @input="handleSearchInput"
            @keydown="handleSearchKeydown"
          >
            <web-ui-icon slot="prefix" :icon="lucideSearch" />
          </web-ui-input>

          <web-ui-tooltip v-if="!searchOpen" content="添加资源" portal>
            <web-ui-button icon variant="primary" aria-label="添加资源" @click="emit('add')">
              <web-ui-icon :icon="lucidePlus" />
            </web-ui-button>
          </web-ui-tooltip>
          <web-ui-button v-if="!searchOpen" @click="emit('select')">选择</web-ui-button>
          <web-ui-tooltip v-if="!searchOpen" content="筛选和排序" portal>
            <web-ui-button
              icon
              :variant="hasActiveFilter ? 'secondary' : 'glass'"
              aria-label="筛选和排序"
              aria-controls="library-filter-panel"
              :aria-expanded="filterOpen"
              @click="emit('update:filterOpen', !filterOpen)"
            >
              <web-ui-icon :icon="filterOpen ? lucideChevronUp : lucideListFilter" />
            </web-ui-button>
          </web-ui-tooltip>
        </template>

        <template v-else>
          <web-ui-button @click="emit('selectAll')">
            {{ allVisibleSelected ? '取消全选' : '全选' }}
          </web-ui-button>
          <web-ui-button icon aria-label="删除选中资源" :disabled="selectedCount === 0" @click="emit('deleteSelected')">
            <web-ui-icon :icon="lucideTrash2" class="text-(--wui-color-danger)" />
          </web-ui-button>
          <web-ui-tooltip content="完成选择" portal>
            <web-ui-button icon variant="primary" aria-label="完成选择" @click="emit('select')">
              <web-ui-icon :icon="biCheck" />
            </web-ui-button>
          </web-ui-tooltip>
        </template>
      </div>
    </div>

    <div
      class="overflow-hidden transition-[height] duration-200 ease-in-out"
      :style="{ height: filterOpen ? 'auto' : '0px' }"
    >
      <div
        id="library-filter-panel"
        class="flex flex-wrap items-center gap-3 px-6 py-2.5 text-sm text-(--wui-color-text-secondary) max-[640px]:-ml-14 max-[640px]:px-3"
        :aria-hidden="filterOpen ? undefined : 'true'"
        :inert="filterOpen ? undefined : true"
      >
        <label class="flex items-center gap-1.5 max-sm:basis-full">
          <span>来源</span>
          <web-ui-select
            portal
            :value="filterSource"
            aria-label="按来源筛选"
            class="[--wui-input-width:122px]"
            @change="handleSourceChange"
          >
            <web-ui-option value="all" label="全部来源">全部来源</web-ui-option>
            <web-ui-option value="file" label="本地文件">本地文件</web-ui-option>
            <web-ui-option value="url" label="URL">URL</web-ui-option>
          </web-ui-select>
        </label>

        <label class="flex items-center gap-1.5 max-sm:basis-full">
          <span>类型</span>
          <web-ui-select
            portal
            :value="filterKind"
            aria-label="按类型筛选"
            class="[--wui-input-width:122px]"
            @change="handleKindChange"
          >
            <web-ui-option value="all" label="全部类型">全部类型</web-ui-option>
            <web-ui-option value="pdf" label="PDF">PDF</web-ui-option>
            <web-ui-option value="document" label="文档">文档</web-ui-option>
            <web-ui-option value="data" label="数据">数据</web-ui-option>
            <web-ui-option value="web" label="网页">网页</web-ui-option>
            <web-ui-option value="file" label="文件">文件</web-ui-option>
          </web-ui-select>
        </label>

        <label class="flex items-center gap-1.5 max-sm:basis-full">
          <span>可用性</span>
          <web-ui-select
            portal
            :value="filterAvailability"
            aria-label="按可用性筛选"
            class="[--wui-input-width:122px]"
            @change="handleAvailabilityChange"
          >
            <web-ui-option value="all" label="全部状态">全部状态</web-ui-option>
            <web-ui-option value="available" label="可用">可用</web-ui-option>
            <web-ui-option value="unavailable" label="不可用">不可用</web-ui-option>
          </web-ui-select>
        </label>

        <label class="flex items-center gap-1.5 max-sm:basis-full">
          <span>标签</span>
          <web-ui-autocomplete
            portal
            :value="filterTag"
            placeholder="全部标签"
            aria-label="按标签筛选"
            class="[--wui-input-width:190px]"
            @input="handleTagInput"
          >
            <web-ui-option v-for="tagName in allTagNames" :key="tagName" :value="tagName" :label="tagName">
              {{ tagName }}
            </web-ui-option>
          </web-ui-autocomplete>
        </label>

        <label class="flex items-center gap-1.5 max-sm:basis-full">
          <span>排序</span>
          <web-ui-select
            portal
            :value="sort"
            aria-label="资源排序"
            class="[--wui-input-width:136px]"
            @change="handleSortChange"
          >
            <web-ui-option value="latest" label="最近修改">最近修改</web-ui-option>
            <web-ui-option value="earliest" label="较早修改">较早修改</web-ui-option>
            <web-ui-option value="name" label="标题">标题</web-ui-option>
            <web-ui-option value="tagName" label="标签名称">标签名称</web-ui-option>
          </web-ui-select>
        </label>

        <web-ui-button v-if="hasActiveFilter" variant="ghost" @click="emit('reset')">
          <web-ui-icon slot="prefix" :icon="lucideListRestart" />
          重置筛选
        </web-ui-button>
      </div>
    </div>
  </div>
</template>
