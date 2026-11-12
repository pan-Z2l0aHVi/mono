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
    <div v-if="resource" class="detail-drawer">
      <div class="detail-top">资源详情</div>
      <div class="detail-scroll">
        <div class="detail-profile">
          <ResourceThumbnail
            class="!size-[76px] !rounded-[18px]"
            :kind="resource.kind"
            :source="resource.preferred"
            :media-url="resource.preferred?.mediaUrl ?? null"
            :thumbnail-url="resource.preferred?.thumbnailUrl ?? null"
          />
          <div class="detail-profile-content">
            <web-ui-editable-text
              :ref="editorRef"
              :value="resource.title"
              :disabled="!editingTitle"
              class="detail-title"
              :aria-label="`修改 ${resource.title} 的标题`"
              @click.stop
              @change="handleTitleChange"
              @cancel="emit('cancelRename')"
            />
            <web-ui-button
              class="detail-edit-name"
              :class="{ 'detail-rename-hidden': editingTitle }"
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
        <div class="detail-quick">
          <template v-if="resource.available">
            <button class="detail-quick-button" @click="emit('preview', resource)"><i>▶</i>预览</button>
            <web-ui-dropdown class="detail-quick-dropdown" placement="bottom-start">
              <button slot="trigger" class="detail-quick-button">
                <web-ui-icon :icon="arrowUpRight" :size="18" />打开
              </button>
              <web-ui-dropdown-item @click="emit('openDefault', resource)">
                <web-ui-icon slot="prefix" :icon="lucideExternalLink" :size="14" />{{
                  defaultOpenWithName || '系统默认应用'
                }}
              </web-ui-dropdown-item>
            </web-ui-dropdown>
          </template>
          <button
            v-else
            class="detail-quick-button"
            :disabled="!unavailableSource || replacingSourceIds.includes(unavailableSource?.id ?? '')"
            @click="restoreResource"
          >
            <web-ui-icon :icon="lucideRefreshCw" :size="18" />找回资源
          </button>
        </div>
        <p class="detail-caption">来源</p>
        <div class="detail-group">
          <div v-for="itemSource in resource.sources" :key="itemSource.id" class="detail-source">
            <strong>{{ sourceTypeDisplayLabel(itemSource) }}</strong>
            <em :class="{ unavailable: !itemSource.available }">{{ itemSource.available ? '正常' : '已失效' }}</em>
            <small>{{ itemSource.location }}</small>
            <web-ui-tooltip
              v-if="itemSource.location"
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
                  <web-ui-icon :icon="akarIconsCircleCheck" :size="15" class="detail-copy-success" />
                </web-ui-svg-draw-lines>
                <web-ui-icon v-else :icon="lucideCopy" :size="15" />
              </web-ui-button>
            </web-ui-tooltip>
          </div>
        </div>
        <p class="detail-caption">详细信息</p>
        <div class="detail-group">
          <div class="detail-row">
            <span>类型</span><small>{{ resourceKindLabel(resource.kind) }}</small>
          </div>
          <div v-if="resource.sizeBytes !== null" class="detail-row">
            <span>大小</span><small>{{ formatSize(resource.sizeBytes) }}</small>
          </div>
          <div class="detail-row">
            <span>创建于</span><small>{{ formatDate(resource.createdAt) }}</small>
          </div>
          <div class="detail-row">
            <span>最后修改</span><small>{{ formatDate(resource.updatedAt) }}</small>
          </div>
        </div>
        <p class="detail-caption">标签</p>
        <div class="detail-group detail-tags">
          <div class="detail-tags-list">
            <span v-for="tag in resource.tags" :key="tag.id" :class="[tagChipClass, tagClass(tag.color)]">{{
              tag.name
            }}</span>
          </div>
          <web-ui-button
            class="detail-edit-tags"
            variant="ghost"
            size="24"
            aria-label="编辑标签"
            @click="emit('editTags', resource)"
            >编辑</web-ui-button
          >
        </div>
        <p class="detail-caption">备注</p>
        <web-ui-textarea
          class="detail-note"
          :value="resource.note"
          :rows="2"
          autosize
          full
          placeholder="添加备注"
          aria-label="备注"
          @input="handleNoteInput($event)"
          @change="handleNoteChange($event)"
        />
        <div class="detail-group detail-delete"><button @click="emit('delete', resource)">删除资源</button></div>
      </div>
    </div>
  </web-ui-drawer>
</template>

<style scoped>
.detail-drawer {
  font:
    var(--wui-font-size, 14px) / 1.4 system-ui,
    sans-serif;
  color: var(--wui-color-text, #1c1c1e);
  text-align: left;
}

.detail-top {
  font-size: 16px;
  font-weight: 600;
}

.detail-scroll {
  padding-bottom: 16px;
}

.detail-profile {
  display: flex;
  gap: 15px;
  align-items: center;
  padding: 16px 0;
}

.detail-profile-content {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.detail-title {
  font-size: 14px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.detail-rename-hidden {
  visibility: hidden;
}

.detail-edit-name,
.detail-edit-tags {
  --wui-button-color: #007aff;
  --wui-font-size: 14px;
}

.detail-edit-name {
  justify-self: start;
  margin-left: -8px;
}

.detail-quick {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 22px;
}

.detail-quick-dropdown {
  min-width: 0;
}

.detail-quick-button {
  cursor: pointer;

  display: grid;
  flex: 1;
  gap: 3px;
  align-content: center;
  justify-items: center;

  box-sizing: border-box;
  width: 100%;
  height: 64px;
  padding: 8px;
  border: 0;
  border-radius: 18px;

  font: inherit;
  color: #007aff;

  background: var(--wui-color-surface, #fff);
}

.detail-quick-button i {
  font-size: 18px;
  font-style: normal;
}

.detail-quick-button:disabled {
  cursor: default;
  opacity: 0.4;
}

.detail-quick > .detail-quick-button:only-child {
  grid-column: 1 / -1;
}

@media (hover: hover) {
  .detail-quick-button:not(:disabled):hover {
    background: color-mix(in srgb, var(--wui-color-text, #1c1c1e) 5%, var(--wui-color-surface, #fff));
  }

  .detail-delete button:hover {
    background: rgb(0 0 0 / 0.05);
  }
}

.detail-quick-button:not(:disabled):active {
  background: color-mix(in srgb, var(--wui-color-text, #1c1c1e) 10%, var(--wui-color-surface, #fff));
}

.detail-caption {
  margin: 20px 14px 6px;
  font-size: 12px;
  color: #777780;
}

.detail-group {
  overflow: hidden;
  margin-bottom: 16px;
  border-radius: 18px;
  background: var(--wui-color-surface, #fff);
}

.detail-source {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 36px;
  gap: 5px 8px;
  align-items: center;

  padding: 10px 15px;
}

.detail-source + .detail-source {
  border-top: 1px solid var(--wui-color-border, rgb(0 0 0 / 0.1));
}

.detail-source strong {
  font-size: 14px;
  font-weight: 400;
}

.detail-source em {
  justify-self: center;
  font-size: 12px;
  font-style: normal;
  color: #18895e;
}

.detail-source em.unavailable {
  color: var(--wui-color-danger, #e43535);
}

.detail-source small {
  min-width: 0;
  color: #777780;
  overflow-wrap: anywhere;
}

.detail-source web-ui-tooltip {
  justify-self: end;
}

.detail-copy-success {
  color: var(--wui-color-success);
}

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

.detail-row {
  position: relative;

  display: flex;
  gap: 10px;
  align-items: center;

  box-sizing: border-box;
  min-height: 36px;
  padding: 7px 15px;

  font-size: 12px;
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

.detail-row span {
  flex: 1;
  font-size: 14px;
}

.detail-row small {
  font-size: inherit;
  color: #8a8a94;
  text-align: right;
}

.detail-tags {
  display: flex;
  gap: 6px;
  align-items: center;

  box-sizing: border-box;
  min-height: 36px;
  padding: 4px 15px;
}

.detail-tags-list {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 6px;

  min-width: 0;
}

.detail-note {
  --wui-shadow-glass: 0 0 0 transparent;
  --wui-color-accent: transparent;
  --wui-color-focus-ring: transparent;
  --wui-color-glass-ring: transparent;
  --wui-color-glass-ring-shade: transparent;
  --wui-color-glass-ring-sheen: transparent;
  --wui-color-glass-highlight: transparent;
  margin-bottom: 16px;
}

.detail-delete button {
  cursor: pointer;

  width: 100%;
  height: 36px;
  padding: 0 15px;
  border: 0;

  font: inherit;
  color: #e43535;
  text-align: left;

  background: transparent;
}

.detail-delete button:active {
  background: rgb(0 0 0 / 0.1);
}
</style>
