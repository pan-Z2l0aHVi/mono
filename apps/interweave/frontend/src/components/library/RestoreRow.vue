<script setup lang="ts">
import { lucideFolderOpen, lucideLink, radixIconsReset } from '@greypan/web-ui/icons'

import type { ResourceKind, ResourceSourceView } from '@/stores/library'

import { resourceDialogRowClass } from './resourceDialogStyles'
import ResourceThumbnail from './ResourceThumbnail.vue'
import type { LibraryRestoreQueueItem } from './restore'

defineProps<{
  item: LibraryRestoreQueueItem
  pending: boolean
  location: string
  preview?: { kind: ResourceKind; mediaUrl: string | null }
  source: ResourceSourceView | null
  locked: boolean
  active: boolean
}>()
const emit = defineEmits<{ prepare: []; cancelPrepare: [] }>()
</script>

<template>
  <li :class="resourceDialogRowClass">
    <ResourceThumbnail
      :kind="!pending && preview ? preview.kind : item.resourceKind"
      :source="pending ? null : source"
      :media-url="pending ? null : (preview?.mediaUrl ?? null)"
    />
    <div class="grid min-w-0 flex-[1_1_auto] grid-cols-[minmax(0,1fr)] gap-1">
      <span
        class="min-w-0 truncate text-[14px] font-medium leading-[1.35] text-[#22212a] dark:text-(--wui-color-text)"
        :title="item.resourceTitle"
        >{{ item.resourceTitle }}</span
      >
      <span
        class="block min-w-0 truncate text-xs leading-4 text-[#6a6a6a] dark:text-(--wui-color-text-secondary)"
        :title="pending ? item.location : location"
        >{{ pending ? (item.kind === 'url' ? '原链接' : '原位置') : '新位置' }}：{{
          pending ? item.location : location
        }}</span
      >
      <span v-if="active" class="text-xs text-(--wui-color-text-secondary)">处理中</span>
    </div>
    <web-ui-tooltip :content="pending ? '手动选择' : '撤回'" placement="bottom">
      <web-ui-button
        icon
        variant="ghost"
        size="28"
        :disabled="locked"
        :aria-label="`${pending ? '手动选择' : '撤回'} ${item.resourceTitle}`"
        @click="pending ? emit('prepare') : emit('cancelPrepare')"
      >
        <web-ui-icon
          :icon="pending ? (item.kind === 'file' ? lucideFolderOpen : lucideLink) : radixIconsReset"
          :size="16"
        />
      </web-ui-button>
    </web-ui-tooltip>
  </li>
</template>
