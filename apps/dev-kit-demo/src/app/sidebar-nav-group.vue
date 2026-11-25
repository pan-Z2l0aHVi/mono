<script setup lang="ts">
import type { WebUiCollapse, WebUiEvent } from '@greypan/web-ui'
import { lucideChevronRight } from '@greypan/web-ui/icons'
import { computed } from 'vue'

const props = defineProps<{
  groupId: string
  label: string
  open: boolean
  active?: boolean
  collapsed?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const triggerClass = computed(() => [
  'flex cursor-pointer items-center rounded-lg text-sm font-medium transition-colors',
  'hover:bg-[#1b1b30]/4 dark:hover:bg-white/6 focus-visible:outline-2 focus-visible:outline-(--wui-color-accent)',
  props.active ? 'text-(--wui-color-accent)' : 'text-(--wui-color-text)',
  props.collapsed ? 'h-9 w-9 justify-center' : 'w-full min-w-0 justify-between gap-2 px-2.5 py-2 text-left'
])

const arrowClass = computed(() => [
  'shrink-0 text-(--wui-color-text-secondary) transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
  props.open ? 'rotate-90' : ''
])

function onOpenChange(event: WebUiEvent<WebUiCollapse, 'open-change'>) {
  emit('update:open', event.detail.open)
}
</script>

<template>
  <web-ui-collapse class="w-full min-w-0" :open="open" :data-nav-collapse="groupId" @open-change="onOpenChange">
    <web-ui-tooltip v-if="collapsed" :content="label" placement="right" portal>
      <button
        type="button"
        :class="triggerClass"
        :aria-expanded="open"
        :aria-label="label"
        :data-nav-group="groupId"
        :data-group-active="active ? 'true' : undefined"
      >
        <web-ui-icon :icon="lucideChevronRight" :size="15" :class="arrowClass"></web-ui-icon>
      </button>
    </web-ui-tooltip>
    <button
      v-else
      type="button"
      :class="triggerClass"
      :aria-expanded="open"
      :data-nav-group="groupId"
      :data-group-active="active ? 'true' : undefined"
    >
      <span class="min-w-0 flex-1 truncate">{{ label }}</span>
      <web-ui-icon :icon="lucideChevronRight" :size="15" :class="arrowClass"></web-ui-icon>
    </button>

    <div slot="content" :class="collapsed ? 'w-full min-w-0 pt-1 pb-0.5' : 'w-full min-w-0 px-0.5 pt-1 pb-0.5'">
      <div
        :class="
          collapsed
            ? 'grid min-w-0 grid-cols-1 gap-1'
            : 'ml-2.5 grid min-w-0 grid-cols-1 gap-0.5 border-l border-(--wui-color-border) pl-2'
        "
      >
        <slot />
      </div>
    </div>
  </web-ui-collapse>
</template>
