<script setup lang="ts">
import type { Tag } from '@bindings/weave/models'
import { lucideChevronRight } from '@greypan/web-ui/icons'
import { computed } from 'vue'

const props = defineProps<{
  tag: Tag
  depth: number
  selectedPath: string
  expanded: Set<string>
}>()

const emit = defineEmits<{
  select: [path: string]
  toggle: [path: string]
}>()

const children = computed(() => (props.tag.children ?? []).filter((c): c is Tag => c !== null))
const hasChildren = computed(() => children.value.length > 0)
const isOpen = computed(() => props.expanded.has(props.tag.path))
const indent = computed(() => 8 + props.depth * 18)
</script>

<template>
  <div>
    <div class="group flex items-center gap-0.5 rounded" :style="{ paddingLeft: `${indent}px` }">
      <web-ui-button
        v-if="hasChildren"
        icon
        variant="ghost"
        :aria-label="isOpen ? '折叠子标签' : '展开子标签'"
        @click="emit('toggle', tag.path)"
      >
        <web-ui-icon
          :icon="lucideChevronRight"
          :size="14"
          :class="{ 'rotate-90': isOpen }"
          class="transition-transform"
        />
      </web-ui-button>
      <web-ui-button v-else icon variant="ghost" disabled tabindex="-1" aria-hidden="true"></web-ui-button>
      <web-ui-button
        variant="ghost"
        full
        :class="{ 'text-[var(--wui-color-primary)]': selectedPath === tag.path }"
        @click="emit('select', tag.path)"
      >
        <span class="truncate">{{ tag.name }}</span>
        <span slot="suffix" class="text-[10px] text-[var(--wui-color-text-muted)]">{{ tag.itemCount }}</span>
      </web-ui-button>
    </div>
    <template v-if="hasChildren && isOpen">
      <TagTreeNode
        v-for="child in children"
        :key="child.id"
        :tag="child"
        :depth="depth + 1"
        :selected-path="selectedPath"
        :expanded="expanded"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
      />
    </template>
  </div>
</template>
