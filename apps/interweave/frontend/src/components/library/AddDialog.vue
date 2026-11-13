<script setup lang="ts">
import appScrollbarsOptions from '@greypan/app-scrollbars'
import {
  imagePreview,
  type ImagePreviewHandle,
  type WebUiDialog,
  type WebUiEditableText,
  type WebUiEvent
} from '@greypan/web-ui'
import {
  akarIconsCircleCheck,
  andrsrxnInbox,
  lucideClipboardPaste,
  lucidePenLine,
  lucideTags,
  lucideTrash2
} from '@greypan/web-ui/icons'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { nextTick, onMounted, onScopeDispose, ref, watch, type ComponentPublicInstance } from 'vue'

import type { LibraryQueueItem } from '@/services/library'
import type { ResourceSourceView, TagColor } from '@/stores/library'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

import { queueItemTitle } from './addQueue'
import { linkPlus } from './icons'
import { tagChipClass, tagClass } from './presentation'
import type { NameEditorRef } from './rename'
import {
  resourceDialogColumnClass,
  resourceDialogEmptyClass,
  resourceDialogQueueClass,
  resourceDialogRowClass
} from './resourceDialogStyles'
import ResourceLinkDialog from './ResourceLinkDialog.vue'
import ResourceThumbnail from './ResourceThumbnail.vue'

const props = defineProps<{
  open: boolean
  queue: LibraryQueueItem[]
  busy: boolean
  error: string
  mobile: boolean
  /**
   * 标签名 → 持久化颜色。队列里的标签还没落库，本身没有颜色可言，
   * 因此按名回查已确定的那个；查不到就是尚未创建，展示中性档。
   */
  tagColors: Record<string, TagColor>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  pickFiles: []
  addUrl: [url: string]
  /** 剪贴板文本一并带上：文件接口对链接返回空数组，页面要靠它兜底（#188）。粘贴 button 没有文本。 */
  requestFilePaths: [clipboardText?: string]
  remove: [itemId: string]
  rename: [itemId: string, title: string]
  editTags: [item: LibraryQueueItem]
  submit: []
}>()

const dragActive = ref(false)
const addUrlOpen = ref(false)
const editingItemId = ref<string | null>(null)
const nameEditors = new Map<string, WebUiEditableText>()
let pendingImagePreview: ImagePreviewHandle | null = null

/* 静态态与编辑态共用排版，长名称在两态下保持相同换行。 */
const queueNameClass =
  'min-w-0 flex-1 wrap-anywhere text-[14px] font-medium leading-[1.35] text-[#22212a] dark:text-(--wui-color-text)'

watch(
  () => props.open,
  open => {
    if (!open) {
      addUrlOpen.value = false
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
  if (isEditableEventTarget(event)) return
  emit('requestFilePaths', event.clipboardData?.getData('text') ?? '')
}

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]'

/*
 * 走 composedPath 而不是 event.target：监听器在 window 上，而编辑控件封在 web-ui 的
 * shadow 里（editable-text 的编辑层是 shadow 内的 <textarea>）。paste 是 composed 的，
 * 冒到 window 时 event.target 已被 retarget 成 shadow host，host 上的 closest() 又不跨
 * shadow 边界——判据漏掉真正的编辑控件，于是「在名称里按 Cmd+V」会当成往队列里粘贴，
 * 顺带把剪贴板里的链接也入队。
 */
function isEditableEventTarget(event: Event) {
  return event
    .composedPath()
    .some(node => node instanceof HTMLElement && (node.isContentEditable || node.matches(EDITABLE_SELECTOR)))
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
  // imagePreview 在打开时复制 images 且 handle 不支持替换；预览作为顶层模态阻止底层队列操作，
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
    mediaUrl: item.mediaUrl,
    thumbnailUrl: null,
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
  const shown = queueItemTitle(item)
  const nextTitle = title || shown
  if (editor.value !== nextTitle) editor.value = nextTitle
  if (nextTitle !== shown) emit('rename', item.id, nextTitle)
  stopRename()
}
</script>

<template>
  <web-ui-dialog
    :open="open"
    controlled
    no-backdrop-close
    footer-orientation="horizontal"
    :style="{
      '--wui-dialog-footer-justify': mobile ? undefined : 'flex-end',
      '--wui-dialog-max-height': mobile ? 'calc(min(90vh, 700px) - 142px)' : 'calc(min(82vh, 560px) - 142px)'
    }"
    class="[--wui-dialog-width:min(90vw,880px)]"
    @open-change="handleOpenChange"
  >
    <span slot="header">添加资源</span>

    <p
      v-if="error"
      class="m-0 rounded-md bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 dark:bg-red-400/12 dark:text-red-200"
      role="alert"
    >
      {{ error }}
    </p>

    <!--
      内层不自己算高度：`--wui-dialog-max-height` 的语义是「内容区高度」（不是「整卡高度」，
      见 @greypan/web-ui 的 dialog），上限由组件的 `.desc` 承担。

      这里用 var(--wui-dialog-max-height) 而不是 height: 100%：后者在内容不足时会让
      `.desc` 收缩到内容高，整张卡片跟着变矮，切 tab / 队列有无时又跳一次。token 直接
      当内层高度，固定高度这个性质才成立（两个 drop zone 恒等高）。
      token 声明在外层 web-ui-dialog 上，内层作为后代继承得到，两个数不会走散。

      token 里减掉的 142 是本 dialog 的 chrome 实测值（Chrome/Chromium，1017×503）：
        卡片上 padding        20（上）+ 24（下）
        .header 带外高         37.59（标题 21.59 + 带下 margin 16）
        .desc margin-top       −6（focus-ring 上余量的成对负 margin，扣回 title 下方间距）
        .desc padding-block   12（focus-ring 余量）
        .desc margin-bottom   18
        .wui-dialog-footer    36（--wui-control-size，两枚 button）
        ------------------------------------------
        chrome                 141.59 → 142（向上取整，留亚像素余量）

      触摸端 `@media (pointer: coarse)` 把 --wui-control-size 抬到 40，footer 随之长到
      40、chrome 变 145.59。这 4px 由**卡片**吸收：内容区仍等于 token 本身，一像素不缩
      （实测 36 → 40 时内容区恒为 270），长高的是卡片本身（412 → 416）。它没有把卡片顶出
      dialog 盒子——那正是本轮修掉的 bug。

      所以 token 减掉的那 142 是**内容区预算**，不是整卡定值：整卡高度仍随
      --wui-control-size 一起长。视口矮到 82vh 生效时（本例 503px 视口下 82vh = 412），
      卡片会越出自己声明的那个数 4px。这是有意的——内容区不动、卡片跟着 chrome 走，
      正是「chrome 由内容撑开」要的结果。
    -->
    <div
      class="grid h-(--wui-dialog-max-height) min-h-0 gap-5 mobile:gap-4"
      :class="mobile ? 'grid-cols-1 grid-rows-2' : 'grid-cols-2'"
    >
      <section :class="resourceDialogColumnClass">
        <div class="flex h-7 min-w-0 items-center justify-between gap-2">
          <p class="m-0 min-w-0 truncate text-[14px] leading-6 text-[#6a6a70] dark:text-(--wui-color-text-secondary)">
            支持本地文件与远程链接，支持拖入或粘贴
          </p>
          <div class="flex shrink-0 items-center gap-2">
            <web-ui-tooltip content="添加链接" placement="bottom">
              <web-ui-button icon size="28" aria-label="添加链接" :disabled="busy" @click="addUrlOpen = true">
                <web-ui-icon :icon="linkPlus" :size="15" />
              </web-ui-button>
            </web-ui-tooltip>
            <web-ui-tooltip content="从剪切板添加" placement="bottom">
              <web-ui-button icon size="28" aria-label="粘贴复制的文件" @click="emit('requestFilePaths')">
                <web-ui-icon :icon="lucideClipboardPaste" :size="15" />
              </web-ui-button>
            </web-ui-tooltip>
          </div>
        </div>
        <button
          type="button"
          class="grid h-full place-content-center justify-items-center gap-3 rounded-[18px] border-0 bg-[#f0f0f4] px-6 py-7 text-center transition-[background-color] duration-(--wui-duration-trigger) hover:bg-[#e9e9ee] file-drop-target-active:scale-[1.005] file-drop-target-active:bg-[color-mix(in_srgb,var(--wui-color-accent,#08f)_9%,transparent)] dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b20)_4%,transparent)] dark:hover:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b20)_7%,transparent)] dark:file-drop-target-active:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b20)_7%,transparent)] mobile:gap-2 mobile:px-4 mobile:py-2"
          data-file-drop-target="library-add-files"
          :class="dragActive ? 'scale-[1.005] bg-[color-mix(in_srgb,var(--wui-color-accent,#08f)_9%,transparent)]' : ''"
          @click="emit('pickFiles')"
          @dragenter.prevent="dragActive = true"
          @dragover.prevent="dragActive = true"
          @dragleave.prevent="dragActive = false"
          @drop.prevent="handleDrop"
        >
          <web-ui-empty class="[--wui-empty-min-height:0] [--wui-empty-padding:0] [--wui-empty-icon-size:40px]">
            <!-- andrsrxn:upload (MIT), https://github.com/andrsrxn/icons -->
            <svg slot="icon" width="40" height="40" viewBox="0 0 24 24" aria-hidden="true">
              <g fill="none">
                <path
                  fill="currentColor"
                  d="M2.4 12.01h19.2v2.96c0 2.83 0 4.24-.88 5.12s-2.3.88-5.12.88H8.4c-2.83 0-4.24 0-5.12-.88s-.88-2.3-.88-5.12z"
                  opacity=".2"
                />
                <path
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M2.69 12.01v2.96c0 2.83 0 4.24.88 5.12c.87.88 2.29.88 5.12.88h6.62c2.83 0 4.25 0 5.12-.88s.88-2.3.88-5.12v-2.96M17.1 6.77l-2.28-2.29c-1.34-1.33-2-2-2.83-2s-1.5.66-2.83 2l-2.3 2.3M11.98 16V3.32"
                />
              </g>
            </svg>
            <span
              class="text-[16px] font-semibold leading-[1.4] text-[#22212a] dark:text-(--wui-color-text) mobile:text-[13px]"
            >
              拖入文件，或点按选择
            </span>
            <!--
            两行各自成行，不靠自动折行：类型枚举有 7 项，按容器宽度自然换行会把
            「代码 / 等文件」这类词组劈开，读起来像缺字。grid 让「可批量添加」
            独立成行，容器变窄时它整体下移而枚举行内部再折。
          -->
            <span
              slot="description"
              class="grid gap-0.5 text-xs leading-[1.4] text-[#6a6a70] dark:text-(--wui-color-text-secondary) mobile:text-[11px]"
            >
              <span>支持图片、视频、音频、文档、网页、代码等文件</span>
              <span>可批量添加</span>
            </span>
          </web-ui-empty>
        </button>
      </section>

      <aside
        :class="[resourceDialogColumnClass, 'relative border-0 bg-transparent p-0']"
        aria-labelledby="library-add-queue-title"
      >
        <div class="flex h-7 min-w-0 items-center justify-between gap-2">
          <h3
            id="library-add-queue-title"
            class="m-0 flex items-center gap-1.5 text-[14px] font-semibold text-[#22212a] dark:text-(--wui-color-text)"
          >
            待添加
          </h3>
          <span
            class="inline-flex h-7 items-center text-xs leading-none text-[#6a6a70] dark:text-(--wui-color-text-secondary)"
          >
            {{ queue.length }} 项
          </span>
        </div>

        <OverlayScrollbarsComponent
          v-if="queue.length"
          :options="appScrollbarsOptions"
          :class="resourceDialogQueueClass"
        >
          <!--
            scrollbar 接在宿主 div 上，列表本身留在它里面：OverlayScrollbars 会把宿主的子节点搬进
            自己生成的 viewport，而 <ol> 的内容模型只容得下 <li>——宿主若还是这个 <ol>，
            搬进去的 viewport div 就落进列表里了。卡片装饰与 overflow 一并上移到宿主。
          -->
          <ol class="m-0 list-none p-0">
            <li v-for="(item, itemIndex) in queue" :key="item.id" :class="resourceDialogRowClass">
              <button
                v-if="isImagePreviewItem(item)"
                data-queue-thumbnail
                type="button"
                class="grid size-10 shrink-0 cursor-zoom-in place-items-center overflow-hidden rounded-[10px] p-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--wui-color-focus-ring,rgb(0_136_255/0.4))"
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
              <span class="grid min-w-0 flex-[1_1_auto] gap-1">
                <div class="flex min-w-0 items-center gap-2">
                  <web-ui-editable-text
                    v-if="editingItemId === item.id"
                    :ref="setNameEditorRef(item.id)"
                    :value="queueItemTitle(item)"
                    :class="queueNameClass"
                    class="caret-(--wui-color-accent,#08f) select-text"
                    :aria-label="`修改 ${queueItemTitle(item)} 的名称`"
                    @click.stop
                    @change="handleRenameChange(item, $event)"
                    @cancel="stopRename"
                  />
                  <span v-else :class="[queueNameClass, 'whitespace-pre-wrap']">
                    {{ queueItemTitle(item) }}
                  </span>
                  <span class="flex shrink-0 items-center gap-1">
                    <span v-if="editingItemId === item.id" class="size-7" aria-hidden="true" />
                    <web-ui-tooltip v-else content="编辑名称" :placement="itemIndex < 5 ? 'bottom' : 'top'">
                      <web-ui-button icon variant="ghost" size="28" aria-label="编辑名称" @click="startRename(item)">
                        <web-ui-icon :icon="lucidePenLine" :size="14" />
                      </web-ui-button>
                    </web-ui-tooltip>
                    <web-ui-tooltip content="编辑标签" :placement="itemIndex < 5 ? 'bottom' : 'top'">
                      <web-ui-button
                        icon
                        variant="ghost"
                        size="28"
                        aria-label="编辑标签"
                        @click="emit('editTags', item)"
                      >
                        <web-ui-icon :icon="lucideTags" :size="14" />
                      </web-ui-button>
                    </web-ui-tooltip>
                    <web-ui-tooltip content="移除待添加资源" :placement="itemIndex < 5 ? 'bottom' : 'top'">
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
                    </web-ui-tooltip>
                  </span>
                </div>
                <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span
                    class="min-w-0 wrap-anywhere text-xs leading-4 text-[#6a6a70] dark:text-(--wui-color-text-secondary)"
                    :title="item.location"
                    :class="item.kind === 'url' ? 'text-(--wui-color-accent) underline' : ''"
                  >
                    {{ item.location }}
                  </span>
                  <div v-if="item.tags.length" class="flex min-w-0 flex-[0_0_100%] flex-wrap items-center gap-[5px]">
                    <span v-for="tag in item.tags" :key="tag" :class="[tagChipClass, tagClass(props.tagColors[tag])]">
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </span>
            </li>
          </ol>
        </OverlayScrollbarsComponent>

        <div v-else :class="resourceDialogEmptyClass">
          <web-ui-empty class="[--wui-empty-min-height:0] [--wui-empty-padding:0] [--wui-empty-icon-size:40px]">
            <web-ui-icon slot="icon" :icon="andrsrxnInbox" :size="40" />
            <span
              class="text-[16px] font-semibold leading-[1.4] text-[#22212a] dark:text-(--wui-color-text) mobile:text-[13px]"
            >
              暂无待添加资源
            </span>
            <span
              slot="description"
              class="grid gap-0.5 text-xs leading-[1.4] text-[#6a6a70] dark:text-(--wui-color-text-secondary) mobile:text-[11px]"
            >
              <span>添加的资源将显示在此处</span>
              <span>名称和标签可修改</span>
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
      <web-ui-icon slot="prefix" :icon="akarIconsCircleCheck" />
      {{ queue.length > 1 ? '批量添加' : '添加' }}
    </web-ui-button>
  </web-ui-dialog>
  <ResourceLinkDialog v-model:open="addUrlOpen" initial-value="" mode="add" @submit="emit('addUrl', $event)" />
</template>
