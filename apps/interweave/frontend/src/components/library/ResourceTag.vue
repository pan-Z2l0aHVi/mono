<script setup lang="ts">
import { heroiconsXMark16Solid } from '@greypan/web-ui/icons'

import type { TagColor } from '@/stores/library'

import { tagClass } from './presentation'

defineProps<{
  name: string
  color?: TagColor | string | null
  closable?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <span
    class="inline-flex h-[18px] min-w-[18px] items-center rounded-full px-2 text-xs leading-none whitespace-nowrap"
    :class="[tagClass(color), closable ? 'pr-0' : '']"
  >
    {{ name }}
    <web-ui-button
      v-if="closable"
      class="shrink-0 [--wui-button-color:currentColor]"
      icon
      variant="ghost"
      size="18"
      :disabled="disabled"
      :aria-label="`移除标签 ${name}`"
      @click="emit('close')"
    >
      <web-ui-icon :icon="heroiconsXMark16Solid" :size="10" />
    </web-ui-button>
  </span>
</template>
