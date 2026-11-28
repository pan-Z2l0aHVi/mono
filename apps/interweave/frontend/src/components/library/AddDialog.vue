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
  lucideFile,
  lucideFolder,
  lucidePenLine,
  lucideTags,
  lucideTrash2
} from '@greypan/web-ui/icons'
import type { OverlayScrollbars } from 'overlayscrollbars'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { Virtualizer } from 'virtua/vue'
import { computed, nextTick, onMounted, onScopeDispose, ref, watch, type ComponentPublicInstance } from 'vue'

import { selectLitEditor, useEditorFocusRestore } from '@/composables/useEditorFocusRestore'
import type { LibraryQueueItem } from '@/services/library'
import { wailsPlatformOS } from '@/services/runtime'
import type { ResourceSourceView, TagColor } from '@/stores/library'

import { ResourceKind } from '../../../bindings/github.com/pan-Z2l0aHVi/mono/apps/interweave/backend/library/storage'

import { queueItemTitle } from './addQueue'
import { doubleArrowRight, linkPlus } from './icons'
import type { PreviewLeaseEntry } from './previewLease'
import type { NameEditorRef } from './rename'
import {
  resourceDialogColumnClass,
  resourceDialogEmptyClass,
  resourceDialogQueueClass,
  resourceDialogRowClass
} from './resourceDialogStyles'
import ResourceLinkDialog from './ResourceLinkDialog.vue'
import ResourceTag from './ResourceTag.vue'
import ResourceThumbnail from './ResourceThumbnail.vue'

const props = defineProps<{
  open: boolean
  queue: LibraryQueueItem[]
  busy: boolean
  mobile: boolean
  /**
   * 标签名 → 持久化颜色。队列里的标签还没落库，本身没有颜色可言，
   * 因此按名回查已确定的那个；查不到就是尚未创建，展示中性档。
   */
  tagColors: Record<string, TagColor>
  /** lease 里的有效预览；渲染只看这里，驱逐后立即回落通用 fallback。 */
  previews: Readonly<Record<string, PreviewLeaseEntry | undefined>>
  /** 最近一段长流程的 done/total；加载中的确认按钮用它展示「已导入数 / 总数」。 */
  progress: { done: number; total: number }
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  pickFiles: []
  pickFilesOnly: []
  pickDirectories: []
  addUrl: [urls: string[]]
  /** 剪贴板文本一并带上：文件接口对链接返回空数组，页面要靠它兜底（#188）。粘贴 button 没有文本。 */
  requestFilePaths: [clipboardText?: string]
  remove: [itemId: string]
  rename: [itemId: string, title: string]
  editTags: [item: LibraryQueueItem]
  submit: []
  closed: []
}>()

defineExpose({
  /** 供菜单的「导入来自 › 链接」直接翻开链接输入，不必让用户再点一次。 */
  openLinkDialog: () => {
    addUrlOpen.value = true
  }
})

const isWindows = computed(() => wailsPlatformOS() === 'windows')
const dragActive = ref(false)
const addUrlOpen = ref(false)
const editingItemId = ref<string | null>(null)
const queueScrollRef = ref<HTMLElement | undefined>(undefined)
// 弹窗级视频捕获作用域：关闭、开始提交或组件卸载时统一中断未完成的封面解码。
const captureScopeController = ref(new AbortController())

function abortCaptureScope() {
  if (!captureScopeController.value.signal.aborted) {
    captureScopeController.value.abort()
  }
}

function resetCaptureScope() {
  abortCaptureScope()
  captureScopeController.value = new AbortController()
}
const nameEditors = new Map<string, WebUiEditableText>()
const renameButtons = new Map<string, HTMLElement>()
let pendingImagePreview: ImagePreviewHandle | null = null

const keepMountedIndices = computed(() => {
  if (!editingItemId.value) return undefined
  const index = props.queue.findIndex(item => item.id === editingItemId.value)
  return index >= 0 ? [index] : undefined
})

function handleQueueScrollbarsInitialized(instance: OverlayScrollbars) {
  queueScrollRef.value = instance.elements().viewport
}

function handleQueueScrollbarsDestroyed() {
  queueScrollRef.value = undefined
}

/* 静态态与编辑态共用排版，长名称在两态下保持相同换行。 */
const queueNameClass =
  'min-w-0 flex-1 wrap-anywhere text-[14px] font-medium leading-[1.35] text-[#22212a] dark:text-(--wui-color-text)'

/**
 * 加载中的确认按钮直接给「已导入数 / 总数」：长流程的反馈就落在按钮上，
 * 不必另开进度条。空闲时保留原按钮文案。
 */
const submitLabel = computed(() => {
  if (props.busy && props.progress.total > 0) return `${props.progress.done} / ${props.progress.total}`
  return '确认导入'
})

watch(
  () => props.open,
  open => {
    if (!open) {
      addUrlOpen.value = false
      closePendingImagePreview()
      abortCaptureScope()
      return
    }
    dragActive.value = false
    editingItemId.value = null
    if (!props.busy) resetCaptureScope()
  }
)

watch(
  () => props.busy,
  busy => {
    if (busy) abortCaptureScope()
    else if (props.open) resetCaptureScope()
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
  abortCaptureScope()
})

function itemMediaUrl(item: LibraryQueueItem): string | null {
  return props.previews[item.id]?.mediaUrl ?? null
}

function itemPreviewToken(item: LibraryQueueItem): string | null {
  return props.previews[item.id]?.token ?? item.previewToken ?? null
}

function isImagePreviewItem(item: LibraryQueueItem) {
  return item.resourceKind === ResourceKind.ResourceKindImage && Boolean(itemMediaUrl(item))
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
  const entries = props.queue.flatMap(candidate => {
    if (candidate.resourceKind !== ResourceKind.ResourceKindImage) return []
    const mediaUrl = itemMediaUrl(candidate)
    return mediaUrl ? [{ item: candidate, image: { src: mediaUrl, alt: candidate.title } }] : []
  })
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

function setRenameButtonRef(itemId: string) {
  return (element: Element | ComponentPublicInstance | null) => {
    if (element instanceof Element) renameButtons.set(itemId, element as HTMLElement)
    else renameButtons.delete(itemId)
  }
}

useEditorFocusRestore(editingItemId, {
  // 编辑器仍持有焦点才归还；用户已经点到别处时不再抢回来。
  heldFocus: key => {
    const editor = nameEditors.get(key)
    return Boolean(editor) && document.activeElement === editor
  },
  target: key => renameButtons.get(key)
})

function queueSource(item: LibraryQueueItem): ResourceSourceView {
  return {
    id: `pending-source-${item.id}`,
    type: item.kind,
    location: item.location,
    available: true,
    isPreferred: true,
    orderIndex: 0,
    mediaUrl: itemMediaUrl(item),
    thumbnailUrl: null,
    metadata: null
  }
}

function startRename(item: LibraryQueueItem) {
  editingItemId.value = item.id
  // WebKit 下要等控件自身布局完成再 select，否则焦点会被弹窗收回去。
  void nextTick(() => selectLitEditor(nameEditors.get(item.id), () => editingItemId.value === item.id))
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
    @closed="emit('closed')"
  >
    <span slot="header">导入资源</span>

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
      class="grid h-(--wui-dialog-max-height) min-h-0"
      :class="
        mobile
          ? 'grid-cols-1 grid-rows-[minmax(0,1fr)_20px_minmax(0,1fr)]'
          : 'grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)]'
      "
    >
      <section :class="resourceDialogColumnClass">
        <div class="flex h-7 min-w-0 items-center justify-between gap-2">
          <p class="m-0 min-w-0 truncate text-[14px] leading-6 text-[#6a6a70] dark:text-(--wui-color-text-secondary)">
            支持本地文件与远程链接，支持拖入或粘贴
          </p>
          <div class="flex shrink-0 items-center gap-2">
            <web-ui-tooltip portal content="导入链接" placement="bottom">
              <web-ui-button icon size="28" aria-label="导入链接" :disabled="busy" @click="addUrlOpen = true">
                <web-ui-icon :icon="linkPlus" :size="15" />
              </web-ui-button>
            </web-ui-tooltip>
            <web-ui-tooltip portal content="从剪切板导入" placement="bottom">
              <web-ui-button icon size="28" aria-label="粘贴复制的文件" @click="emit('requestFilePaths')">
                <web-ui-icon :icon="lucideClipboardPaste" :size="15" />
              </web-ui-button>
            </web-ui-tooltip>
          </div>
        </div>
        <!--
          Windows 原生文件对话框（IFileOpenDialog）不支持同时混选文件与文件夹，
          同时开启两 flag 会退化为仅选文件夹；因此在 Windows 上点按上传区弹出轻量菜单区分两种选择，
          macOS / Linux 仍直接唤起统一面板。
        -->
        <web-ui-dropdown v-if="isWindows" placement="bottom" class="grid h-full w-full">
          <button
            slot="trigger"
            type="button"
            class="grid h-full w-full place-content-center justify-items-center gap-3 rounded-[18px] border-0 bg-[#f0f0f4] px-6 py-7 text-center transition-[background-color] duration-(--wui-duration-trigger) hover:bg-[#e9e9ee] file-drop-target-active:scale-[1.005] file-drop-target-active:bg-[color-mix(in_srgb,var(--wui-color-accent,#08f)_9%,transparent)] dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b20)_4%,transparent)] dark:hover:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b20)_7%,transparent)] dark:file-drop-target-active:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b20)_7%,transparent)] mobile:gap-2 mobile:px-4 mobile:py-2"
            data-file-drop-target="library-add-files"
            :class="
              dragActive ? 'scale-[1.005] bg-[color-mix(in_srgb,var(--wui-color-accent,#08f)_9%,transparent)]' : ''
            "
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
                拖入文件或文件夹，或点按选择
              </span>
              <span
                slot="description"
                class="grid gap-0.5 text-xs leading-[1.4] text-[#6a6a70] dark:text-(--wui-color-text-secondary) mobile:text-[11px]"
              >
                <span>支持图片、视频、音频、文档、网页、代码等文件</span>
                <span>可批量导入，文件夹递归展开</span>
              </span>
            </web-ui-empty>
          </button>
          <web-ui-dropdown-item @click="emit('pickFilesOnly')">
            <web-ui-icon slot="prefix" :icon="lucideFile" :size="15" />
            选择文件
          </web-ui-dropdown-item>
          <web-ui-dropdown-item @click="emit('pickDirectories')">
            <web-ui-icon slot="prefix" :icon="lucideFolder" :size="15" />
            选择文件夹
          </web-ui-dropdown-item>
        </web-ui-dropdown>
        <button
          v-else
          type="button"
          class="grid h-full select-none place-content-center justify-items-center gap-3 rounded-[18px] border-0 bg-[#f0f0f4] px-6 py-7 text-center transition-[background-color] duration-(--wui-duration-trigger) hover:bg-[#e9e9ee] file-drop-target-active:scale-[1.005] file-drop-target-active:bg-[color-mix(in_srgb,var(--wui-color-accent,#08f)_9%,transparent)] dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b20)_4%,transparent)] dark:hover:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b20)_7%,transparent)] dark:file-drop-target-active:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b20)_7%,transparent)] mobile:gap-2 mobile:px-4 mobile:py-2"
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
              拖入文件或文件夹，或点按选择
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
              <span>可批量导入，文件夹递归展开</span>
            </span>
          </web-ui-empty>
        </button>
      </section>

      <div class="grid place-items-center text-(--wui-color-text-secondary)" aria-hidden="true">
        <web-ui-icon :icon="doubleArrowRight" :size="24" :class="{ 'rotate-90': mobile }" />
      </div>

      <aside
        :class="[resourceDialogColumnClass, 'relative border-0 bg-transparent p-0']"
        aria-labelledby="library-add-queue-title"
      >
        <div class="flex h-7 min-w-0 items-center justify-between gap-2">
          <h3
            id="library-add-queue-title"
            class="m-0 flex items-center gap-1.5 text-[14px] font-semibold text-[#22212a] dark:text-(--wui-color-text)"
          >
            待导入
          </h3>
          <span
            class="inline-flex h-7 items-center text-xs leading-none text-[#6a6a70] dark:text-(--wui-color-text-secondary)"
          >
            <span
              ><span class="font-mono tabular-nums">{{ queue.length }}</span> 项</span
            >
          </span>
        </div>

        <OverlayScrollbarsComponent
          v-if="queue.length"
          :options="appScrollbarsOptions"
          :class="resourceDialogQueueClass"
          class="[&_[data-overlayscrollbars-viewport]:focus-visible]:rounded-[18px] [&_[data-overlayscrollbars-viewport]:focus-visible]:outline-3 [&_[data-overlayscrollbars-viewport]:focus-visible]:outline-offset-2 [&_[data-overlayscrollbars-viewport]:focus-visible]:outline-(--wui-color-focus-ring,rgb(0_136_255/0.4))"
          @os-initialized="handleQueueScrollbarsInitialized"
          @os-destroyed="handleQueueScrollbarsDestroyed"
        >
          <!--
            scrollbar 接在宿主 div 上，虚拟列表留在它里面：OverlayScrollbars 会把宿主的子节点搬进
            自己生成的 viewport，由 scrollRef 显式指向该 viewport，确保 virtua 测量与滚动监听落在
            真实滚动容器上。editingItemId 经 keepMounted 钉住，避免行内改名时滚出视口被卸载。
          -->
          <Virtualizer
            :key="queueScrollRef ? 'os-viewport' : 'fallback'"
            :data="queue"
            as="ol"
            item="li"
            :item-size="64"
            :buffer-size="256"
            :ssr-count="16"
            :scroll-ref="queueScrollRef"
            :keep-mounted="keepMountedIndices"
            class="m-0 list-none p-0"
          >
            <template #default="{ item, index: itemIndex }">
              <div
                :key="item.id"
                data-dialog-row
                :class="[resourceDialogRowClass, itemIndex === queue.length - 1 ? 'after:hidden' : '']"
              >
                <button
                  v-if="isImagePreviewItem(item)"
                  data-queue-thumbnail
                  type="button"
                  class="grid size-10 shrink-0 cursor-zoom-in place-items-center overflow-hidden rounded-[10px] p-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--wui-color-focus-ring,rgb(0_136_255/0.4))"
                  :aria-label="`预览 ${item.title}`"
                  aria-haspopup="dialog"
                  @click="openImagePreview(item, $event)"
                >
                  <ResourceThumbnail
                    :kind="item.resourceKind"
                    :source="queueSource(item)"
                    :media-url="itemMediaUrl(item)"
                    :pending-token="itemPreviewToken(item)"
                    :capture-scope="captureScopeController.signal"
                  />
                </button>
                <ResourceThumbnail
                  v-else
                  data-queue-thumbnail
                  :kind="item.resourceKind"
                  :source="queueSource(item)"
                  :media-url="itemMediaUrl(item)"
                  :pending-token="itemPreviewToken(item)"
                  :capture-scope="captureScopeController.signal"
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
                      <web-ui-tooltip v-else portal content="重命名" :placement="itemIndex < 5 ? 'bottom' : 'top'">
                        <web-ui-button
                          :ref="setRenameButtonRef(item.id)"
                          icon
                          variant="ghost"
                          size="28"
                          aria-label="重命名"
                          @click="startRename(item)"
                        >
                          <web-ui-icon :icon="lucidePenLine" :size="14" />
                        </web-ui-button>
                      </web-ui-tooltip>
                      <web-ui-tooltip portal content="编辑标签" :placement="itemIndex < 5 ? 'bottom' : 'top'">
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
                      <web-ui-tooltip portal content="移除待导入资源" :placement="itemIndex < 5 ? 'bottom' : 'top'">
                        <web-ui-button
                          class="[--wui-button-color:var(--wui-color-danger,#dc2626)]"
                          icon
                          variant="ghost"
                          size="28"
                          aria-label="移除待导入资源"
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
                    <span
                      v-if="item.status === 'importing'"
                      class="min-w-0 flex-[0_0_100%] text-xs leading-4 text-[#6a6a70] dark:text-(--wui-color-text-secondary)"
                    >
                      导入中…
                    </span>
                    <span
                      v-if="item.status === 'failed'"
                      class="min-w-0 flex-[0_0_100%] wrap-anywhere text-xs leading-4 text-(--wui-color-danger,#dc2626)"
                    >
                      导入失败{{ item.error ? `：${item.error}` : '' }}
                    </span>
                    <div v-if="item.tags.length" class="flex min-w-0 flex-[0_0_100%] flex-wrap items-center gap-[5px]">
                      <ResourceTag v-for="tag in item.tags" :key="tag" :name="tag" :color="props.tagColors[tag]" />
                    </div>
                  </div>
                </span>
              </div>
            </template>
          </Virtualizer>
        </OverlayScrollbarsComponent>

        <div v-else :class="resourceDialogEmptyClass">
          <web-ui-empty class="[--wui-empty-min-height:0] [--wui-empty-padding:0] [--wui-empty-icon-size:40px]">
            <web-ui-icon slot="icon" :icon="andrsrxnInbox" :size="40" />
            <span
              class="text-[16px] font-semibold leading-[1.4] text-[#22212a] dark:text-(--wui-color-text) mobile:text-[13px]"
            >
              暂无待导入资源
            </span>
            <span
              slot="description"
              class="grid gap-0.5 text-xs leading-[1.4] text-[#6a6a70] dark:text-(--wui-color-text-secondary) mobile:text-[11px]"
            >
              <span>导入的资源将显示在此处</span>
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
      <span v-if="busy && progress.total > 0" class="font-mono tabular-nums">{{ submitLabel }}</span>
      <template v-else>{{ submitLabel }}</template>
    </web-ui-button>
  </web-ui-dialog>
  <ResourceLinkDialog v-model:open="addUrlOpen" initial-value="" mode="add" @submit="emit('addUrl', $event)" />
</template>
