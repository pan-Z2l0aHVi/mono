<script setup lang="ts">
import type { WebUiDrawer, WebUiEvent } from '@greypan/web-ui'
import { computed } from 'vue'

import type { ResourceView } from '@/stores/library'

import { resourceIcon } from './presentation'

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
    class="max-[640px]:[--wui-drawer-height:80vh] max-[640px]:[--wui-drawer-inset:0px] max-[640px]:[--wui-drawer-radius:28px_28px_0_0] max-[640px]:[--wui-drawer-header-padding:0px] max-[640px]:[--wui-drawer-content-padding:0px] [--wui-drawer-width:max(60vw,320px)]"
    @open-change="handleOpenChange"
  >
    <h2
      v-if="resource"
      slot="header"
      class="m-0 w-full min-w-0 truncate px-12 text-center text-[17px] font-semibold leading-snug text-[#22212a] wrap-break-word dark:text-(--wui-color-text) max-[640px]:h-14"
    >
      {{ resource.title }}
    </h2>

    <div
      v-if="resource"
      class="grid gap-4 max-[640px]:h-[calc(var(--wui-drawer-height)-57px)] max-[640px]:overflow-y-auto max-[640px]:p-5"
    >
      <div class="flex items-center justify-center h-52 rounded-xl bg-[#f5f5f7] dark:bg-(--wui-color-surface-raised)">
        <web-ui-icon
          :icon="resourceIcon(resource.kind)"
          :size="40"
          class="text-[#c0c0c8] dark:text-(--wui-color-text-tertiary)"
        />
      </div>
    </div>
  </web-ui-drawer>
</template>
