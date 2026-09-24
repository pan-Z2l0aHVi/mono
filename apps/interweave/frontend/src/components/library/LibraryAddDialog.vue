<script setup lang="ts">
import type { WebUiDialog, WebUiEvent, WebUiInput } from '@greypan/web-ui'
import { lucideFile, lucideGlobe, lucidePenLine, lucidePlus, lucideTrash2, lucideUpload } from '@greypan/web-ui/icons'
import { ref, watch } from 'vue'

import type { LibraryQueueItem, LibraryRuntimeKind } from '@/services/library'

const props = defineProps<{
  open: boolean
  queue: LibraryQueueItem[]
  runtimeKind: LibraryRuntimeKind
  busy: boolean
  error: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  pickFiles: []
  dropFiles: [fileTitles: string[]]
  addUrl: [url: string]
  remove: [itemId: string]
  rename: [itemId: string, title: string]
  submit: []
}>()

const urlDraft = ref('')
const inputError = ref('')
const dragActive = ref(false)
const editingItemId = ref<string | null>(null)
const titleDraft = ref('')

watch(
  () => props.open,
  open => {
    if (!open) return
    urlDraft.value = ''
    inputError.value = ''
    dragActive.value = false
    editingItemId.value = null
  }
)

function handleOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  emit('update:open', event.detail.open)
}

function handleUrlInput(event: WebUiEvent<WebUiInput, 'input'>) {
  urlDraft.value = event.target.value
  inputError.value = ''
}

function addUrl() {
  const value = urlDraft.value.trim()
  if (!value) return
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('unsupported protocol')
    emit('addUrl', parsed.toString())
    urlDraft.value = ''
    inputError.value = ''
  } catch {
    inputError.value = '请输入有效的 http 或 https URL'
  }
}

function handleUrlKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter') return
  event.preventDefault()
  addUrl()
}

function handleDrop(event: DragEvent) {
  dragActive.value = false
  if (props.runtimeKind !== 'fixture') return
  const fileTitles = [...(event.dataTransfer?.files ?? [])].map(file => file.name)
  if (fileTitles.length) emit('dropFiles', fileTitles)
}

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
    class="[--wui-dialog-width:min(92vw,860px)] [--wui-dialog-max-height:min(90vh,640px)]"
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

    <div class="grid min-h-0 grid-cols-2 gap-5 max-[760px]:grid-cols-1 max-[760px]:overflow-y-auto">
      <div class="grid min-h-72 content-start gap-3 max-[760px]:min-h-0">
        <button
          type="button"
          class="grid min-h-52 w-full place-content-center justify-items-center gap-3 rounded-lg bg-black/3 px-6 py-7 text-center transition-colors hover:bg-black/5 dark:bg-white/5 dark:hover:bg-white/8"
          :class="dragActive ? 'ring-2 ring-(--wui-color-accent)' : ''"
          @click="emit('pickFiles')"
          @dragenter.prevent="dragActive = true"
          @dragover.prevent="dragActive = true"
          @dragleave.prevent="dragActive = false"
          @drop.prevent="handleDrop"
        >
          <span
            class="grid size-12 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--wui-color-accent)_12%,transparent)] text-(--wui-color-accent)"
          >
            <web-ui-icon :icon="lucideUpload" :size="23" />
          </span>
          <span class="text-sm font-semibold">选择本地文件</span>
          <span class="text-xs text-(--wui-color-text-secondary)">PNG · JPG · PDF · 文档 · 音频 · 视频</span>
        </button>

        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <web-ui-input
            :value="urlDraft"
            placeholder="https://example.com/page"
            aria-label="资源 URL"
            :aria-invalid="inputError ? 'true' : undefined"
            @input="handleUrlInput"
            @keydown="handleUrlKeydown"
          >
            <web-ui-icon slot="prefix" :icon="lucideGlobe" />
          </web-ui-input>
          <web-ui-button icon variant="secondary" aria-label="加入 URL" :disabled="!urlDraft.trim()" @click="addUrl">
            <web-ui-icon :icon="lucidePlus" />
          </web-ui-button>
        </div>
        <p v-if="inputError" class="m-0 text-xs text-(--wui-color-danger)" role="alert">{{ inputError }}</p>
      </div>

      <section class="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5" aria-labelledby="library-add-queue-title">
        <div class="flex min-h-7 items-center justify-between gap-3">
          <h3 id="library-add-queue-title" class="m-0 text-[13px] font-semibold">将添加</h3>
          <span class="rounded-full bg-black/5 px-2 py-1 text-xs dark:bg-white/8">{{ queue.length }} 项</span>
        </div>

        <div v-if="queue.length" class="h-full min-h-0 overflow-y-auto rounded-lg bg-black/3 dark:bg-white/5">
          <div
            v-for="item in queue"
            :key="item.id"
            class="relative flex min-w-0 items-start gap-2.5 px-3 py-3 after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-black/8 after:content-[''] last:after:hidden dark:after:bg-white/10"
          >
            <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-black/5 dark:bg-white/8">
              <web-ui-icon :icon="item.kind === 'file' ? lucideFile : lucideGlobe" :size="15" />
            </span>
            <div class="grid min-w-0 flex-1 gap-1">
              <div class="flex min-w-0 items-center gap-1">
                <web-ui-input
                  v-if="editingItemId === item.id"
                  v-model="titleDraft"
                  full
                  borderless
                  aria-label="待添加资源标题"
                  @input="handleRenameInput"
                  @keydown="handleRenameKeydown($event, item.id)"
                  @blur="commitRename(item.id)"
                />
                <span v-else class="min-w-0 flex-1 truncate text-sm font-medium">{{ item.title }}</span>
                <web-ui-button
                  v-if="editingItemId !== item.id"
                  icon
                  variant="ghost"
                  size="26"
                  aria-label="编辑待添加资源标题"
                  @click="startRename(item)"
                >
                  <web-ui-icon :icon="lucidePenLine" :size="12" />
                </web-ui-button>
                <web-ui-button
                  icon
                  variant="ghost"
                  size="26"
                  aria-label="移除待添加资源"
                  @click="emit('remove', item.id)"
                >
                  <web-ui-icon :icon="lucideTrash2" :size="12" />
                </web-ui-button>
              </div>
              <span class="block min-w-0 truncate text-xs text-(--wui-color-text-secondary)" :title="item.location">
                {{ item.location }}
              </span>
            </div>
          </div>
        </div>

        <div
          v-else
          class="grid min-h-52 place-items-center rounded-lg border border-dashed border-black/10 dark:border-white/10"
        >
          <web-ui-empty size="small" description="暂无待添加资源" />
        </div>
      </section>
    </div>

    <div slot="footer" class="grid grid-cols-2 gap-3">
      <web-ui-button full variant="secondary" :disabled="busy" @click="emit('update:open', false)">取消</web-ui-button>
      <web-ui-button full variant="primary" :loading="busy" :disabled="queue.length === 0" @click="emit('submit')">
        {{ queue.length > 1 ? `添加 ${queue.length} 项` : '添加' }}
      </web-ui-button>
    </div>
  </web-ui-dialog>
</template>
