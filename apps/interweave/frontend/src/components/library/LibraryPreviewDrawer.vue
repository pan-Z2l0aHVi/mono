<script setup lang="ts">
import type { WebUiDrawer, WebUiEvent } from '@greypan/web-ui'
import { computed } from 'vue'

import type { ResourceView } from '@/stores/library'

import { resourceIcon, sourceTypeLabel, tagClass } from './presentation'

const props = defineProps<{
  open: boolean
  resource: ResourceView | null
  mobile: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const placement = computed(() => (props.mobile ? 'bottom' : 'right'))

function handleOpenChange(event: WebUiEvent<WebUiDrawer, 'open-change'>) {
  emit('update:open', event.detail.open)
}
</script>

<template>
  <web-ui-drawer
    :open="open"
    :placement="placement"
    dialog-label="资源预览"
    draggable
    controlled
    class="max-[640px]:[--wui-drawer-height:82vh] max-[640px]:[--wui-drawer-inset:0px] max-[640px]:[--wui-drawer-radius:28px_28px_0_0] max-[640px]:[--wui-drawer-header-padding:0px] max-[640px]:[--wui-drawer-content-padding:0px] [--wui-drawer-width:min(680px,max(62vw,360px))]"
    @open-change="handleOpenChange"
  >
    <h2
      v-if="resource"
      slot="header"
      class="m-0 w-full min-w-0 truncate px-12 text-center text-[17px] font-semibold wrap-break-word"
    >
      {{ resource.title }}
    </h2>

    <div
      v-if="resource"
      class="grid gap-4 max-[640px]:h-[calc(var(--wui-drawer-height)-57px)] max-[640px]:overflow-y-auto max-[640px]:p-5"
    >
      <div class="grid min-h-52 place-items-center rounded-lg bg-black/4 dark:bg-white/6">
        <div class="grid justify-items-center gap-3 px-6 text-center">
          <web-ui-icon :icon="resourceIcon(resource.kind)" :size="44" class="text-(--wui-color-text-tertiary)" />
          <web-ui-empty size="small" description="暂无可预览内容" />
        </div>
      </div>

      <div v-if="resource.preferred" class="grid min-w-0 gap-1">
        <span class="text-xs font-medium text-(--wui-color-text-secondary)">首选来源</span>
        <span class="text-xs text-(--wui-color-text-secondary)">{{ sourceTypeLabel(resource.preferred) }}</span>
        <span class="min-w-0 text-sm leading-6 wrap-break-word">{{ resource.preferred.location }}</span>
      </div>

      <div v-if="resource.tagNames.length" class="flex flex-wrap gap-1.5">
        <span
          v-for="tagName in resource.tagNames"
          :key="tagName"
          class="rounded-full px-2 py-0.5 text-xs"
          :class="tagClass(tagName)"
        >
          {{ tagName }}
        </span>
      </div>
    </div>
  </web-ui-drawer>
</template>
