<script setup lang="ts">
import type { WebUiAutocomplete, WebUiEvent, WebUiInput, WebUiSelect } from '@greypan/web-ui'
import {
  biCheck,
  heroiconsBarsArrowDown16Solid,
  heroiconsBarsArrowUp16Solid,
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronUp,
  lucideListFilter,
  lucideListRestart,
  lucidePlus,
  lucideSearch,
  lucideTag,
  lucideTrash2,
  lucideUndo2,
  tablerSortAscendingLetters
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
  mobile: boolean
  canGoBack: boolean
  canGoForward: boolean
  canRestore: boolean
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
  restore: []
  reset: []
  back: []
  forward: []
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

const filterLabelClass =
  'flex items-center gap-1.5 text-[#8a8a94] max-sm:basis-full dark:text-(--wui-color-text-secondary)'
</script>

<template>
  <div class="w-full">
    <div class="flex gap-4 items-center px-6 py-2 max-[640px]:px-3 max-[640px]:pl-0">
      <web-ui-button-group aria-label="页面导航" class="max-[640px]:hidden">
        <web-ui-button icon variant="glass" aria-label="后退" :disabled="!canGoBack" @click="emit('back')">
          <web-ui-icon :icon="lucideChevronLeft" />
        </web-ui-button>
        <web-ui-button icon variant="glass" aria-label="前进" :disabled="!canGoForward" @click="emit('forward')">
          <web-ui-icon :icon="lucideChevronRight" />
        </web-ui-button>
      </web-ui-button-group>

      <div class="flex gap-1.5 items-center ml-auto">
        <template v-if="!selectionMode">
          <web-ui-tooltip v-if="!(searchOpen && mobile)" content="添加资源" portal>
            <web-ui-button icon variant="primary" aria-label="添加资源" @click="emit('add')">
              <web-ui-icon :icon="lucidePlus" />
            </web-ui-button>
          </web-ui-tooltip>
          <web-ui-button v-if="!(searchOpen && mobile)" @click="emit('select')">选择</web-ui-button>
          <web-ui-tooltip v-if="!(searchOpen && mobile)" content="筛选和排序" portal>
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
          <web-ui-tooltip v-if="!searchOpen" content="搜索" portal>
            <web-ui-button icon aria-label="搜索" @click="emit('update:searchOpen', true)">
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
            class="[--wui-input-width:min(240px,calc(100vw-180px))]"
            @input="handleSearchInput"
            @keydown="handleSearchKeydown"
          >
            <web-ui-icon slot="prefix" :icon="lucideSearch" />
          </web-ui-input>
        </template>

        <template v-else>
          <web-ui-button @click="emit('selectAll')">
            {{ allVisibleSelected ? '取消全选' : '全选' }}
          </web-ui-button>
          <web-ui-button-group aria-label="批量操作">
            <web-ui-tooltip portal>
              <span slot="content" style="color: var(--wui-color-danger)">删除</span>
              <web-ui-button icon aria-label="删除" :disabled="selectedCount === 0" @click="emit('deleteSelected')">
                <web-ui-icon class="[--wui-icon-color:var(--wui-color-danger)]" :icon="lucideTrash2" />
              </web-ui-button>
            </web-ui-tooltip>
            <web-ui-tooltip content="找回" portal>
              <web-ui-button icon aria-label="找回" :disabled="!canRestore" @click="emit('restore')">
                <web-ui-icon :icon="lucideUndo2" />
              </web-ui-button>
            </web-ui-tooltip>
          </web-ui-button-group>
          <web-ui-tooltip content="确认" portal>
            <web-ui-button icon variant="primary" aria-label="确认" @click="emit('select')">
              <web-ui-icon :icon="biCheck" />
            </web-ui-button>
          </web-ui-tooltip>
        </template>
      </div>
    </div>

    <div
      class="transition-all duration-200 ease-in-out"
      :style="{ height: filterOpen ? 'auto' : '0px', overflow: filterOpen ? 'visible' : 'hidden' }"
    >
      <div
        id="library-filter-panel"
        class="flex flex-wrap gap-3 items-center px-6 max-[640px]:px-3 max-[640px]:-ml-14 py-2.5 text-sm text-[#5b5b66] dark:text-(--wui-color-text-secondary)"
        :aria-hidden="filterOpen ? undefined : 'true'"
        :inert="filterOpen ? undefined : true"
      >
        <label :class="filterLabelClass">
          <web-ui-select portal :value="filterSource" class="[--wui-input-width:128px]" @change="handleSourceChange">
            <web-ui-option value="all" label="全部来源">全部来源</web-ui-option>
            <web-ui-option value="file" label="本地文件">本地文件</web-ui-option>
            <web-ui-option value="url" label="链接">链接</web-ui-option>
          </web-ui-select>
        </label>

        <label :class="filterLabelClass">
          <web-ui-select portal :value="filterKind" class="[--wui-input-width:128px]" @change="handleKindChange">
            <web-ui-option value="all" label="全部类型">全部类型</web-ui-option>
            <web-ui-option value="image" label="图片">图片</web-ui-option>
            <web-ui-option value="video" label="视频">视频</web-ui-option>
            <web-ui-option value="audio" label="音频">音频</web-ui-option>
            <web-ui-option value="document" label="文档">文档</web-ui-option>
            <web-ui-option value="json" label="源代码">源代码</web-ui-option>
            <web-ui-option value="web" label="网页">网页</web-ui-option>
            <web-ui-option value="file" label="文件">文件</web-ui-option>
            <web-ui-option value="unknown" label="其他">其他</web-ui-option>
          </web-ui-select>
        </label>

        <label :class="filterLabelClass">
          <web-ui-select
            portal
            :value="filterAvailability"
            class="[--wui-input-width:128px]"
            @change="handleAvailabilityChange"
          >
            <web-ui-option value="all" label="全部状态">全部状态</web-ui-option>
            <web-ui-option value="available" label="正常">正常</web-ui-option>
            <web-ui-option value="unavailable" label="已失效">已失效</web-ui-option>
          </web-ui-select>
        </label>

        <label :class="filterLabelClass">
          <web-ui-autocomplete
            portal
            :value="filterTag"
            placeholder="标签"
            class="[--wui-input-width:200px]"
            @input="handleTagInput"
          >
            <web-ui-option v-for="tagName in allTagNames" :key="tagName" :value="tagName" :label="tagName">
              {{ tagName }}
            </web-ui-option>
          </web-ui-autocomplete>
        </label>

        <label :class="filterLabelClass">
          <web-ui-select
            portal
            :value="sort"
            aria-label="排序"
            class="[--wui-input-width:48px]"
            @change="handleSortChange"
          >
            <web-ui-icon
              slot="trigger"
              :icon="
                sort === 'name'
                  ? tablerSortAscendingLetters
                  : sort === 'tagName'
                    ? lucideTag
                    : sort === 'latest'
                      ? heroiconsBarsArrowDown16Solid
                      : heroiconsBarsArrowUp16Solid
              "
              :size="16"
            />
            <web-ui-option value="name" label="名称">名称</web-ui-option>
            <web-ui-option value="tagName" label="标签名称">标签名称</web-ui-option>
            <web-ui-option value="latest" label="最新">最近修改</web-ui-option>
            <web-ui-option value="earliest" label="最早">较早修改</web-ui-option>
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
