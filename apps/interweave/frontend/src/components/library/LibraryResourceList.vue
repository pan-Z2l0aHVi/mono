<script setup lang="ts">
import type { WebUiContextMenu, WebUiEvent } from '@greypan/web-ui'
import {
  lucideEye,
  lucideFolderOpen,
  lucidePenLine,
  lucideRefreshCw,
  lucideTags,
  lucideTrash2
} from '@greypan/web-ui/icons'
import { nextTick, ref } from 'vue'

import type { ResourceSourceView, ResourceView } from '@/stores/library'

import LibraryResourceRow from './LibraryResourceRow.vue'

defineProps<{
  resources: ResourceView[]
  activeResourceId: string | null
  checkedIds: string[]
  selectionMode: boolean
  loading: boolean
  emptyDescription: string
}>()

const emit = defineEmits<{
  select: [resource: ResourceView]
  preview: [resource: ResourceView]
  rename: [resource: ResourceView]
  editTags: [resource: ResourceView]
  delete: [resource: ResourceView]
  refresh: [source: ResourceSourceView]
  replace: [sourceId: string]
  toggle: [resourceId: string]
}>()

const contextMenuRef = ref<WebUiContextMenu>()
const contextResource = ref<ResourceView | null>(null)

async function openContextMenu(resource: ResourceView, event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  contextResource.value = resource
  await nextTick()
  contextMenuRef.value?.openAt(event.clientX, event.clientY)
}

function closeContextMenu() {
  contextMenuRef.value?.close()
}

function contextURLSource(resource: ResourceView | null) {
  return resource?.sources.find(source => source.type === 'url') ?? null
}

function contextUnavailableFileSource(resource: ResourceView | null) {
  return resource?.sources.find(source => source.type === 'file' && !source.available) ?? null
}

function handleRename(resource: ResourceView | null) {
  if (resource) emit('rename', resource)
  closeContextMenu()
}

function handleTags(resource: ResourceView | null) {
  if (resource) emit('editTags', resource)
  closeContextMenu()
}

function handleDelete(resource: ResourceView | null) {
  if (resource) emit('delete', resource)
  closeContextMenu()
}

function handlePreview(resource: ResourceView | null) {
  if (resource) emit('preview', resource)
  closeContextMenu()
}

function handleRefresh(source: ResourceSourceView | null) {
  if (source) emit('refresh', source)
  closeContextMenu()
}

function handleReplace(source: ResourceSourceView | null) {
  if (source) emit('replace', source.id)
  closeContextMenu()
}

function handleOpenChange(_event: WebUiEvent<WebUiContextMenu, 'open-change'>) {
  if (!contextMenuRef.value?.isOpen) contextResource.value = null
}
</script>

<template>
  <web-ui-context-menu ref="contextMenuRef" class="block w-full" @open-change="handleOpenChange">
    <div v-if="loading" class="grid min-h-64 place-items-center" aria-live="polite">
      <div class="grid justify-items-center gap-3 text-sm text-(--wui-color-text-secondary)">
        <web-ui-spinner :size="28" />
        <span>正在载入资源库</span>
      </div>
    </div>

    <div v-else-if="resources.length === 0" class="grid min-h-72 place-items-center py-16">
      <web-ui-empty size="large" :description="emptyDescription" />
    </div>

    <div v-else class="w-full select-none">
      <LibraryResourceRow
        v-for="resource in resources"
        :key="resource.id"
        :resource="resource"
        :active="activeResourceId === resource.id"
        :checked="checkedIds.includes(resource.id)"
        :selection-mode="selectionMode"
        @select="emit('select', $event)"
        @contextmenu="openContextMenu"
        @toggle="emit('toggle', $event)"
      />
    </div>

    <template v-if="contextResource">
      <web-ui-dropdown-item v-if="contextResource.available" @click="handlePreview(contextResource)">
        <web-ui-icon slot="prefix" :icon="lucideEye" :size="14" />
        预览
      </web-ui-dropdown-item>
      <web-ui-dropdown-item
        v-if="contextURLSource(contextResource)"
        @click="handleRefresh(contextURLSource(contextResource))"
      >
        <web-ui-icon slot="prefix" :icon="lucideRefreshCw" :size="14" />
        刷新 URL 来源
      </web-ui-dropdown-item>
      <web-ui-dropdown-item
        v-if="contextUnavailableFileSource(contextResource)"
        @click="handleRefresh(contextUnavailableFileSource(contextResource))"
      >
        <web-ui-icon slot="prefix" :icon="lucideRefreshCw" :size="14" />
        重新检查原路径
      </web-ui-dropdown-item>
      <web-ui-dropdown-item
        v-if="contextUnavailableFileSource(contextResource)"
        @click="handleReplace(contextUnavailableFileSource(contextResource))"
      >
        <web-ui-icon slot="prefix" :icon="lucideFolderOpen" :size="14" />
        更换文件路径
      </web-ui-dropdown-item>
      <web-ui-dropdown-item @click="handleRename(contextResource)">
        <web-ui-icon slot="prefix" :icon="lucidePenLine" :size="14" />
        重命名
      </web-ui-dropdown-item>
      <web-ui-dropdown-item @click="handleTags(contextResource)">
        <web-ui-icon slot="prefix" :icon="lucideTags" :size="14" />
        编辑标签
      </web-ui-dropdown-item>
      <web-ui-dropdown-divider />
      <web-ui-dropdown-item class="text-(--wui-color-danger)" @click="handleDelete(contextResource)">
        <web-ui-icon slot="prefix" :icon="lucideTrash2" :size="14" class="text-(--wui-color-danger)" />
        删除
      </web-ui-dropdown-item>
    </template>
  </web-ui-context-menu>
</template>
