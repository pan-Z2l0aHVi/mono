<script setup lang="ts">
import {
  imagePreview,
  type ImagePreviewHandle,
  type WebUiDialog,
  type WebUiEditableText,
  type WebUiEvent
} from '@greypan/web-ui'
import {
  lucideClipboardPaste,
  lucideInbox,
  lucidePenLine,
  lucidePlus,
  lucideTags,
  lucideTrash2,
  lucideUpload
} from '@greypan/web-ui/icons'
import { nextTick, onMounted, onScopeDispose, ref, watch, type ComponentPublicInstance } from 'vue'

import type { LibraryQueueItem } from '@/services/library'
import type { ResourceSourceView } from '@/stores/library'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

import LibraryResourceThumbnail from './LibraryResourceThumbnail.vue'
import { metadataRowClass, tagClass } from './presentation'
import type { NameEditorRef } from './rename'

const props = defineProps<{
  open: boolean
  queue: LibraryQueueItem[]
  busy: boolean
  error: string
  mobile: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  pickFiles: []
  requestFilePaths: []
  remove: [itemId: string]
  rename: [itemId: string, title: string]
  editTags: [item: LibraryQueueItem]
  submit: []
}>()

const dragActive = ref(false)
const editingItemId = ref<string | null>(null)
const nameEditors = new Map<string, WebUiEditableText>()
let pendingImagePreview: ImagePreviewHandle | null = null

watch(
  () => props.open,
  open => {
    if (!open) {
      closePendingImagePreview()
      return
    }
    dragActive.value = false
    editingItemId.value = null
  }
)

function handleOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  emit('update:open', event.detail.open)
}

function handleDrop() {
  dragActive.value = false
}

function handlePaste(event: ClipboardEvent) {
  if (!props.open) return
  if (isEditableTarget(event.target)) return
  emit('requestFilePaths')
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || Boolean(target.closest('input, textarea, select, [contenteditable="true"]')))
  )
}

onMounted(() => {
  window.addEventListener('paste', handlePaste)
})
onScopeDispose(() => {
  window.removeEventListener('paste', handlePaste)
  closePendingImagePreview()
})

function isImagePreviewItem(item: LibraryQueueItem): item is LibraryQueueItem & { mediaUrl: string } {
  return item.resourceKind === ResourceKind.ResourceKindImage && Boolean(item.mediaUrl)
}

function closePendingImagePreview() {
  const handle = pendingImagePreview
  pendingImagePreview = null
  handle?.close()
}

function openImagePreview(item: LibraryQueueItem, event: Event) {
  if (!isImagePreviewItem(item)) return
  // imagePreview 在打开时复制 images 且句柄不支持替换；预览作为顶层模态阻止底层队列操作，
  // 因此本次使用快照，关闭后的下一次打开再从最新队列重建集合。
  const entries = props.queue.flatMap(candidate =>
    isImagePreviewItem(candidate) ? [{ item: candidate, image: { src: candidate.mediaUrl, alt: candidate.title } }] : []
  )
  const index = entries.findIndex(candidate => candidate.item.id === item.id)
  if (index < 0) return

  closePendingImagePreview()
  const handle = imagePreview({
    images: entries.map(candidate => candidate.image),
    index,
    target: event.currentTarget instanceof Element ? event.currentTarget : undefined,
    toolbar: !props.mobile,
    swipe: props.mobile
  })
  pendingImagePreview = handle
  void handle.closed.then(() => {
    if (pendingImagePreview === handle) pendingImagePreview = null
  })
}

function setNameEditorRef(itemId: string): NameEditorRef {
  return element => {
    if (element instanceof Element) nameEditors.set(itemId, element as WebUiEditableText)
    else nameEditors.delete(itemId)
  }
}

function queueSource(item: LibraryQueueItem): ResourceSourceView {
  return {
    id: `pending-source-${item.id}`,
    type: item.kind,
    location: item.location,
    available: true,
    isPreferred: true,
    orderIndex: 0,
    metadata: null
  }
}

function startRename(item: LibraryQueueItem) {
  editingItemId.value = item.id
  void nextTick(() => nameEditors.get(item.id)?.select())
}

function stopRename() {
  editingItemId.value = null
}

function handleRenameChange(item: LibraryQueueItem, event: WebUiEvent<WebUiEditableText, 'change'>) {
  const editor = event.currentTarget
  const title = editor.value.trim()
  const nextTitle = title || item.title
  if (editor.value !== nextTitle) editor.value = nextTitle
  if (nextTitle !== item.title) emit('rename', item.id, nextTitle)
  stopRename()
}
</script>

<template>
  <web-ui-dialog
    :open="open"
    controlled
    no-backdrop-close
    horizontal
    :style="{ '--wui-dialog-footer-justify': mobile ? undefined : 'flex-end' }"
    class="[--wui-dialog-width:min(90vw,880px)] [--wui-dialog-max-height:min(90vh,640px)]"
    @open-change="handleOpenChange"
  >
    <span slot="title">添加资源</span>

    <p
      v-if="error"
      class="m-0 rounded-md bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 dark:bg-red-400/12 dark:text-red-200"
      role="alert"
    >
      {{ error }}
    </p>

    <div
      class="grid min-h-0 grid-cols-2 gap-5 max-[640px]:gap-4 max-[900px]:grid-cols-1 max-[900px]:grid-rows-2"
      style="height: min(calc(90vh - 108px), calc(var(--wui-dialog-max-height, 640px) - 108px))"
    >
      <section class="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5 overflow-hidden">
        <div class="flex min-w-0 items-center justify-between gap-2">
          <p class="m-0 min-w-0 truncate text-[13px] leading-6 text-[#6a6a6a] dark:text-(--wui-color-text-secondary)">
            选择本地文件，或将其拖入上传区；也可以粘贴复制的文件。
          </p>
          <web-ui-button
            icon
            variant="ghost"
            size="28"
            aria-label="粘贴复制的文件"
            title="粘贴复制的文件"
            @click="emit('requestFilePaths')"
          >
            <web-ui-icon :icon="lucideClipboardPaste" :size="15" />
          </web-ui-button>
        </div>
        <button
          type="button"
          class="grid h-full place-content-center justify-items-center gap-3 rounded-3xl bg-[#f0f0f4] px-6 py-7 text-center transition-[background-color] duration-[160ms] hover:bg-[#e9e9ee] file-drop-target-active:scale-[1.005] file-drop-target-active:bg-[color-mix(in_srgb,var(--wui-color-accent,#08f)_9%,transparent)] dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_4%,transparent)] dark:file-drop-target-active:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_7%,transparent)] max-[640px]:gap-2 max-[640px]:px-4 max-[640px]:py-2 max-[900px]:p-5"
          data-file-drop-target="library-add-files"
          :class="dragActive ? 'scale-[1.005] bg-[color-mix(in_srgb,var(--wui-color-accent,#08f)_9%,transparent)]' : ''"
          @click="emit('pickFiles')"
          @dragenter.prevent="dragActive = true"
          @dragover.prevent="dragActive = true"
          @dragleave.prevent="dragActive = false"
          @drop.prevent="handleDrop"
        >
          <span
            class="grid size-13 place-items-center rounded-[18px] bg-[color-mix(in_srgb,var(--wui-color-accent,#08f)_10%,transparent)] text-(--wui-color-accent,#08f) transition-[background-color] duration-[160ms] dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_8%,transparent)] dark:text-(--wui-color-text-secondary) max-[640px]:size-10 max-[640px]:rounded-xl"
          >
            <web-ui-icon :icon="lucideUpload" :size="23" />
          </span>
          <span
            class="text-[15px] font-semibold leading-[1.4] text-[#22212a] dark:text-(--wui-color-text) max-[640px]:text-[13px]"
          >
            拖入文件，或点按选择
          </span>
          <span
            class="text-xs leading-[1.4] text-[#6a6a6a] dark:text-(--wui-color-text-secondary) max-[640px]:text-[11px]"
          >
            支持图片、文档、音频和视频，可一次添加多项
          </span>
        </button>
      </section>

      <aside
        class="relative grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5 overflow-hidden border-0 bg-transparent p-0"
        aria-labelledby="library-add-queue-title"
      >
        <div class="flex min-h-6 items-center justify-between">
          <h3
            id="library-add-queue-title"
            class="m-0 flex items-center gap-1.5 text-[13px] font-semibold text-[#22212a] dark:text-(--wui-color-text)"
          >
            将添加
          </h3>
          <span
            class="rounded-full bg-black/4 px-2 py-1 text-xs leading-none text-[#6a6a6a] dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_6%,transparent)] dark:text-(--wui-color-text-secondary)"
          >
            {{ queue.length }} 项
          </span>
        </div>

        <ol
          v-if="queue.length"
          class="m-0 h-full min-h-0 list-none overflow-y-auto rounded-3xl bg-white p-0 [scrollbar-gutter:auto] [scrollbar-width:auto] dark:bg-(--wui-color-surface-raised)"
        >
          <li
            v-for="(item, itemIndex) in queue"
            :key="item.id"
            :class="[
              metadataRowClass,
              'items-start transition-colors duration-100 hover:bg-black/3 dark:hover:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_5%,transparent)]'
            ]"
          >
            <button
              v-if="isImagePreviewItem(item)"
              data-queue-thumbnail
              type="button"
              class="grid size-10 shrink-0 cursor-zoom-in place-items-center overflow-hidden rounded-lg p-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--wui-color-focus-ring,rgb(0_136_255/0.4))"
              :aria-label="`预览 ${item.title}`"
              aria-haspopup="dialog"
              @click="openImagePreview(item, $event)"
            >
              <LibraryResourceThumbnail
                :kind="item.resourceKind"
                :source="queueSource(item)"
                :media-url="item.mediaUrl"
              />
            </button>
            <LibraryResourceThumbnail
              v-else
              data-queue-thumbnail
              :kind="item.resourceKind"
              :source="queueSource(item)"
              :media-url="item.mediaUrl"
            />
            <span class="grid min-w-0 flex-[1_1_auto] gap-[5px]">
              <div class="flex h-8 items-center gap-2">
                <span class="flex h-8 min-w-0 flex-[1_1_auto] items-center gap-1.5">
                  <web-ui-editable-text
                    v-if="editingItemId === item.id"
                    :ref="setNameEditorRef(item.id)"
                    :value="item.title"
                    class="min-w-0 flex-[1_1_auto] caret-(--wui-color-accent,#08f) select-text"
                    :aria-label="`修改 ${item.title} 的名称`"
                    @click.stop
                    @change="handleRenameChange(item, $event)"
                    @cancel="stopRename"
                  />
                  <span
                    v-else
                    class="min-w-0 flex-[0_1_auto] overflow-hidden text-[14px] font-medium leading-[1.35] text-ellipsis whitespace-nowrap text-[#22212a] dark:text-(--wui-color-text)"
                  >
                    {{ item.title }}
                  </span>
                  <web-ui-tooltip
                    v-if="editingItemId !== item.id"
                    content="编辑名称"
                    :placement="itemIndex < 5 ? 'bottom' : 'top'"
                  >
                    <web-ui-button icon variant="ghost" size="28" aria-label="编辑名称" @click="startRename(item)">
                      <web-ui-icon :icon="lucidePenLine" :size="14" />
                    </web-ui-button>
                  </web-ui-tooltip>
                </span>
                <span class="ml-auto flex shrink-0 items-center gap-1">
                  <web-ui-button
                    class="[--wui-button-color:var(--wui-color-danger,#dc2626)]"
                    icon
                    variant="ghost"
                    size="28"
                    aria-label="移除待添加资源"
                    @click="emit('remove', item.id)"
                  >
                    <web-ui-icon :icon="lucideTrash2" :size="14" />
                  </web-ui-button>
                </span>
              </div>
              <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                <span
                  class="shrink-0 text-xs leading-5 whitespace-nowrap text-[#6a6a6a] dark:text-(--wui-color-text-secondary)"
                  :title="item.location"
                >
                  {{ item.location }}
                </span>
                <div class="flex min-w-0 flex-[0_0_100%] flex-wrap items-center gap-[5px]">
                  <span
                    v-for="tag in item.tags"
                    :key="tag"
                    class="inline-block px-2 py-0.5 rounded-full text-xs leading-tight whitespace-nowrap"
                    :class="tagClass(tag)"
                    >{{ tag }}</span
                  >
                  <web-ui-tooltip content="编辑标签" :placement="itemIndex < 5 ? 'bottom' : 'top'">
                    <web-ui-button
                      class="shrink-0 [--wui-button-color:var(--wui-color-accent,#08f)]"
                      icon
                      variant="ghost"
                      size="20"
                      aria-label="编辑标签"
                      @click="emit('editTags', item)"
                    >
                      <web-ui-icon :icon="lucideTags" :size="12" />
                    </web-ui-button>
                  </web-ui-tooltip>
                </div>
              </div>
            </span>
          </li>
        </ol>

        <div
          v-else
          class="grid h-full min-h-0 place-items-center rounded-3xl bg-white dark:bg-(--wui-color-surface-raised)"
        >
          <!--
            空态以左侧 drop 区为基准做视觉对称，只调本侧：
            icon 盒 52px/圆角 18px/字形 23px、icon 到文案 12px、文案 15px/600/行高 1.4，
            桌面与 max-[640px] 各断点与左侧逐一对应。
            关键一项是 --wui-empty-min-height: 0：web-ui-empty 的 `.empty` 默认把内容顶端对齐在
            160px min-block-size 盒内，置 0 后内容才随外层 place-items-center 真正垂直居中。
            图标到文案的 6px 基础间距来自组件内部写死的 `.empty-description` margin-top（未开放
            token），mt-1.5 把它补到左侧 gap-3 的 12px；两行文案与行间距由 slot 内容整体接管，
            与左侧同样是「主文案 + 辅助说明」两行，合成块高度因此与左侧逐像素相等，icon 行对齐。
            图标底色与色板仍沿用 web-ui-empty 的中性 token：右侧是不可点的空态占位，染成左侧
            drop 区的强调色会读成可点击目标。
          -->
          <web-ui-empty
            size="small"
            class="[--wui-empty-min-height:0] [--wui-empty-padding:0] [--wui-empty-icon-size:52px] [--wui-internal-empty-icon-radius:18px] max-[640px]:[--wui-empty-icon-size:40px] max-[640px]:[--wui-internal-empty-icon-radius:12px]"
          >
            <web-ui-icon slot="icon" :icon="lucideInbox" :size="23" />
            <span slot="description" class="mt-1.5 grid gap-3 max-[640px]:mt-0.5 max-[640px]:gap-2">
              <span
                class="block text-[15px] font-semibold leading-[1.4] text-[#22212a] dark:text-(--wui-color-text) max-[640px]:text-[13px]"
              >
                暂无待添加资源
              </span>
              <span
                class="block text-xs leading-[1.4] text-[#6a6a6a] dark:text-(--wui-color-text-secondary) max-[640px]:text-[11px]"
              >
                添加的资源会显示在这里，可先修改名称和标签
              </span>
            </span>
          </web-ui-empty>
        </div>
      </aside>
    </div>

    <web-ui-button
      slot="footer"
      :full="mobile"
      variant="secondary"
      :disabled="busy"
      @click="emit('update:open', false)"
    >
      取消
    </web-ui-button>
    <web-ui-button
      slot="footer"
      :full="mobile"
      variant="primary"
      :loading="busy"
      :disabled="queue.length === 0"
      @click="emit('submit')"
    >
      <web-ui-icon slot="prefix" :icon="lucidePlus" :size="16" />
      {{ queue.length > 1 ? '批量添加' : '添加' }}
    </web-ui-button>
  </web-ui-dialog>
</template>
