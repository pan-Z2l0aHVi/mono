<script setup lang="ts">
import type { WebUiCheckbox, WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import { lucideTriangleAlert } from '@greypan/web-ui/icons'
import { computed } from 'vue'

import type { ResourceView } from '@/stores/library'

import {
  fileExtension,
  formatSize,
  formatTimestamp,
  primarySource,
  resourceIcon,
  resourceKindClass,
  sourceTypeIcon,
  sourceTypeLabel,
  tagClass
} from './presentation'
import type { NameEditorRef } from './rename'

const props = defineProps<{
  resource: ResourceView
  active: boolean
  checked: boolean
  selectionMode: boolean
  editingNameKey: string | null
  editorRef: NameEditorRef
}>()

const emit = defineEmits<{
  select: [resource: ResourceView]
  contextmenu: [resource: ResourceView, event: MouseEvent]
  toggle: [resourceId: string]
  renameChange: [resource: ResourceView, event: WebUiEvent<WebUiEditableText, 'change'>]
  cancelRename: []
}>()

const source = computed(() => primarySource(props.resource))
const size = computed(() => formatSize(props.resource.sizeBytes))
const resourceNameClass = computed(() => [
  'text-sm font-medium leading-snug wrap-break-word line-clamp-2 max-w-[60%] max-[640px]:max-w-full',
  props.resource.available
    ? 'text-[#22212a] dark:text-(--wui-color-text)'
    : 'text-[#b0b0b8] line-through dark:text-(--wui-color-text-disabled)'
])

function handleChange(_event: WebUiEvent<WebUiCheckbox, 'change'>) {
  emit('toggle', props.resource.id)
}

function handleNameChange(event: WebUiEvent<WebUiEditableText, 'change'>) {
  emit('renameChange', props.resource, event)
}
</script>

<template>
  <div
    class="group relative flex items-center gap-3 px-4 max-[640px]:px-2 py-3 transition-colors duration-100 rounded-xl"
    :class="[
      checked
        ? 'bg-black/3.5 dark:bg-white/5'
        : active
          ? 'bg-black/5 dark:bg-white/8'
          : 'hover:bg-black/3.5 dark:hover:bg-white/5',
      resource.available ? '' : '[&>div]:opacity-60'
    ]"
    data-resource-row
    :data-resource-id="resource.id"
    @click="emit('select', resource)"
    @contextmenu="emit('contextmenu', resource, $event)"
  >
    <web-ui-checkbox
      v-if="selectionMode"
      class="shrink-0"
      :checked="checked"
      :aria-label="`选择「${resource.title}」`"
      @click.stop
      @change="handleChange"
    />

    <div class="grid size-10 shrink-0 place-items-center rounded-lg" :class="resourceKindClass(resource.kind)">
      <web-ui-icon :icon="resourceIcon(resource.kind)" :size="20" />
    </div>

    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div class="flex min-w-0 items-center gap-1.5">
        <span v-if="editingNameKey !== resource.id" :class="resourceNameClass">
          {{ resource.title }}
        </span>
        <web-ui-editable-text
          v-else
          :ref="editorRef"
          :value="resource.title"
          :class="resourceNameClass"
          class="caret-(--wui-color-accent,#08f) select-text"
          :aria-label="`修改 ${resource.title} 的标题`"
          @click.stop
          @change="handleNameChange"
          @cancel="emit('cancelRename')"
        />
        <web-ui-icon
          v-if="!resource.available"
          :icon="lucideTriangleAlert"
          :size="14"
          class="shrink-0 text-amber-500"
        />
      </div>

      <div
        class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#9a9aa4] dark:text-(--wui-color-text-secondary)"
      >
        <span v-if="source" class="inline-flex min-w-0 items-center gap-1">
          <web-ui-icon
            :icon="sourceTypeIcon(source)"
            :size="12"
            class="shrink-0 text-[#bdbdc6] dark:text-(--wui-color-text-tertiary)"
          />
          <span>{{ sourceTypeLabel(source) }}</span>
        </span>
        <template v-if="source && fileExtension(source.location)">
          <span aria-hidden="true" class="text-[#d8d8de] dark:text-(--wui-color-text-tertiary)">·</span>
          <span>{{ fileExtension(source.location) }}</span>
        </template>
        <template v-if="size">
          <span aria-hidden="true" class="text-[#d8d8de] dark:text-(--wui-color-text-tertiary)">·</span>
          <span>{{ size }}</span>
        </template>
        <span aria-hidden="true" class="text-[#d8d8de] dark:text-(--wui-color-text-tertiary)">·</span>
        <time :datetime="new Date(resource.updatedAt).toISOString()">{{ formatTimestamp(resource.updatedAt) }}</time>
        <span
          v-if="resource.sources.length > 1"
          aria-hidden="true"
          class="text-[#d8d8de] dark:text-(--wui-color-text-tertiary)"
        >
          ·
        </span>
        <span v-if="resource.sources.length > 1">{{ resource.sources.length }} 个来源</span>
      </div>
    </div>

    <div v-if="resource.tagNames.length" class="flex max-w-[25%] flex-wrap justify-end gap-1.5">
      <span
        v-for="tagName in resource.tagNames"
        :key="tagName"
        class="inline-block px-2 py-0.5 rounded-full text-xs leading-tight whitespace-nowrap"
        :class="tagClass(tagName)"
      >
        {{ tagName }}
      </span>
    </div>
  </div>
</template>
