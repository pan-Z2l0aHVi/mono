<script setup lang="ts">
import type { WebUiDialog, WebUiEvent, WebUiInput } from '@greypan/web-ui'
import {
  lucideClipboardPaste,
  lucideFile,
  lucideGlobe,
  lucidePenLine,
  lucidePlus,
  lucideTrash2,
  lucideUpload
} from '@greypan/web-ui/icons'
import { onMounted, onScopeDispose, ref, watch } from 'vue'

import type { LibraryQueueItem, LibraryRuntimeKind } from '@/services/library'

import { metadataRowClass } from './presentation'

const props = defineProps<{
  open: boolean
  queue: LibraryQueueItem[]
  runtimeKind: LibraryRuntimeKind
  busy: boolean
  error: string
  mobile: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  pickFiles: []
  dropFiles: [fileTitles: string[]]
  requestFilePaths: []
  remove: [itemId: string]
  rename: [itemId: string, title: string]
  submit: []
}>()

const dragActive = ref(false)
const editingItemId = ref<string | null>(null)
const titleDraft = ref('')

watch(
  () => props.open,
  open => {
    if (!open) return
    dragActive.value = false
    editingItemId.value = null
  }
)

function handleOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  emit('update:open', event.detail.open)
}

function handleDrop(event: DragEvent) {
  dragActive.value = false
  if (props.runtimeKind !== 'fixture') return
  const fileTitles = [...(event.dataTransfer?.files ?? [])].map(file => file.name)
  if (fileTitles.length) emit('dropFiles', fileTitles)
}

function handlePaste(event: ClipboardEvent) {
  if (!props.open) return
  if (isEditableTarget(event.target)) return
  if (props.runtimeKind === 'fixture') {
    const fileTitles = [...(event.clipboardData?.files ?? [])].map(file => file.name)
    if (fileTitles.length) emit('dropFiles', fileTitles)
    return
  }
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
})

function startRename(item: LibraryQueueItem) {
  editingItemId.value = item.id
  titleDraft.value = item.title
}

function handleRenameInput(event: WebUiEvent<WebUiInput, 'input'>) {
  titleDraft.value = event.target.value
}

function commitRename(itemId: string) {
  const title = titleDraft.value.trim()
  if (title) emit('rename', itemId, title)
  editingItemId.value = null
  titleDraft.value = ''
}

function handleRenameKeydown(event: KeyboardEvent, itemId: string) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitRename(itemId)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    editingItemId.value = null
    titleDraft.value = ''
  }
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
            v-if="runtimeKind === 'wails'"
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
            v-for="item in queue"
            :key="item.id"
            :class="[
              metadataRowClass,
              'items-start transition-colors duration-100 hover:bg-black/3 dark:hover:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_5%,transparent)]'
            ]"
          >
            <span
              class="grid size-8 shrink-0 place-items-center rounded-[10px]"
              :class="
                item.kind === 'file'
                  ? 'bg-[rgb(124_58_237/0.1)] text-[#7c3aed]'
                  : 'bg-[rgb(5_150_105/0.1)] text-[#059669]'
              "
            >
              <web-ui-icon :icon="item.kind === 'file' ? lucideFile : lucideGlobe" :size="16" />
            </span>
            <span class="grid min-w-0 flex-[1_1_auto] gap-[5px]">
              <div class="flex h-8 items-center gap-2">
                <span class="flex h-8 min-w-0 flex-[1_1_auto] items-center gap-1.5">
                  <web-ui-input
                    v-if="editingItemId === item.id"
                    v-model="titleDraft"
                    full
                    borderless
                    class="min-w-0 flex-[1_1_auto]"
                    aria-label="待添加资源标题"
                    @input="handleRenameInput"
                    @keydown="handleRenameKeydown($event, item.id)"
                    @blur="commitRename(item.id)"
                  />
                  <span
                    v-else
                    class="min-w-0 flex-[0_1_auto] overflow-hidden text-[14px] font-medium leading-[1.35] text-ellipsis whitespace-nowrap text-[#22212a] dark:text-(--wui-color-text)"
                  >
                    {{ item.title }}
                  </span>
                  <web-ui-button
                    v-if="editingItemId !== item.id"
                    icon
                    variant="ghost"
                    size="28"
                    aria-label="编辑待添加资源标题"
                    @click="startRename(item)"
                  >
                    <web-ui-icon :icon="lucidePenLine" :size="14" />
                  </web-ui-button>
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
              <span
                class="block min-w-0 truncate text-xs leading-5 whitespace-nowrap text-[#6a6a6a] dark:text-(--wui-color-text-secondary)"
                :title="item.location"
              >
                {{ item.location }}
              </span>
            </span>
          </li>
        </ol>

        <div
          v-else
          class="grid h-full min-h-0 place-items-center rounded-3xl bg-white dark:bg-(--wui-color-surface-raised)"
        >
          <web-ui-empty size="small" description="暂无待添加资源" />
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
