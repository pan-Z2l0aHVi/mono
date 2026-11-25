<script setup lang="ts">
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

const panelId = computed(() => `nav-submenu-${props.groupId}`)

function toggle() {
  emit('update:open', !props.open)
}
</script>

<template>
  <div role="group" :aria-labelledby="`nav-trigger-${groupId}`" class="grid gap-1">
    <div v-if="collapsed" class="mx-2 my-1 h-px bg-(--wui-color-border)" aria-hidden="true"></div>
    <button
      :id="`nav-trigger-${groupId}`"
      type="button"
      :class="[
        'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors',
        'hover:bg-(--wui-color-hover) focus-visible:outline-2 focus-visible:outline-(--wui-color-accent)',
        active ? 'text-(--wui-color-accent)' : 'text-(--wui-color-text)',
        collapsed ? 'sr-only' : ''
      ]"
      :aria-expanded="open"
      :aria-controls="panelId"
      :data-nav-group="groupId"
      :data-group-active="active ? 'true' : undefined"
      @click="toggle"
    >
      <span class="truncate">{{ label }}</span>
      <web-ui-icon
        :icon="lucideChevronRight"
        :size="15"
        :class="[
          'shrink-0 text-(--wui-color-text-secondary) transition-transform duration-150',
          open ? 'rotate-90' : ''
        ]"
      ></web-ui-icon>
    </button>

    <div
      v-show="collapsed || open"
      :id="panelId"
      :class="collapsed ? 'grid gap-1' : 'ml-2.5 grid gap-0.5 border-l border-(--wui-color-border) pl-2'"
    >
      <slot />
    </div>
  </div>
</template>
