<script setup lang="ts">
import {
  imagePreview,
  type ImagePreviewHandle,
  type WebUiDialog,
  type WebUiEditableText,
  type WebUiEvent
} from '@greypan/web-ui'
import {
  akarIconsCircleCheck,
  lucideClipboardPaste,
  lucideInbox,
  lucidePenLine,
  lucideTags,
  lucideTrash2,
  lucideUpload
} from '@greypan/web-ui/icons'
import { nextTick, onMounted, onScopeDispose, ref, watch, type ComponentPublicInstance } from 'vue'

import type { LibraryQueueItem } from '@/services/library'
import type { ResourceSourceView } from '@/stores/library'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

import { metadataRowClass, tagChipClass, tagClass } from './presentation'
import type { NameEditorRef } from './rename'
import ResourceThumbnail from './ResourceThumbnail.vue'

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
    class="[--wui-dialog-width:min(90vw,880px)] [--wui-dialog-max-height:min(82vh,560px)]"
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
      style="height: min(calc(82vh - 108px), calc(var(--wui-dialog-max-height, 560px) - 108px))"
    >
      <!--
        clip + clip-margin 而非 hidden：drop zone 与标题行按钮都紧贴栏边，而 focus ring
        画在 border box 之外共 5px（offset 2 + width 3），hidden 会把 ring 裁成缺角的形状。
        6px 留出 ring 再余 1px。clip 不创建滚动容器，本栏也不需要滚动。
      -->
      <section
        class="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5 overflow-clip [overflow-clip-margin:6px]"
      >
        <div class="flex h-7 min-w-0 items-center justify-between gap-2">
          <p class="m-0 min-w-0 truncate text-[14px] leading-6 text-[#6a6a6a] dark:text-(--wui-color-text-secondary)">
            支持本地文件与远程链接，支持拖入或粘贴
          </p>
          <web-ui-tooltip content="粘贴" placement="bottom">
            <web-ui-button
              icon
              variant="secondary"
              size="28"
              aria-label="粘贴复制的文件"
              @click="emit('requestFilePaths')"
            >
              <web-ui-icon :icon="lucideClipboardPaste" :size="15" />
            </web-ui-button>
          </web-ui-tooltip>
        </div>
        <!--
          左右两张大卡共用同一条 1px 描边（此处与右栏 ol / 空态卡一致），不是为了分出
          层级，而是为了给两栏等重的边界。dialog body 是 rgba(246,246,246,.82) 的浅灰：
          白卡比它亮 9/255，边界清晰；灰卡 #f0f0f4 只比它暗 6/255，底边几乎融进底色，
          眼睛读不出这块的截止线，于是把左栏高度读偏、读成两栏底部不齐——几何其实
          一直相等（同为 top 170.8 / 高 414 / 底 584.8）。同色同粗的描边让两条底边
          读成一条线，缺的是可读性而不是尺寸。
        -->
        <button
          type="button"
          class="grid h-full place-content-center justify-items-center gap-3 rounded-[18px] border border-black/6 bg-[#f0f0f4] px-6 py-7 text-center transition-[background-color] duration-[160ms] hover:bg-[#e9e9ee] file-drop-target-active:scale-[1.005] file-drop-target-active:bg-[color-mix(in_srgb,var(--wui-color-accent,#08f)_9%,transparent)] dark:border-white/8 dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_4%,transparent)] dark:hover:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_7%,transparent)] dark:file-drop-target-active:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_7%,transparent)] max-[640px]:gap-2 max-[640px]:px-4 max-[640px]:py-2 max-[900px]:p-5"
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
            class="text-[16px] font-semibold leading-[1.4] text-[#22212a] dark:text-(--wui-color-text) max-[640px]:text-[13px]"
          >
            拖入文件，或点按选择
          </span>
          <!--
            两行各自成行，不靠自动折行：类型枚举有 7 项，按容器宽度自然换行会把
            「代码 / 等文件」这类词组劈开，读起来像缺字。grid 让「可批量添加」
            独立成行，容器变窄时它整体下移而枚举行内部再折。
          -->
          <span
            class="grid gap-0.5 text-xs leading-[1.4] text-[#6a6a6a] dark:text-(--wui-color-text-secondary) max-[640px]:text-[11px]"
          >
            <span>支持图片、视频、音频、文档、网页、代码等文件</span>
            <span>可批量添加</span>
          </span>
        </button>
      </section>

      <aside
        class="relative grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5 overflow-clip [overflow-clip-margin:6px] border-0 bg-transparent p-0"
        aria-labelledby="library-add-queue-title"
      >
        <div class="flex h-7 min-w-0 items-center justify-between gap-2">
          <h3
            id="library-add-queue-title"
            class="m-0 flex items-center gap-1.5 text-[14px] font-semibold text-[#22212a] dark:text-(--wui-color-text)"
          >
            待添加
          </h3>
          <!-- 56px 下限让「0 项」和「12 项」宽度一致，计数跳变时标题行不左右抖动。 -->
          <span
            class="inline-flex h-7 min-w-14 items-center justify-center rounded-full bg-black/4 px-2 text-xs leading-none text-[#6a6a6a] dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_6%,transparent)] dark:text-(--wui-color-text-secondary)"
          >
            {{ queue.length }} 项
          </span>
        </div>

        <ol
          v-if="queue.length"
          class="m-0 h-full min-h-0 list-none overflow-y-auto rounded-[18px] border border-black/6 bg-white p-0 [scrollbar-gutter:auto] [scrollbar-width:auto] dark:border-white/8 dark:bg-(--wui-color-surface-raised)"
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
              <ResourceThumbnail :kind="item.resourceKind" :source="queueSource(item)" :media-url="item.mediaUrl" />
            </button>
            <ResourceThumbnail
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
                  <span v-for="tag in item.tags" :key="tag" :class="[tagChipClass, tagClass(tag)]">{{ tag }}</span>
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
          class="grid h-full min-h-0 place-items-center rounded-[18px] border border-black/6 bg-white dark:border-white/8 dark:bg-(--wui-color-surface-raised)"
        >
          <!--
            空态以左侧 drop 区为基准对齐，两块内容同构、等高，各自居中后自然落在同一
            水平线上——不靠单侧 padding 补偿：
            icon 盒 52px/圆角 18px/字形 23px、icon 到文案 12px、标题 16px/600/行高 1.4、
            标题到说明 12px、说明两行 12px/1.4 行内距 2px，与左侧逐一对应，
            桌面与 max-[640px] 各断点同样成对。
            高度相等的关键是说明同为两行：两行时两侧都是
            52 + 12 + 22.4 + 12 + (16.8 + 2 + 16.8) = 134px。说明只写一行时右侧会短
            18.8px、整块被顶高，此前用 pb-[16.8px] 补平；两侧都两行后补偿即失效并已删除。
            文案里的逗号改成换行同理：左栏 drop 区的支持类型说明已经是两行，右栏跟着
            两行，两侧才对称。

            关键一项是 --wui-empty-min-height: 0：web-ui-empty 的 `.empty` 默认把内容顶端对齐在
            160px min-block-size 盒内，置 0 后内容才随外层 place-items-center 真正垂直居中。
            图标到文案的 6px 基础间距来自组件内部写死的 `.empty-description` margin-top（未开放
            token），mt-1.5 把它补到左侧 gap-3 的 12px，max-[640px]:mt-0.5 配 gap-2 同理。
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
                class="text-[16px] font-semibold leading-[1.4] text-[#22212a] dark:text-(--wui-color-text) max-[640px]:text-[13px]"
              >
                暂无待添加资源
              </span>
              <span
                class="grid gap-0.5 text-xs leading-[1.4] text-[#6a6a6a] dark:text-(--wui-color-text-secondary) max-[640px]:text-[11px]"
              >
                <!-- 与左侧 drop 区的支持类型说明同理，各自成行而不是靠自动折行。 -->
                <span>添加的资源将显示在此处</span>
                <span>名称和标签可修改</span>
              </span>
            </span>
          </web-ui-empty>
        </div>
      </aside>
    </div>

    <web-ui-button
      slot="footer"
      class="[--wui-button-width:76px]"
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
      <web-ui-icon slot="prefix" :icon="akarIconsCircleCheck" :size="16" />
      {{ queue.length > 1 ? '确认批量添加' : '确认添加' }}
    </web-ui-button>
  </web-ui-dialog>
</template>
