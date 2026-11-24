<script setup lang="ts">
import { formatWindowsAccelerator } from '@/services/menu/tree'

import type { MenuItem } from '../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/menu'

defineOptions({ name: 'WindowsMenuItems' })

defineProps<{
  items: readonly MenuItem[]
}>()

const emit = defineEmits<{
  select: [item: MenuItem]
}>()
</script>

<template>
  <template v-for="(item, index) in items" :key="item.separator ? `sep-${index}` : `${item.label}-${index}`">
    <web-ui-dropdown-divider v-if="item.separator" />
    <web-ui-dropdown-item v-else-if="item.children?.length" submenu :disabled="item.disabled || undefined">
      {{ item.label }}
      <WindowsMenuItems :items="item.children" @select="emit('select', $event)" />
    </web-ui-dropdown-item>
    <web-ui-dropdown-item v-else :disabled="item.disabled || undefined" @click="!item.disabled && emit('select', item)">
      {{ item.label }}
      <span v-if="item.accelerator" slot="suffix" class="ml-4 font-mono text-[11px] text-(--wui-color-text-secondary)">
        {{ formatWindowsAccelerator(item.accelerator) }}
      </span>
    </web-ui-dropdown-item>
  </template>
</template>
