<script setup lang="ts">
import type { WebUiDrawer, WebUiEditableText, WebUiEvent, WebUiTextarea } from '@greypan/web-ui'
import { lucideEllipsisVertical, lucideEye, lucideExternalLink, lucidePenLine, lucideTags } from '@greypan/web-ui/icons'
import { computed, ref, watch } from 'vue'

import type { ResourceSourceView, ResourceView } from '@/stores/library'

import {
  formatSize,
  formatTimestamp,
  resourceKindLabel,
  metadataLabelClass,
  metadataRowClass,
  metadataValueClass,
  sourceTypeDisplayLabel,
  sourceTypeIcon,
  tagChipClass,
  tagClass
} from './presentation'
import { DRAWER_TITLE_EDITOR_KEY, type NameEditorRef } from './rename'

const props = defineProps<{
  open: boolean
  resource: ResourceView | null
  mobile: boolean
  editingNameKey: string | null
  editorRef: NameEditorRef
  replacingSourceIds: string[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  startRename: [resource: ResourceView]
  renameChange: [resource: ResourceView, event: WebUiEvent<WebUiEditableText, 'change'>]
  cancelRename: []
  noteChange: [resource: ResourceView, note: string, editor: WebUiTextarea | null]
  editTags: [resource: ResourceView]
  delete: [resource: ResourceView]
  preview: [resource: ResourceView]
  recover: [source: ResourceSourceView]
}>()

const DRAWER_TITLE_NAME_CLASS =
  'min-w-0 font-semibold text-[17px] leading-snug text-[#22212a] wrap-break-word dark:text-(--wui-color-text)'
const placement = computed(() => (props.mobile ? 'bottom' : 'right'))
const unavailableSource = computed(() => props.resource?.sources.find(source => !source.available) ?? null)
const editingTitle = computed(() => props.editingNameKey === DRAWER_TITLE_EDITOR_KEY)

function handleOpenChange(event: WebUiEvent<WebUiDrawer, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  emit('update:open', event.detail.open)
}

function handleTitleChange(event: WebUiEvent<WebUiEditableText, 'change'>) {
  if (props.resource) emit('renameChange', props.resource, event)
}

/*
 * 待存备注：null 表示没有未提交的输入。
 *
 * 关闭抽屉时页面同步把 activeResourceId 清空，下一个 patch 就会移除仍在聚焦的
 * textarea；从文档里摘掉一个聚焦元素不会派发 blur，`@change` 永远不会来。所以这里
 * 在 input 时就把值留下来，卸载前用 watcher 补一次提交——不能用模板 ref，Vue 会在
 * pre-flush watcher 之前就把它清空（实测 hasEditor 已是 false）。鼠标路径（点遮罩、
 * 点关闭、点工具栏）都先 blur，所以只有键盘会丢。
 */
const pendingNote = ref<string | null>(null)

function handleNoteInput(event: WebUiEvent<WebUiTextarea, 'input'>) {
  pendingNote.value = event.currentTarget.value
}

function handleNoteChange(event: WebUiEvent<WebUiTextarea, 'change'>) {
  if (!props.resource) return
  pendingNote.value = null
  emit('noteChange', props.resource, event.currentTarget.value, event.currentTarget)
}

watch(
  () => props.resource,
  (next, previous) => {
    if (!previous || pendingNote.value === null) return
    // 同一条资源被 store 回写（保存成功、打标签等）也会走到这里，那不是切换也不是关闭。
    if (next && next.id === previous.id) return
    const note = pendingNote.value
    pendingNote.value = null
    if (note === previous.note) return
    // 字段已随 patch 卸载，没有可写回的编辑器；失败由 runtimeError 呈现。
    emit('noteChange', previous, note, null)
  },
  { flush: 'pre' }
)

function restoreResource() {
  if (unavailableSource.value) emit('recover', unavailableSource.value)
}
</script>

<template>
  <web-ui-drawer
    :open="open"
    :placement="placement"
    dialog-label="资源详情"
    draggable
    controlled
    class="max-[640px]:[--wui-drawer-height:80vh] max-[640px]:[--wui-drawer-inset:0px] max-[640px]:[--wui-drawer-radius:28px_28px_0_0] max-[640px]:[--wui-drawer-content-padding:0px] [--wui-drawer-width:min(640px,max(60vw,320px))]"
    @open-change="handleOpenChange"
  >
    <div
      v-if="resource"
      class="grid gap-5 max-[640px]:h-(--wui-drawer-height) max-[640px]:overflow-y-auto max-[640px]:p-5"
    >
      <h2 class="group/title flex items-center gap-3 min-h-9 m-0">
        <web-ui-editable-text
          v-if="editingTitle"
          :ref="editorRef"
          :value="resource.title"
          :class="DRAWER_TITLE_NAME_CLASS"
          class="caret-(--wui-color-accent,#08f)"
          :aria-label="`修改 ${resource.title} 的标题`"
          @click.stop
          @change="handleTitleChange"
          @cancel="emit('cancelRename')"
        />
        <span v-else :class="DRAWER_TITLE_NAME_CLASS">
          {{ resource.title }}
        </span>
        <web-ui-button
          v-if="!editingTitle"
          class="shrink-0"
          icon
          variant="ghost"
          size="22"
          aria-label="重命名"
          @click="emit('startRename', resource)"
        >
          <web-ui-icon :icon="lucidePenLine" :size="13" />
        </web-ui-button>
      </h2>

      <web-ui-button-group class="self-start">
        <web-ui-button
          v-if="resource.available"
          class="[--wui-button-color:var(--wui-color-accent,#08f)]"
          @click="emit('preview', resource)"
        >
          <web-ui-icon slot="prefix" :icon="lucideEye" :size="14" />
          预览
        </web-ui-button>
        <web-ui-dropdown v-if="resource.available" placement="bottom-start">
          <web-ui-button slot="trigger">
            打开方式
            <web-ui-icon slot="suffix" :icon="lucideEllipsisVertical" :size="14" />
          </web-ui-button>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" :icon="lucideExternalLink" :size="14" />
            系统默认应用
          </web-ui-dropdown-item>
          <web-ui-dropdown-item>
            <web-ui-icon slot="prefix" :icon="lucideExternalLink" :size="14" />
            预览
          </web-ui-dropdown-item>
        </web-ui-dropdown>
        <web-ui-button
          v-if="!resource.available"
          :disabled="!unavailableSource"
          :loading="replacingSourceIds.includes(unavailableSource?.id ?? '')"
          @click="restoreResource"
        >
          找回资源
        </web-ui-button>
        <web-ui-button class="[--wui-button-color:var(--wui-color-danger,#ef4444)]" @click="emit('delete', resource)">
          删除
        </web-ui-button>
      </web-ui-button-group>

      <div class="flex flex-wrap items-center gap-1.5">
        <span v-for="tagName in resource.tagNames" :key="tagName" :class="[tagChipClass, tagClass(tagName)]">
          {{ tagName }}
        </span>
        <web-ui-tooltip content="编辑标签" placement="top">
          <web-ui-button
            class="[--wui-button-color:var(--wui-color-accent,#08f)]"
            icon
            variant="ghost"
            size="22"
            aria-label="编辑标签"
            @click="emit('editTags', resource)"
          >
            <web-ui-icon :icon="lucideTags" :size="13" />
          </web-ui-button>
        </web-ui-tooltip>
      </div>

      <div
        class="mt-2 overflow-hidden rounded-3xl bg-white shadow-[0_0_0_0.5px_rgb(0_0_0/0.08),0_1px_3px_rgb(0_0_0/0.06)] dark:bg-(--wui-color-surface-raised) dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.12)]"
      >
        <div v-for="itemSource in resource.sources" :key="itemSource.id" :class="metadataRowClass" class="items-start">
          <span class="flex min-w-0 flex-[1_1_auto] items-start gap-2.5">
            <web-ui-icon
              :icon="sourceTypeIcon(itemSource)"
              :size="15"
              class="mt-0.5 shrink-0 text-[#8a8a94] dark:text-(--wui-color-text-secondary)"
            />
            <span class="grid min-w-0 flex-[1_1_auto] gap-0.5">
              <span class="text-[13px] font-medium leading-5 text-[#22212a] dark:text-(--wui-color-text)">
                {{ sourceTypeDisplayLabel(itemSource) }}
              </span>
              <span
                v-if="itemSource.location"
                class="block min-w-0 truncate text-xs leading-5"
                :class="
                  itemSource.type === 'url' ? 'text-(--wui-color-accent,#08f)' : 'text-[#78716c] dark:text-[#a8a29e]'
                "
                :title="itemSource.location"
              >
                {{ itemSource.location }}
              </span>
            </span>
          </span>
          <span class="flex shrink-0 items-center gap-1.5">
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-xs leading-none"
              :class="
                itemSource.available
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200'
                  : 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-200'
              "
            >
              {{ itemSource.available ? '正常' : '已失效' }}
            </span>
          </span>
        </div>

        <div :class="metadataRowClass">
          <span :class="metadataLabelClass">类型</span>
          <span :class="metadataValueClass">{{ resourceKindLabel(resource.kind) }}</span>
        </div>
        <div v-if="resource.sizeBytes !== null" :class="metadataRowClass">
          <span :class="metadataLabelClass">大小</span>
          <span :class="[metadataValueClass, 'tabular-nums']">{{ formatSize(resource.sizeBytes) }}</span>
        </div>
        <div :class="metadataRowClass">
          <span :class="metadataLabelClass">创建于</span>
          <time :class="[metadataValueClass, 'tabular-nums']">{{ formatTimestamp(resource.createdAt) }}</time>
        </div>
        <div :class="metadataRowClass">
          <span :class="metadataLabelClass">最后修改于</span>
          <time :class="[metadataValueClass, 'tabular-nums']">{{ formatTimestamp(resource.updatedAt) }}</time>
        </div>
      </div>

      <!--
        空备注同样渲染输入框：原先的 v-if="resource.note" 只在已有备注时挂载，字段一旦
        可编辑就必须常驻，否则没有备注的资源永远没有入口去写。换行、滚动与 autosize
        高度仍由组件统一管，Drawer 不自己算 line-height。
      -->
      <div class="grid gap-1.5">
        <span class="text-xs font-medium text-(--wui-color-text-secondary)">备注</span>
        <web-ui-textarea
          :value="resource.note"
          :rows="2"
          autosize
          full
          placeholder="添加备注"
          aria-label="备注"
          @input="handleNoteInput($event)"
          @change="handleNoteChange($event)"
        />
      </div>
    </div>
  </web-ui-drawer>
</template>
