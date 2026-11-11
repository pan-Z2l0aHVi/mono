<script setup lang="ts">
import appScrollbarsOptions from '@greypan/app-scrollbars'
import { toast, type WebUiDialog, type WebUiEvent } from '@greypan/web-ui'
import { akarIconsCircleCheck } from '@greypan/web-ui/icons'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import type { ResourceKind, ResourceSourceView } from '@/stores/library'

import { doubleArrowRight, radarTwo } from './icons'
import { resourceDialogColumnClass, resourceDialogQueueClass } from './resourceDialogStyles'
import ResourceLinkDialog from './ResourceLinkDialog.vue'
import type { LibraryRestoreQueueItem } from './restore'
import RestoreRow from './RestoreRow.vue'

const props = defineProps<{
  open: boolean
  queue: LibraryRestoreQueueItem[]
  busy: boolean
  error: string
  mobile: boolean
  activeItemId: string | null
  chooseFilePath: () => Promise<string | null>
  prepareFilePreview: (path: string) => Promise<{ kind: ResourceKind; token?: string; media_url?: string }>
  releaseFilePreview: (token: string) => Promise<void>
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [items: LibraryRestoreQueueItem[]]
}>()

const dialogRef = ref<WebUiDialog | null>(null)
const drafts = ref<Record<string, string>>({})
const prepared = ref<Record<string, string>>({})
const picking = ref<string | null>(null)
const validationError = ref('')
const editingUrlItem = ref<LibraryRestoreQueueItem | null>(null)
const urlDraft = ref('')
const previews = ref<
  Record<string, { kind: ResourceKind; token: string | null; mediaUrl: string | null; path: string }>
>({})
const previewVersions = new Map<string, number>()
function releasePreview(id: string) {
  previewVersions.set(id, (previewVersions.get(id) ?? 0) + 1)
  const preview = previews.value[id]
  delete previews.value[id]
  if (preview?.token) void props.releaseFilePreview(preview.token).catch(console.error)
}
function clearPreviews() {
  for (const id of Object.keys(previews.value)) releasePreview(id)
}
function previewSource(id: string): ResourceSourceView | null {
  const preview = previews.value[id]
  if (!preview) return null
  return {
    id,
    type: 'file',
    location: preview.path,
    available: true,
    isPreferred: true,
    orderIndex: 0,
    mediaUrl: preview.mediaUrl,
    thumbnailUrl: null,
    metadata: null
  }
}
async function prepareThumbnail(id: string, path: string, request: number) {
  const version = (previewVersions.get(id) ?? 0) + 1
  previewVersions.set(id, version)
  try {
    const preview = await props.prepareFilePreview(path)
    if (
      request !== generation ||
      previewVersions.get(id) !== version ||
      prepared.value[id] !== path ||
      !props.queue.some(item => item.id === id)
    ) {
      if (preview.token) await props.releaseFilePreview(preview.token)
      return
    }
    previews.value[id] = { kind: preview.kind, token: preview.token ?? null, mediaUrl: preview.media_url ?? null, path }
  } catch (error) {
    console.error('准备找回资源缩略图失败', error)
  }
}
watch(
  () => props.queue.map(item => item.id).join('|'),
  () => {
    for (const id of Object.keys(previews.value)) {
      if (!props.queue.some(item => item.id === id)) releasePreview(id)
    }
  }
)
onBeforeUnmount(() => {
  generation++
  clearPreviews()
})
let generation = 0
const pendingItems = computed(() => props.queue.filter(item => !prepared.value[item.id]))
const readyItems = computed(() => props.queue.filter(item => !!prepared.value[item.id]))
const locked = computed(() => props.busy || picking.value !== null)

watch(
  () => props.open,
  open => {
    generation++
    clearPreviews()
    editingUrlItem.value = null
    if (open) {
      drafts.value = {}
      prepared.value = {}
      picking.value = null
      validationError.value = ''
    }
  },
  { immediate: true }
)

function handleOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target !== event.currentTarget || locked.value) return
  emit('update:open', event.detail.open)
}

function completeUrl(value: string) {
  const item = editingUrlItem.value
  if (!item) return
  drafts.value[item.id] = value
  prepared.value[item.id] = value
  editingUrlItem.value = null
}

async function prepare(item: LibraryRestoreQueueItem) {
  if (locked.value) return
  validationError.value = ''
  if (item.kind === 'url') {
    urlDraft.value = drafts.value[item.id] ?? ''
    editingUrlItem.value = item
    return
  }
  const request = generation
  picking.value = item.id
  try {
    const path = await props.chooseFilePath()
    if (request === generation && path) {
      prepared.value[item.id] = path
      void prepareThumbnail(item.id, path, request)
    }
  } catch (cause) {
    if (request === generation) validationError.value = cause instanceof Error ? cause.message : '选择文件失败，请重试'
  } finally {
    if (request === generation) picking.value = null
  }
}

function unprepare(item: LibraryRestoreQueueItem) {
  if (locked.value) return
  if (item.kind === 'url') drafts.value[item.id] = prepared.value[item.id]
  delete prepared.value[item.id]
  releasePreview(item.id)
}

function submit() {
  if (locked.value || !readyItems.value.length) return
  emit(
    'submit',
    readyItems.value.map(item => ({ ...item, replacementLocation: prepared.value[item.id] }))
  )
}
</script>

<template>
  <web-ui-dialog
    ref="dialogRef"
    :open="open"
    controlled
    no-backdrop-close
    footer-orientation="horizontal"
    :style="{ '--wui-dialog-footer-justify': mobile ? undefined : 'flex-end' }"
    class="[--wui-dialog-width:min(90vw,880px)] [--wui-dialog-max-height:calc(min(82vh,560px)_-_142px)]"
    @open-change="handleOpenChange"
  >
    <span slot="header">找回资源</span>
    <p
      v-if="validationError || error"
      class="m-0 rounded-md bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 dark:bg-red-400/12 dark:text-red-200"
      role="alert"
    >
      {{ validationError || error }}
    </p>
    <div
      class="grid min-h-0 grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] max-[900px]:grid-cols-1 max-[900px]:grid-rows-[minmax(0,1fr)_28px_minmax(0,1fr)]"
      style="height: var(--wui-dialog-max-height)"
    >
      <template v-for="column in ['pending', 'ready']" :key="column">
        <section :class="resourceDialogColumnClass" :aria-label="column === 'pending' ? '待找回' : '已找到'">
          <div class="flex h-7 min-w-0 items-center justify-between gap-2">
            <h3 class="m-0 text-[14px] font-semibold text-[#22212a] dark:text-(--wui-color-text)">
              {{ column === 'pending' ? '待找回' : '已找到' }}
            </h3>
            <span class="text-xs text-[#6a6a6a] dark:text-(--wui-color-text-secondary)"
              >{{ (column === 'pending' ? pendingItems : readyItems).length }} 项</span
            >
          </div>
          <div
            v-if="!(column === 'pending' ? pendingItems : readyItems).length"
            class="grid h-full min-h-0 place-items-center rounded-[18px] bg-white p-4 dark:bg-(--wui-color-surface-raised)"
          >
            <web-ui-empty
              :size="40"
              :description="
                column === 'pending'
                  ? readyItems.length
                    ? '已选好新位置，请确认找回'
                    : '暂无失效资源，请关闭弹窗'
                  : '点击失效资源的按钮手动找回'
              "
              class="[--wui-empty-min-height:0] [--wui-empty-padding:0]"
            ></web-ui-empty>
          </div>
          <OverlayScrollbarsComponent v-else :options="appScrollbarsOptions" :class="resourceDialogQueueClass">
            <ol class="m-0 list-none p-0">
              <RestoreRow
                v-for="item in column === 'pending' ? pendingItems : readyItems"
                :key="item.id"
                :item="item"
                :pending="column === 'pending'"
                :location="prepared[item.id] ?? ''"
                :preview="previews[item.id]"
                :source="previewSource(item.id)"
                :locked="locked"
                :active="activeItemId === item.id"
                @prepare="prepare(item)"
                @unprepare="unprepare(item)"
              />
            </ol>
          </OverlayScrollbarsComponent>
        </section>
        <div
          v-if="column === 'pending'"
          class="grid place-items-center text-(--wui-color-text-secondary) max-[900px]:pt-1"
          aria-hidden="true"
        >
          <web-ui-icon :icon="doubleArrowRight" :size="24" class="max-[900px]:rotate-90" />
        </div>
      </template>
    </div>
    <web-ui-button
      slot="footer"
      variant="ghost"
      class="mr-auto shrink-0 [--wui-button-color:var(--wui-color-accent)]"
      :disabled="locked"
      @click="
        toast.info('一键扫描暂不可用，请手动选择资源位置', {
          container: dialogRef?.shadowRoot?.querySelector('dialog') ?? undefined
        })
      "
    >
      <web-ui-icon slot="prefix" :icon="radarTwo" :size="16" />一键扫描
    </web-ui-button>
    <web-ui-button
      slot="footer"
      :full="mobile"
      variant="secondary"
      :disabled="locked"
      @click="emit('update:open', false)"
      >取消</web-ui-button
    >
    <web-ui-button
      slot="footer"
      :full="mobile"
      variant="primary"
      :loading="busy"
      :disabled="locked || readyItems.length === 0"
      @click="submit"
    >
      <web-ui-icon slot="prefix" :icon="akarIconsCircleCheck" />确认找回
    </web-ui-button>
  </web-ui-dialog>
  <ResourceLinkDialog
    :open="editingUrlItem !== null"
    :initial-value="urlDraft"
    mode="restore"
    @update:open="
      value => {
        if (!value) editingUrlItem = null
      }
    "
    @submit="completeUrl"
  />
</template>
