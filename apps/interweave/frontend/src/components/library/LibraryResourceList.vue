<script setup lang="ts">
import type { WebUiContextMenu, WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import {
  lucideClapperboard,
  lucideCode,
  lucideEye,
  lucideExternalLink,
  lucideFile,
  lucideFileText,
  lucideFilm,
  lucideGlobe,
  lucideHeadphones,
  lucideImage,
  lucideMusic,
  lucidePenLine,
  lucidePlay,
  lucideRefreshCw,
  lucideTags,
  lucideTrash2
} from '@greypan/web-ui/icons'
import { computed, nextTick, ref } from 'vue'

import type { ResourceKind, ResourceSourceView, ResourceView } from '@/stores/library'

import LibraryResourceRow from './LibraryResourceRow.vue'
import type { NameEditorRef } from './rename'

const props = defineProps<{
  resources: ResourceView[]
  activeResourceId: string | null
  checkedIds: string[]
  selectionMode: boolean
  editingNameKey: string | null
  editorRef: (id: string) => NameEditorRef
  loading: boolean
  runtimeAvailable: boolean
  emptyDescription: string
  mediaUrlFor: (sourceId: string) => string | null
}>()

const emit = defineEmits<{
  select: [resource: ResourceView]
  preview: [resource: ResourceView]
  startRename: [resource: ResourceView]
  editTags: [resource: ResourceView]
  delete: [resource: ResourceView]
  recover: [source: ResourceSourceView]
  toggle: [resourceId: string]
  renameChange: [resource: ResourceView, event: WebUiEvent<WebUiEditableText, 'change'>]
  cancelRename: []
}>()

const contextMenuRef = ref<WebUiContextMenu>()
const contextResource = ref<ResourceView | null>(null)
const emptyTitle = computed(() => (props.runtimeAvailable ? '资源库为空' : '桌面服务未连接'))

const openWithApps: Partial<Record<ResourceKind, Array<{ label: string; icon: typeof lucideEye }>>> = {
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
  json: [{ label: 'VS Code', icon: lucideCode }],
  web: [
    { label: 'Safari', icon: lucideGlobe },
    { label: 'Chrome', icon: lucideGlobe }
  ],
  file: [{ label: '系统文件', icon: lucideFile }]
}

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

function contextUnavailableSource(resource: ResourceView | null) {
  return resource?.sources.find(source => !source.available) ?? null
}

function handleStartRename(resource: ResourceView | null) {
  if (resource) emit('startRename', resource)
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

function handleRecover(source: ResourceSourceView | null) {
  if (source) emit('recover', source)
  closeContextMenu()
}

function editorRefFor(id: string) {
  return props.editorRef(id)
}

function handleRenameChange(resource: ResourceView, event: WebUiEvent<WebUiEditableText, 'change'>) {
  emit('renameChange', resource, event)
}
</script>

<template>
  <web-ui-context-menu ref="contextMenuRef" class="block w-full">
    <div v-if="loading" class="grid min-h-64 place-items-center" aria-live="polite">
      <div class="grid justify-items-center gap-3 text-sm text-(--wui-color-text-secondary)">
        <web-ui-spinner :size="28" />
        <span>正在载入资源库</span>
      </div>
    </div>

    <div v-else-if="resources.length === 0" class="flex flex-col items-center justify-center py-24">
      <web-ui-empty size="large" :title="emptyTitle" :description="emptyDescription" />
    </div>

    <div v-else class="w-full h-full select-none">
      <LibraryResourceRow
        v-for="resource in resources"
        :key="resource.id"
        :resource="resource"
        :media-url="resource.preferred ? mediaUrlFor(resource.preferred.id) : null"
        :active="!selectionMode && activeResourceId === resource.id"
        :checked="checkedIds.includes(resource.id)"
        :selection-mode="selectionMode"
        :editing-name-key="editingNameKey"
        :editor-ref="editorRefFor(resource.id)"
        @select="emit('select', $event)"
        @contextmenu="openContextMenu"
        @toggle="emit('toggle', $event)"
        @rename-change="handleRenameChange"
        @cancel-rename="emit('cancelRename')"
      />
    </div>

    <web-ui-dropdown-item v-if="contextResource?.available" @click="handlePreview(contextResource)">
      <web-ui-icon slot="prefix" :icon="lucideEye" :size="14" />
      预览
    </web-ui-dropdown-item>
    <web-ui-dropdown-item v-if="contextResource?.available" submenu>
      <web-ui-icon slot="prefix" :icon="lucideExternalLink" :size="14" />
      打开方式
      <web-ui-dropdown-item>
        <web-ui-icon slot="prefix" :icon="lucideExternalLink" :size="14" />
        系统默认应用
      </web-ui-dropdown-item>
      <web-ui-dropdown-item
        v-for="app in contextResource ? (openWithApps[contextResource.kind] ?? []) : []"
        :key="app.label"
      >
        <web-ui-icon slot="prefix" :icon="app.icon" :size="14" />
        {{ app.label }}
      </web-ui-dropdown-item>
    </web-ui-dropdown-item>
    <web-ui-dropdown-item v-if="contextResource" @click="handleStartRename(contextResource)">
      <web-ui-icon slot="prefix" :icon="lucidePenLine" :size="14" />
      重命名
    </web-ui-dropdown-item>
    <web-ui-dropdown-item
      v-if="contextResource && !contextResource.available && contextUnavailableSource(contextResource)"
      @click="handleRecover(contextUnavailableSource(contextResource))"
    >
      <web-ui-icon slot="prefix" :icon="lucideRefreshCw" :size="14" />
      找回资源
    </web-ui-dropdown-item>
    <web-ui-dropdown-item v-if="contextResource?.available" @click="handleTags(contextResource)">
      <web-ui-icon slot="prefix" :icon="lucideTags" :size="14" />
      编辑标签
    </web-ui-dropdown-item>
    <web-ui-dropdown-divider />
    <web-ui-dropdown-item style="color: var(--wui-color-danger, #ef4444)" @click="handleDelete(contextResource)">
      <web-ui-icon slot="prefix" :icon="lucideTrash2" :size="14" class="text-(--wui-color-danger,#ef4444)" />
      删除
    </web-ui-dropdown-item>
  </web-ui-context-menu>
</template>
