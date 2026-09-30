<script setup lang="ts">
import type { WebUiCheckbox, WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import { lucideTriangleAlert } from '@greypan/web-ui/icons'
import { computed } from 'vue'

import type { ResourceView } from '@/stores/library'

import {
  fileExtension,
  formatSize,
  formatTimestamp,
  primarySource,
  sourceTypeIcon,
  sourceTypeLabel,
  tagChipClass,
  tagClass
} from './presentation'
import type { NameEditorRef } from './rename'
import ResourceThumbnail from './ResourceThumbnail.vue'

const props = defineProps<{
  resource: ResourceView
  mediaUrl: string | null
  active: boolean
  checked: boolean
  checkedAbove: boolean
  checkedBelow: boolean
  selectionMode: boolean
  editingNameKey: string | null
  editorRef: NameEditorRef
}>()

const emit = defineEmits<{
  select: [resource: ResourceView]
  contextmenu: [resource: ResourceView, event: MouseEvent]
  toggle: [resourceId: string]
  renameChange: [resource: ResourceView, event: WebUiEvent<WebUiEditableText, 'change'>]
  cancelRename: []
}>()

const source = computed(() => primarySource(props.resource))
const size = computed(() => formatSize(props.resource.sizeBytes))
const resourceNameClass = computed(() => [
  'text-sm font-medium leading-snug wrap-break-word line-clamp-2 max-w-[75%] max-[640px]:max-w-full',
  props.resource.available
    ? 'text-[#22212a] dark:text-(--wui-color-text)'
    : 'text-[#b0b0b8] line-through dark:text-(--wui-color-text-disabled)'
])

// 相邻选中行连成一片：谁挨着同样选中的邻居，就交出那一侧的两个直角。四条分支都写成
// 完整字面量，Tailwind 的扫描器才认得出来（模板拼接出来的类名扫不到）。
const rowRadiusClass = computed(() => {
  if (!props.checked) return 'rounded-[14px]'
  if (props.checkedAbove && props.checkedBelow) return 'rounded-none'
  if (props.checkedAbove) return 'rounded-b-[14px] rounded-t-none'
  if (props.checkedBelow) return 'rounded-t-[14px] rounded-b-none'
  return 'rounded-[14px]'
})

function handleChange(_event: WebUiEvent<WebUiCheckbox, 'change'>) {
  emit('toggle', props.resource.id)
}

function handleNameChange(event: WebUiEvent<WebUiEditableText, 'change'>) {
  emit('renameChange', props.resource, event)
}
</script>

<template>
  <!--
    tabindex="0" 把行放进 Tab 序列，focus 环由 assets/global.css 的页面级规则画：那条规则
    命中 [tabindex]:not([tabindex='-1'])，颜色与 web-ui 组件的 focus 语言一致。

    过渡只列 background-color（与 AppNav 的 navItemClass 同一个理由）：Tailwind 的
    transition-colors 包含 outline-color，而它的初始计算值是 currentcolor——从祖先继承来的
    近黑文字色。留着它，Tab 过去时浏览器会把 focus 环从近黑补间 100ms 到目标浅蓝，
    表现为边缘先黑一下再变蓝。行上真正会变的只有背景色。

    别在这里加本地的 focus-visible:outline-* 覆盖：那条页面规则写在 `@import 'tailwindcss'`
    之后、不属于任何 @layer，而 Tailwind 工具类在 @layer utilities 里——层外样式优先级更高，
    本地覆盖会被静默压掉（实测过：outline-offset 写了 -2px，读出来仍是页面的 2px）。
  -->
  <div
    class="group relative flex items-center gap-3 px-4 max-[640px]:px-2 py-3 transition-[background-color] duration-100"
    :class="[
      rowRadiusClass,
      checked
        ? 'bg-black/3.5 dark:bg-white/5'
        : active
          ? 'bg-black/5 dark:bg-white/8'
          : 'hover:bg-black/3.5 dark:hover:bg-white/5',
      resource.available ? '' : '[&>div]:opacity-60'
    ]"
    data-resource-row
    :data-resource-id="resource.id"
    tabindex="0"
    @click="emit('select', resource)"
    @contextmenu="emit('contextmenu', resource, $event)"
  >
    <web-ui-checkbox
      v-if="selectionMode"
      class="shrink-0"
      :checked="checked"
      :aria-label="`选择「${resource.title}」`"
      @click.stop
      @change="handleChange"
    />

    <ResourceThumbnail :kind="resource.kind" :source="source" :media-url="mediaUrl" />

    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div class="flex min-w-0 items-center gap-1.5">
        <span v-if="editingNameKey !== resource.id" :class="resourceNameClass">
          {{ resource.title }}
        </span>
        <web-ui-editable-text
          v-else
          :ref="editorRef"
          :value="resource.title"
          :class="resourceNameClass"
          class="caret-(--wui-color-accent,#08f) select-text"
          :aria-label="`修改 ${resource.title} 的标题`"
          @click.stop
          @change="handleNameChange"
          @cancel="emit('cancelRename')"
        />
        <web-ui-icon
          v-if="!resource.available"
          :icon="lucideTriangleAlert"
          :size="14"
          class="shrink-0 text-amber-500"
        />
      </div>

      <div
        class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#9a9aa4] dark:text-(--wui-color-text-secondary)"
      >
        <span v-if="source" class="inline-flex min-w-0 items-center gap-1">
          <web-ui-icon
            :icon="sourceTypeIcon(source)"
            :size="12"
            class="shrink-0 text-[#bdbdc6] dark:text-(--wui-color-text-tertiary)"
          />
          <span>{{ sourceTypeLabel(source) }}</span>
        </span>
        <template v-if="source && fileExtension(source.location)">
          <span aria-hidden="true" class="text-[#d8d8de] dark:text-(--wui-color-text-tertiary)">·</span>
          <span>{{ fileExtension(source.location) }}</span>
        </template>
        <template v-if="size">
          <span aria-hidden="true" class="text-[#d8d8de] dark:text-(--wui-color-text-tertiary)">·</span>
          <span>{{ size }}</span>
        </template>
        <span aria-hidden="true" class="text-[#d8d8de] dark:text-(--wui-color-text-tertiary)">·</span>
        <time :datetime="new Date(resource.createdAt).toISOString()">{{ formatTimestamp(resource.createdAt) }}</time>
        <span
          v-if="resource.sources.length > 1"
          aria-hidden="true"
          class="text-[#d8d8de] dark:text-(--wui-color-text-tertiary)"
        >
          ·
        </span>
        <span v-if="resource.sources.length > 1">{{ resource.sources.length }} 个来源</span>
      </div>
    </div>

    <div v-if="resource.tags.length" class="flex max-w-[25%] flex-wrap justify-end gap-1.5">
      <span v-for="tag in resource.tags" :key="tag.id" :class="[tagChipClass, tagClass(tag.color)]">
        {{ tag.name }}
      </span>
    </div>
  </div>
</template>
