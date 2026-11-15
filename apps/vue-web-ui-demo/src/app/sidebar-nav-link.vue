<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps<{
  to: string
  label: string
  title?: string
  active: boolean
  collapsed: boolean
  itemClass: string
}>()

const emit = defineEmits<{ navigate: [] }>()

// 折叠后侧栏内容宽 36px（60px 侧栏去掉 8px 外边距与两侧 8px 内边距）。tooltip 的 trigger
// 按内容收缩，链接不显式定宽会被文字撑开，active 底色与点击区域也会跟着缩水。
const linkClass = computed(
  () =>
    props.itemClass +
    (props.collapsed ? ' w-9' : ' w-full') +
    (props.active ? '' : ' hover:bg-[#1b1b30]/4 dark:hover:bg-white/6')
)
</script>

<template>
  <web-ui-tooltip v-if="collapsed" :content="label" placement="right" portal>
    <RouterLink
      :to="to"
      :class="linkClass + ' justify-center'"
      :data-active="active"
      :aria-current="active ? 'page' : undefined"
      :aria-label="label"
      @click="emit('navigate')"
    >
      <span class="w-full truncate text-center text-sm">{{ label }}</span>
    </RouterLink>
  </web-ui-tooltip>
  <RouterLink
    v-else
    :to="to"
    :class="linkClass"
    :data-active="active"
    :aria-current="active ? 'page' : undefined"
    :aria-label="label"
    :title="title"
    @click="emit('navigate')"
  >
    <span class="min-w-0 flex-1 truncate text-sm">{{ label }}</span>
  </RouterLink>
</template>
