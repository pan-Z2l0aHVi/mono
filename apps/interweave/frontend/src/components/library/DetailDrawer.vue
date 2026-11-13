<script setup lang="ts">
import { copyToClipboard } from '@greypan/browser-kit'
import type { WebUiDrawer, WebUiEditableText, WebUiEvent, WebUiTextarea } from '@greypan/web-ui'
import {
  akarIconsCircleCheck,
  lucideCopy,
  lucideExternalLink,
  lucidePenLine,
  lucideRefreshCw
} from '@greypan/web-ui/icons'
import { computed, onScopeDispose, ref, watch } from 'vue'

import type { ResourceSourceView, ResourceView } from '@/stores/library'

import { arrowUpRight } from './icons'
import {
  availableFileSource,
  fileManagerIcon,
  fileManagerLabel,
  formatSize,
  formatDate,
  resourceKindLabel,
  sourceTypeDisplayLabel,
  tagChipClass,
  tagClass
} from './presentation'
import { DRAWER_TITLE_EDITOR_KEY, type NameEditorRef } from './rename'
import ResourceThumbnail from './ResourceThumbnail.vue'

const props = defineProps<{
  open: boolean
  resource: ResourceView | null
  mobile: boolean
  editingNameKey: string | null
  editorRef: NameEditorRef
  replacingSourceIds: string[]
  resolveDefaultOpenWith: (resource: ResourceView) => Promise<string>
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
  openDefault: [resource: ResourceView]
  showInFileManager: [source: ResourceSourceView]
}>()
const placement = computed(() => (props.mobile ? 'bottom' : 'right'))
const unavailableSource = computed(() => props.resource?.sources.find(source => !source.available) ?? null)
const editingTitle = computed(() => props.editingNameKey === DRAWER_TITLE_EDITOR_KEY)

/*
 * 「打开方式」显示系统默认应用的真实名字。drawer 会切资源，异步查询用请求序号作废旧结果；
 * 名字只影响文案，查不到时回落通用文案，打开动作仍由父级交给系统默认关联。
 */
const defaultOpenWithName = ref('')
let defaultOpenWithRequest = 0

watch(
  () => [props.open, props.resource?.id] as const,
  ([open]) => {
    const request = ++defaultOpenWithRequest
    defaultOpenWithName.value = ''
    const resource = props.resource
    if (!open || !resource) return
    void props.resolveDefaultOpenWith(resource).then(name => {
      if (request !== defaultOpenWithRequest) return
      defaultOpenWithName.value = name
    })
  },
  { immediate: true }
)

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
 * 关闭 drawer 时页面同步把 activeResourceId 清空，下一个 patch 就会移除仍在聚焦的
 * textarea；从文档里摘掉一个聚焦元素不会派发 blur，`@change` 永远不会来。所以这里
 * 在 input 时就把值留下来，卸载前用 watcher 补一次提交——不能用模板 ref，Vue 会在
 * pre-flush watcher 之前就把它清空（实测 hasEditor 已是 false）。鼠标路径（点 backdrop、
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

const copiedLocation = ref<string | null>(null)
const copyRun = ref(0)
let copiedRevertTimer: ReturnType<typeof setTimeout> | undefined

function copyLocation(location: string) {
  void copyToClipboard(location)
  copiedLocation.value = location
  copyRun.value++
  // 同一个来源连点时不能让旧的 timer 提前把勾收回，连点不同来源时以最后一次为准。
  clearTimeout(copiedRevertTimer)
  copiedRevertTimer = setTimeout(() => {
    copiedLocation.value = null
  }, 1200)
}

onScopeDispose(() => clearTimeout(copiedRevertTimer))
</script>

<template>
  <web-ui-drawer
    page-shift
    :open="open"
    :placement="placement"
    aria-dialog-label="资源详情"
    draggable
    controlled
    class="[--wui-drawer-width:360px] mobile:[--wui-drawer-height:85vh] mobile:[--wui-drawer-inset:0px]"
    @open-change="handleOpenChange"
  >
    <div
      v-if="resource"
      class="detail-drawer text-left font-[system-ui,sans-serif] text-[length:var(--wui-font-size,14px)] leading-[1.4] text-(--wui-color-text,#1c1c1e)"
    >
      <div class="detail-top text-base font-semibold">资源详情</div>
      <div class="detail-scroll pb-4">
        <div class="detail-profile flex items-center gap-[15px] py-3">
          <ResourceThumbnail
            class="!size-[76px] !rounded-[18px]"
            :kind="resource.kind"
            :source="resource.preferred"
            :media-url="resource.preferred?.mediaUrl ?? null"
            :thumbnail-url="resource.preferred?.thumbnailUrl ?? null"
          />
          <div class="detail-profile-content grid min-w-0 gap-[5px]">
            <web-ui-editable-text
              :ref="editorRef"
              :value="resource.title"
              :disabled="!editingTitle"
              class="detail-title text-sm font-bold wrap-anywhere"
              :aria-label="`修改 ${resource.title} 的标题`"
              @click.stop
              @change="handleTitleChange"
              @cancel="emit('cancelRename')"
            />
            <web-ui-button
              class="detail-edit-name justify-self-start -ml-2 [--wui-button-color:#007aff] [--wui-font-size:14px]"
              :class="{ invisible: editingTitle }"
              :aria-hidden="editingTitle ? 'true' : undefined"
              :inert="editingTitle ? true : undefined"
              variant="ghost"
              size="24"
              aria-label="重命名"
              @click="emit('startRename', resource)"
            >
              <web-ui-icon slot="prefix" :icon="lucidePenLine" :size="14" />重命名
            </web-ui-button>
          </div>
        </div>
        <div class="detail-quick mb-3 grid grid-cols-2 gap-2.5">
          <template v-if="resource.available">
            <button
              class="detail-quick-button grid h-16 w-full flex-1 cursor-pointer box-border content-center justify-items-center gap-[3px] rounded-[18px] border-0 bg-(--wui-color-surface,#fff) p-2 text-[#007aff] [font:inherit] disabled:cursor-default disabled:opacity-40 enabled:hover:bg-[color-mix(in_srgb,var(--wui-color-text,#1c1c1e)_5%,var(--wui-color-surface,#fff))] enabled:active:bg-[color-mix(in_srgb,var(--wui-color-text,#1c1c1e)_10%,var(--wui-color-surface,#fff))]"
              @click="emit('preview', resource)"
            >
              <i class="text-lg not-italic">▶</i>预览
            </button>
            <web-ui-dropdown class="detail-quick-dropdown min-w-0" placement="bottom-start">
              <button
                slot="trigger"
                class="detail-quick-button grid h-16 w-full flex-1 cursor-pointer box-border content-center justify-items-center gap-[3px] rounded-[18px] border-0 bg-(--wui-color-surface,#fff) p-2 text-[#007aff] [font:inherit] disabled:cursor-default disabled:opacity-40 enabled:hover:bg-[color-mix(in_srgb,var(--wui-color-text,#1c1c1e)_5%,var(--wui-color-surface,#fff))] enabled:active:bg-[color-mix(in_srgb,var(--wui-color-text,#1c1c1e)_10%,var(--wui-color-surface,#fff))]"
              >
                <web-ui-icon :icon="arrowUpRight" :size="18" />打开
              </button>
              <web-ui-dropdown-item @click="emit('openDefault', resource)">
                <web-ui-icon slot="prefix" :icon="lucideExternalLink" :size="14" />{{
                  defaultOpenWithName || '系统默认应用'
                }}
              </web-ui-dropdown-item>
              <web-ui-dropdown-item
                v-if="availableFileSource(resource)"
                @click="emit('showInFileManager', availableFileSource(resource)!)"
              >
                <web-ui-icon slot="prefix" :icon="fileManagerIcon()" :size="14" />{{ fileManagerLabel() }}
              </web-ui-dropdown-item>
            </web-ui-dropdown>
          </template>
          <button
            v-else
            class="detail-quick-button grid h-16 w-full flex-1 cursor-pointer box-border content-center justify-items-center gap-[3px] rounded-[18px] border-0 bg-(--wui-color-surface,#fff) p-2 text-[#007aff] [font:inherit] disabled:cursor-default disabled:opacity-40 enabled:hover:bg-[color-mix(in_srgb,var(--wui-color-text,#1c1c1e)_5%,var(--wui-color-surface,#fff))] enabled:active:bg-[color-mix(in_srgb,var(--wui-color-text,#1c1c1e)_10%,var(--wui-color-surface,#fff))] col-span-full"
            :disabled="!unavailableSource || replacingSourceIds.includes(unavailableSource?.id ?? '')"
            @click="restoreResource"
          >
            <web-ui-icon :icon="lucideRefreshCw" :size="18" />找回资源
          </button>
        </div>
        <p class="detail-caption mx-3.5 mt-4 mb-1.5 text-xs text-[#777780]">来源</p>
        <div class="detail-group mb-3 overflow-hidden rounded-[18px] bg-(--wui-color-surface,#fff)">
          <div
            v-for="itemSource in resource.sources"
            :key="itemSource.id"
            class="detail-source grid grid-cols-[minmax(0,1fr)_36px] items-center gap-x-2 gap-y-[5px] px-[15px] py-2.5 [&+.detail-source]:border-t [&+.detail-source]:border-(--wui-color-border,rgba(0,0,0,0.1))"
          >
            <strong class="text-sm font-normal">{{ sourceTypeDisplayLabel(itemSource) }}</strong>
            <em
              class="justify-self-center text-xs not-italic"
              :class="itemSource.available ? 'text-[#18895e]' : 'text-(--wui-color-danger,#e43535)'"
              >{{ itemSource.available ? '正常' : '已失效' }}</em
            >
            <small
              class="min-w-0 wrap-anywhere text-[#777780]"
              :class="{ 'text-(--wui-color-accent)! underline': itemSource.type === 'url' }"
              >{{ itemSource.location }}</small
            >
            <web-ui-tooltip
              v-if="itemSource.location"
              class="justify-self-end"
              :content="copiedLocation === itemSource.location ? '已复制' : '复制路径'"
            >
              <web-ui-button
                class="detail-copy"
                icon
                variant="ghost"
                size="24"
                :aria-label="
                  copiedLocation === itemSource.location
                    ? `已复制 ${itemSource.location}`
                    : `复制 ${itemSource.location}`
                "
                @click="copyLocation(itemSource.location)"
              >
                <web-ui-svg-draw-lines
                  v-if="copiedLocation === itemSource.location"
                  :key="copyRun"
                  class="detail-copy-pop"
                  :duration="300"
                >
                  <web-ui-icon :icon="akarIconsCircleCheck" :size="15" class="text-(--wui-color-success)" />
                </web-ui-svg-draw-lines>
                <web-ui-icon v-else :icon="lucideCopy" :size="15" />
              </web-ui-button>
            </web-ui-tooltip>
          </div>
        </div>
        <p class="detail-caption mx-3.5 mt-4 mb-1.5 text-xs text-[#777780]">详细信息</p>
        <div class="detail-group mb-3 overflow-hidden rounded-[18px] bg-(--wui-color-surface,#fff)">
          <div class="detail-row relative box-border flex min-h-9 items-center gap-2.5 px-[15px] py-[7px] text-xs">
            <span class="flex-1 text-sm">类型</span
            ><small class="text-right text-[#8a8a94] [font-size:inherit]">{{ resourceKindLabel(resource.kind) }}</small>
          </div>
          <div
            v-if="resource.sizeBytes !== null"
            class="detail-row relative box-border flex min-h-9 items-center gap-2.5 px-[15px] py-[7px] text-xs"
          >
            <span class="flex-1 text-sm">大小</span
            ><small class="text-right text-[#8a8a94] [font-size:inherit]">{{ formatSize(resource.sizeBytes) }}</small>
          </div>
          <div class="detail-row relative box-border flex min-h-9 items-center gap-2.5 px-[15px] py-[7px] text-xs">
            <span class="flex-1 text-sm">创建于</span
            ><small class="text-right text-[#8a8a94] [font-size:inherit]">{{ formatDate(resource.createdAt) }}</small>
          </div>
          <div class="detail-row relative box-border flex min-h-9 items-center gap-2.5 px-[15px] py-[7px] text-xs">
            <span class="flex-1 text-sm">最后修改</span
            ><small class="text-right text-[#8a8a94] [font-size:inherit]">{{ formatDate(resource.updatedAt) }}</small>
          </div>
        </div>
        <p class="detail-caption mx-3.5 mt-4 mb-1.5 text-xs text-[#777780]">标签</p>
        <div
          class="detail-group mb-3 overflow-hidden rounded-[18px] bg-(--wui-color-surface,#fff) detail-tags flex min-h-9 box-border items-center gap-1.5 px-[15px] py-1"
        >
          <div class="detail-tags-list flex min-w-0 flex-1 flex-wrap gap-1.5">
            <span v-if="!resource.tags.length" class="text-xs text-(--wui-color-text-secondary)">暂未添加标签</span>
            <span v-for="tag in resource.tags" :key="tag.id" :class="[tagChipClass, tagClass(tag.color)]">{{
              tag.name
            }}</span>
          </div>
          <web-ui-button
            class="detail-edit-tags -mr-2 [--wui-button-color:#007aff] [--wui-font-size:14px]"
            variant="ghost"
            size="24"
            aria-label="编辑标签"
            @click="emit('editTags', resource)"
            >编辑</web-ui-button
          >
        </div>
        <p class="detail-caption mx-3.5 mt-4 mb-1.5 text-xs text-[#777780]">备注</p>
        <web-ui-textarea
          class="mb-3 [--wui-shadow-glass:0_0_0_transparent] [--wui-color-accent:transparent] [--wui-color-focus-ring:transparent] [--wui-color-glass-ring:transparent] [--wui-color-glass-ring-shade:transparent] [--wui-color-glass-ring-sheen:transparent] [--wui-color-glass-highlight:transparent]"
          :value="resource.note"
          :rows="2"
          autosize
          full
          placeholder="添加备注"
          aria-label="备注"
          @input="handleNoteInput($event)"
          @change="handleNoteChange($event)"
        />
        <div class="detail-group mb-3 overflow-hidden rounded-[18px] bg-(--wui-color-surface,#fff) detail-delete">
          <button
            class="h-9 w-full cursor-pointer border-0 bg-transparent px-[15px] text-left text-[#e43535] [font:inherit] hover:bg-black/5 active:bg-black/10"
            @click="emit('delete', resource)"
          >
            删除资源
          </button>
        </div>
      </div>
    </div>
  </web-ui-drawer>
</template>

<style scoped>
@keyframes detail-copy-pop {
  0% {
    transform: scale(0.75);
  }

  40% {
    transform: scale(2);
  }

  100% {
    transform: scale(1);
  }
}

.detail-copy-pop {
  animation: detail-copy-pop calc(var(--wui-duration-focus, 200ms) * 1.5) ease-out;
}

.detail-copy > web-ui-icon,
.detail-copy > .detail-copy-pop {
  transition: transform var(--wui-duration-press, 80ms) ease-out;
}

.detail-copy:active > web-ui-icon,
.detail-copy:active > .detail-copy-pop {
  transform: scale(0.75);
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  .detail-copy-pop {
    animation: none;
  }
}

.detail-row + .detail-row::before {
  content: '';

  position: absolute;
  top: 0;
  right: 15px;
  left: 15px;

  height: 1px;

  background: var(--wui-color-border, rgb(0 0 0 / 0.1));
}
</style>
