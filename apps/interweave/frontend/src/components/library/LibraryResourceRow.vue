<script setup lang="ts">
import type { WebUiCheckbox, WebUiEvent } from '@greypan/web-ui'
import { lucideTriangleAlert } from '@greypan/web-ui/icons'
import { computed } from 'vue'

import type { ResourceView } from '@/stores/library'

import {
  fileExtension,
  formatTimestamp,
  primarySource,
  resourceIcon,
  sourceTypeIcon,
  sourceTypeLabel,
  tagClass
} from './presentation'

const props = defineProps<{
  resource: ResourceView
  active: boolean
  checked: boolean
  selectionMode: boolean
}>()

const emit = defineEmits<{
  select: [resource: ResourceView]
  contextmenu: [resource: ResourceView, event: MouseEvent]
  toggle: [resourceId: string]
}>()

const source = computed(() => primarySource(props.resource))

function handleChange(_event: WebUiEvent<WebUiCheckbox, 'change'>) {
  emit('toggle', props.resource.id)
}
</script>

<template>
  <div
    class="group relative flex min-h-16 items-center gap-3 rounded-lg px-4 py-3 transition-colors duration-100 max-[640px]:px-2"
    :class="[
      checked
        ? 'bg-black/4 dark:bg-white/6'
        : active
          ? 'bg-black/6 dark:bg-white/9'
          : 'hover:bg-black/3 dark:hover:bg-white/5',
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

    <div
      class="grid size-10 shrink-0 place-items-center rounded-lg bg-black/5 text-(--wui-color-text-secondary) dark:bg-white/8"
    >
      <web-ui-icon :icon="resourceIcon(resource.kind)" :size="20" />
    </div>

    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div class="flex min-w-0 items-center gap-1.5">
        <span
          class="line-clamp-2 max-w-full min-w-0 text-sm leading-snug font-medium wrap-break-word"
          :class="resource.available ? '' : 'text-(--wui-color-text-disabled) line-through'"
        >
          {{ resource.title }}
        </span>
        <web-ui-icon
          v-if="!resource.available"
          :icon="lucideTriangleAlert"
          :size="14"
          class="shrink-0 text-amber-500"
        />
      </div>

      <div class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-(--wui-color-text-secondary)">
        <span v-if="source" class="inline-flex min-w-0 items-center gap-1">
          <web-ui-icon :icon="sourceTypeIcon(source)" :size="12" class="shrink-0" />
          <span>{{ sourceTypeLabel(source) }}</span>
        </span>
        <template v-if="source && fileExtension(source.location)">
          <span aria-hidden="true">·</span>
          <span>{{ fileExtension(source.location) }}</span>
        </template>
        <span aria-hidden="true">·</span>
        <time :datetime="new Date(resource.updatedAt).toISOString()">{{ formatTimestamp(resource.updatedAt) }}</time>
        <span v-if="resource.sources.length > 1" aria-hidden="true">·</span>
        <span v-if="resource.sources.length > 1">{{ resource.sources.length }} 个来源</span>
      </div>
    </div>

    <div v-if="resource.tagNames.length" class="flex max-w-[32%] flex-wrap justify-end gap-1.5 max-[640px]:hidden">
      <span
        v-for="tagName in resource.tagNames"
        :key="tagName"
        class="inline-block rounded-full px-2 py-0.5 text-xs leading-tight whitespace-nowrap"
        :class="tagClass(tagName)"
      >
        {{ tagName }}
      </span>
    </div>
  </div>
</template>
