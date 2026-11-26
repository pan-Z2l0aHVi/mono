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
  itemClass: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

// 仅在分组收起且包含当前激活子路由时高亮一级菜单，避免与展开后的激活子项同时出现双高亮。
const isSelected = computed(() => Boolean(props.active && !props.open))

const triggerClass = computed(() => [
  'demo-nav-link',
  props.itemClass,
  props.collapsed ? 'w-9 justify-center' : 'w-full min-w-0 justify-between',
  isSelected.value ? '' : 'hover:bg-[#1b1b30]/4 dark:hover:bg-white/6'
])

const arrowClass = computed(() => [
  'shrink-0 text-(--wui-color-text-secondary) transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
  props.open ? 'rotate-90' : ''
])

function onOpenChange(event: WebUiEvent<WebUiCollapse, 'open-change'>) {
  // 侧边栏收起态下 trigger 内嵌套了 web-ui-tooltip，tooltip 的 hover 也会冒泡 open-change；
  // 只采信当前 collapse 自身的事件，确保收起态依旧仅由 click 切换展开/收起。
  if (event.target !== event.currentTarget) return
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
        :data-active="isSelected ? 'true' : undefined"
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
      :data-active="isSelected ? 'true' : undefined"
      :data-nav-group="groupId"
      :data-group-active="active ? 'true' : undefined"
    >
      <span class="min-w-0 flex-1 truncate text-sm">{{ label }}</span>
      <web-ui-icon :icon="lucideChevronRight" :size="15" :class="arrowClass"></web-ui-icon>
    </button>

    <div slot="content" class="w-full min-w-0 pt-1">
      <div :class="collapsed ? 'grid min-w-0 grid-cols-1 gap-1' : 'grid min-w-0 grid-cols-1 gap-1 pl-3'">
        <slot />
      </div>
    </div>
  </web-ui-collapse>
</template>
