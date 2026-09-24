<script setup lang="ts">
import type { WebUiDrawer, WebUiEvent, WebUiInput } from '@greypan/web-ui'
import {
  lucideEye,
  lucideFolderOpen,
  lucidePenLine,
  lucideRefreshCw,
  lucideTags,
  lucideTrash2,
  lucideX
} from '@greypan/web-ui/icons'
import { computed, nextTick, ref, watch } from 'vue'

import type { ResourceSourceView, ResourceView } from '@/stores/library'

import {
  formatSize,
  formatTimestamp,
  resourceIcon,
  resourceKindLabel,
  resourceKindTextClass,
  sourceTypeIcon,
  sourceTypeLabel,
  tagClass
} from './presentation'

const props = defineProps<{
  open: boolean
  resource: ResourceView | null
  mobile: boolean
  renameRequest: number
  refreshingSourceIds: string[]
  replacingSourceIds: string[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  rename: [resourceId: string, title: string]
  editTags: [resource: ResourceView]
  delete: [resource: ResourceView]
  preview: [resource: ResourceView]
  refresh: [source: ResourceSourceView]
  replace: [sourceId: string]
}>()

const editingTitle = ref(false)
const titleDraft = ref('')
const titleInputRef = ref<WebUiInput>()
const placement = computed(() => (props.mobile ? 'bottom' : 'right'))

watch(
  () => [props.open, props.resource?.id] as const,
  ([open]) => {
    if (!open) stopRename()
  }
)

watch(
  () => props.renameRequest,
  async request => {
    if (!request || !props.open || !props.resource) return
    startRename()
  }
)

function handleOpenChange(event: WebUiEvent<WebUiDrawer, 'open-change'>) {
  emit('update:open', event.detail.open)
}

function startRename() {
  if (!props.resource) return
  titleDraft.value = props.resource.title
  editingTitle.value = true
  void nextTick(() => {
    titleInputRef.value?.focus()
    titleInputRef.value?.select()
  })
}

function stopRename() {
  editingTitle.value = false
  titleDraft.value = ''
}

function commitTitle() {
  if (!props.resource || !editingTitle.value) return
  const title = titleDraft.value.trim()
  if (!title) {
    titleDraft.value = props.resource.title
    stopRename()
    return
  }
  if (title !== props.resource.title) emit('rename', props.resource.id, title)
  stopRename()
}

function handleTitleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitTitle()
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    stopRename()
  }
}

function handleTitleInput(event: WebUiEvent<WebUiInput, 'input'>) {
  titleDraft.value = event.target.value
}
</script>

<template>
  <web-ui-drawer
    :open="open"
    :placement="placement"
    dialog-label="资源详情"
    draggable
    controlled
    class="max-[640px]:[--wui-drawer-height:82vh] max-[640px]:[--wui-drawer-inset:0px] max-[640px]:[--wui-drawer-radius:28px_28px_0_0] max-[640px]:[--wui-drawer-content-padding:0px] [--wui-drawer-width:min(620px,max(58vw,340px))]"
    @open-change="handleOpenChange"
  >
    <div
      v-if="resource"
      class="grid gap-5 max-[640px]:h-(--wui-drawer-height) max-[640px]:overflow-y-auto max-[640px]:p-5"
    >
      <div
        class="grid h-36 place-items-center rounded-lg bg-black/4 dark:bg-white/6"
        :aria-label="`${resourceKindLabel(resource.kind)}预览占位`"
      >
        <web-ui-icon :icon="resourceIcon(resource.kind)" :size="48" :class="resourceKindTextClass(resource.kind)" />
      </div>

      <div class="flex min-w-0 items-center gap-3">
        <web-ui-icon
          :icon="resourceIcon(resource.kind)"
          :size="22"
          class="shrink-0"
          :class="resourceKindTextClass(resource.kind)"
        />
        <web-ui-input
          v-if="editingTitle"
          ref="titleInputRef"
          v-model="titleDraft"
          full
          aria-label="资源标题"
          @input="handleTitleInput"
          @keydown="handleTitleKeydown"
          @blur="commitTitle"
        />
        <h2 v-else class="m-0 min-w-0 flex-1 text-[17px] leading-snug font-semibold wrap-break-word">
          {{ resource.title }}
        </h2>
        <web-ui-button v-if="!editingTitle" icon variant="ghost" size="30" aria-label="重命名资源" @click="startRename">
          <web-ui-icon :icon="lucidePenLine" :size="14" />
        </web-ui-button>
        <web-ui-button v-else icon variant="ghost" size="30" aria-label="取消重命名" @click="stopRename">
          <web-ui-icon :icon="lucideX" :size="14" />
        </web-ui-button>
      </div>

      <web-ui-button-group class="self-start">
        <web-ui-button
          v-if="resource.available"
          class="[--wui-button-color:var(--wui-color-accent)]"
          @click="emit('preview', resource)"
        >
          <web-ui-icon slot="prefix" :icon="lucideEye" :size="14" />
          预览
        </web-ui-button>
        <web-ui-button class="[--wui-button-color:var(--wui-color-danger)]" @click="emit('delete', resource)">
          删除
        </web-ui-button>
      </web-ui-button-group>

      <div class="flex flex-wrap items-center gap-1.5">
        <span
          v-for="tagName in resource.tagNames"
          :key="tagName"
          class="inline-block rounded-full px-2 py-0.5 text-xs leading-tight"
          :class="tagClass(tagName)"
        >
          {{ tagName }}
        </span>
        <web-ui-tooltip content="编辑标签" portal>
          <web-ui-button icon variant="ghost" size="24" aria-label="编辑标签" @click="emit('editTags', resource)">
            <web-ui-icon :icon="lucideTags" :size="13" />
          </web-ui-button>
        </web-ui-tooltip>
      </div>

      <div class="overflow-hidden rounded-lg bg-black/3 dark:bg-white/5">
        <div
          v-for="itemSource in resource.sources"
          :key="itemSource.id"
          class="relative flex min-w-0 items-start justify-between gap-4 px-4 py-3 after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-black/8 after:content-[''] last:after:hidden dark:after:bg-white/10"
        >
          <span class="flex min-w-0 flex-1 items-start gap-2.5">
            <web-ui-icon :icon="sourceTypeIcon(itemSource)" :size="15" class="mt-0.5 shrink-0" />
            <span class="grid min-w-0 flex-1 gap-0.5">
              <span class="flex min-w-0 items-center gap-1.5 text-[13px] leading-5 font-medium">
                {{ sourceTypeLabel(itemSource) }}
                <span
                  v-if="itemSource.isPreferred"
                  class="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] leading-3 font-normal dark:bg-white/8"
                >
                  首选
                </span>
              </span>
              <span class="block min-w-0 truncate text-xs leading-5" :title="itemSource.location">
                {{ itemSource.location }}
              </span>
            </span>
          </span>
          <span class="flex shrink-0 items-center gap-1.5">
            <span
              class="rounded-full px-2 py-0.5 text-xs leading-none"
              :class="
                itemSource.available
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200'
                  : 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200'
              "
            >
              {{ itemSource.available ? '可用' : '不可用' }}
            </span>
            <web-ui-button
              v-if="itemSource.type === 'url' || !itemSource.available"
              icon
              variant="ghost"
              size="24"
              :loading="refreshingSourceIds.includes(itemSource.id)"
              :aria-label="
                itemSource.type === 'file' ? `重新检查原路径 ${itemSource.location}` : `刷新 ${itemSource.location}`
              "
              @click="emit('refresh', itemSource)"
            >
              <web-ui-icon :icon="lucideRefreshCw" :size="12" />
            </web-ui-button>
            <web-ui-button
              v-if="itemSource.type === 'file' && !itemSource.available"
              icon
              variant="ghost"
              size="24"
              :loading="replacingSourceIds.includes(itemSource.id)"
              :aria-label="`更换文件路径 ${itemSource.location}`"
              @click="emit('replace', itemSource.id)"
            >
              <web-ui-icon :icon="lucideFolderOpen" :size="12" />
            </web-ui-button>
          </span>
        </div>

        <div class="flex items-center justify-between gap-4 px-4 py-3">
          <span class="text-[13px] leading-5 text-(--wui-color-text-secondary)">类型</span>
          <span class="text-[13px] leading-5 font-medium">{{ resourceKindLabel(resource.kind) }}</span>
        </div>
        <div v-if="resource.sizeBytes !== null" class="flex items-center justify-between gap-4 px-4 py-3">
          <span class="text-[13px] leading-5 text-(--wui-color-text-secondary)">大小</span>
          <span class="text-[13px] leading-5 font-medium tabular-nums">{{ formatSize(resource.sizeBytes) }}</span>
        </div>
        <div class="flex items-center justify-between gap-4 px-4 py-3">
          <span class="text-[13px] leading-5 text-(--wui-color-text-secondary)">状态</span>
          <span
            class="text-[13px] leading-5 font-medium"
            :class="resource.available ? '' : 'text-(--wui-color-danger)'"
          >
            {{ resource.available ? '可用' : '不可用' }}
          </span>
        </div>
        <div class="flex items-center justify-between gap-4 px-4 py-3">
          <span class="text-[13px] leading-5 text-(--wui-color-text-secondary)">创建于</span>
          <time class="text-[13px] leading-5 font-medium tabular-nums">{{ formatTimestamp(resource.createdAt) }}</time>
        </div>
        <div class="flex items-center justify-between gap-4 px-4 py-3">
          <span class="text-[13px] leading-5 text-(--wui-color-text-secondary)">修改于</span>
          <time class="text-[13px] leading-5 font-medium tabular-nums">{{ formatTimestamp(resource.updatedAt) }}</time>
        </div>
      </div>

      <div v-if="resource.note" class="grid gap-1.5">
        <span class="text-xs font-medium text-(--wui-color-text-secondary)">备注</span>
        <p class="m-0 text-sm leading-6 wrap-break-word">{{ resource.note }}</p>
      </div>
    </div>
  </web-ui-drawer>
</template>
