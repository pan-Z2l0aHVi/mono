<script setup lang="ts">
import { toast, type WebUiDialog, type WebUiEvent } from '@greypan/web-ui'
import {
  akarIconsCircleCheck,
  emojioneMonotoneStopButton,
  iconParkSolidRadarTwo,
  lucideChevronRight,
  lucideFile
} from '@greypan/web-ui/icons'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { userMessage } from '@/services/library/userMessage'
import type { ResourceKind, ResourceSourceView } from '@/stores/library'

import { doubleArrowRight } from './icons'
import { formatSize } from './presentation'
import { resourceDialogColumnClass, resourceDialogQueueClass } from './resourceDialogStyles'
import ResourceLinkDialog from './ResourceLinkDialog.vue'
import type { LibraryRestoreQueueItem, RecoveryCandidate, RecoveryScanUpdate } from './restore'
import RestoreRow from './RestoreRow.vue'

const props = defineProps<{
  open: boolean
  queue: LibraryRestoreQueueItem[]
  busy: boolean
  error: string
  mobile: boolean
  activeItemId: string | null
  allUnavailableFiles: LibraryRestoreQueueItem[]
  failedIds: string[]
  chooseFilePath: () => Promise<string | null>
  chooseDirectory: () => Promise<string | null>
  startScan: (ids: string[], directory: string) => Promise<string>
  pollScan: (id: string) => Promise<RecoveryScanUpdate>
  cancelScan: (id: string) => Promise<void>
  discardScan: (id: string) => Promise<void>
  prepareFilePreview: (path: string) => Promise<{ kind: ResourceKind; token?: string; media_url?: string }>
  releaseFilePreview: (token: string) => Promise<void>
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [items: LibraryRestoreQueueItem[]]
  addItems: [items: LibraryRestoreQueueItem[]]
}>()

const scanChoiceOpen = ref(false)
const candidateItem = ref<LibraryRestoreQueueItem | null>(null)
const candidates = ref<Record<string, RecoveryCandidate[]>>({})
const manual = ref<Record<string, boolean>>({})
const snapshots = ref<Record<string, string>>({})
const scanning = ref(false)
const scanProgress = ref<RecoveryScanUpdate | null>(null)
const scanIncomplete = ref(false)
let scanId: string | null = null
let stopRequested = false
const stopping = ref(false)
let scanGeneration = 0
let pollTimer: ReturnType<typeof setTimeout> | null = null
function stopScan() {
  scanGeneration++
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = null
  const id = scanId
  scanId = null
  scanning.value = false
  stopping.value = false
  stopRequested = false
  if (id) void props.discardScan(id).catch(console.error)
}
function requestStop() {
  stopRequested = true
  stopping.value = true
  scanIncomplete.value = true
  if (scanId)
    void props.cancelScan(scanId).catch(cause => {
      validationError.value = userMessage(cause, '停止扫描失败，请重试')
      stopping.value = false
    })
}
function mergeCandidate(candidate: RecoveryCandidate) {
  const list = candidates.value[candidate.sourceID] ?? []
  const next = [...list.filter(item => item.path !== candidate.path), candidate]
  candidates.value[candidate.sourceID] = next
  if (manual.value[candidate.sourceID]) return
  if (next.length === 1) {
    prepared.value[candidate.sourceID] = candidate.path
    snapshots.value[candidate.sourceID] = candidate.snapshot
    void prepareThumbnail(candidate.sourceID, candidate.path, generation)
  } else {
    delete prepared.value[candidate.sourceID]
    delete snapshots.value[candidate.sourceID]
    releasePreview(candidate.sourceID)
  }
}
function openScanChoice() {
  scanChoiceOpen.value = true
}
async function beginScan(directory: string) {
  const request = ++scanGeneration
  scanning.value = true
  scanIncomplete.value = false
  validationError.value = ''
  const items = [...props.queue]
  for (const item of props.allUnavailableFiles) if (!items.some(existing => existing.id === item.id)) items.push(item)
  emit('addItems', items)
  toast.info(`已找到 ${items.filter(item => item.kind === 'file').length} 条失效资源`, { position: 'top-center' })
  try {
    const id = await props.startScan(
      items.filter(item => item.kind === 'file').map(item => item.sourceId),
      directory
    )
    if (request !== scanGeneration) {
      void props.discardScan(id).catch(console.error)
      return
    }
    scanId = id
    if (stopRequested) await props.cancelScan(id)
    const poll = async () => {
      try {
        const update = await props.pollScan(id)
        if (request !== scanGeneration) return
        scanProgress.value = update
        for (const candidate of update.candidates) mergeCandidate(candidate)
        if (update.done) {
          scanId = null
          scanning.value = false
          stopping.value = false
          stopRequested = false
          scanIncomplete.value = update.cancelled || !!update.error
          if (update.error) validationError.value = userMessage(update.error, '扫描失败，请重试')
        } else pollTimer = setTimeout(() => void poll(), 250)
      } catch (cause) {
        if (request !== scanGeneration) return
        scanning.value = false
        stopping.value = false
        scanIncomplete.value = true
        scanId = null
        void props.discardScan(id).catch(console.error)
        validationError.value = userMessage(cause, '扫描失败，请重试')
      }
    }
    await poll()
  } catch (cause) {
    if (request !== scanGeneration) return
    scanning.value = false
    stopping.value = false
    if (scanId) void props.discardScan(scanId).catch(console.error)
    scanId = null
    validationError.value = userMessage(cause, '启动扫描失败，请重试')
  }
}
function scanAllDisks() {
  scanChoiceOpen.value = false
  void beginScan('')
}
async function chooseScanDirectory() {
  const request = generation
  scanChoiceOpen.value = false
  picking.value = 'directory'
  try {
    const directory = await props.chooseDirectory()
    if (directory && props.open && request === generation) void beginScan(directory)
  } catch (cause) {
    if (request === generation) validationError.value = userMessage(cause, '选择文件夹失败，请重试')
  } finally {
    if (request === generation) picking.value = null
  }
}
function matchReason(reason: string) {
  return (
    ({ identity: '可能是原文件', hash: '内容一致', name: '文件名一致' } as Record<string, string>)[reason] ?? '可能匹配'
  )
}
function chooseCandidate(candidate: RecoveryCandidate) {
  manual.value[candidate.sourceID] = true
  prepared.value[candidate.sourceID] = candidate.path
  snapshots.value[candidate.sourceID] = candidate.snapshot
  candidateItem.value = null
  void prepareThumbnail(candidate.sourceID, candidate.path, generation)
}
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
  () => props.failedIds,
  ids => {
    for (const id of ids) {
      delete prepared.value[id]
      delete candidates.value[id]
      delete manual.value[id]
      delete snapshots.value[id]
      releasePreview(id)
    }
  }
)
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
  stopScan()
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
    stopScan()
    clearPreviews()
    scanChoiceOpen.value = false
    candidateItem.value = null
    candidates.value = {}
    manual.value = {}
    snapshots.value = {}
    scanProgress.value = null
    scanIncomplete.value = false
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
  if (event.target !== event.currentTarget || locked.value || scanning.value) return
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
      manual.value[item.id] = true
      delete snapshots.value[item.id]
      prepared.value[item.id] = path
      void prepareThumbnail(item.id, path, request)
    }
  } catch (cause) {
    if (request === generation) validationError.value = userMessage(cause, '选择文件失败，请重试')
  } finally {
    if (request === generation) picking.value = null
  }
}

function cancelPrepare(item: LibraryRestoreQueueItem) {
  if (locked.value) return
  if (item.kind === 'url') drafts.value[item.id] = prepared.value[item.id]
  delete prepared.value[item.id]
  manual.value[item.id] = true
  delete snapshots.value[item.id]
  releasePreview(item.id)
}

function submit() {
  if (locked.value || scanning.value || !readyItems.value.length) return
  emit(
    'submit',
    readyItems.value.map(item => ({
      ...item,
      replacementLocation: prepared.value[item.id],
      scanSnapshot: snapshots.value[item.id]
    }))
  )
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
    <span slot="header">找回资源</span>
    <div class="flex h-(--wui-dialog-max-height) min-h-0 flex-col">
      <p
        v-if="validationError || error"
        class="m-0 rounded-md bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 dark:bg-red-400/12 dark:text-red-200"
        role="alert"
      >
        {{ validationError || error }}
      </p>
      <div
        class="grid min-h-0 flex-1"
        :class="
          mobile
            ? 'grid-cols-1 grid-rows-[minmax(0,1fr)_20px_minmax(0,1fr)]'
            : 'grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)]'
        "
      >
        <template v-for="column in ['pending', 'ready']" :key="column">
          <section :class="resourceDialogColumnClass" :aria-label="column === 'pending' ? '待找回' : '已找到'">
            <div class="flex h-7 min-w-0 items-center justify-between gap-2">
              <h3 class="m-0 text-[14px] font-semibold text-[#22212a] dark:text-(--wui-color-text)">
                {{ column === 'pending' ? '待找回' : '已找到' }}
              </h3>
              <span class="text-xs text-[#6a6a70] dark:text-(--wui-color-text-secondary)"
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
                    : '手动找回失效资源，或一键扫描找回'
                "
                class="[--wui-empty-min-height:0] [--wui-empty-padding:0]"
              >
                <web-ui-icon
                  v-if="column === 'pending' && readyItems.length"
                  slot="icon"
                  :icon="akarIconsCircleCheck"
                  :size="40"
                />
              </web-ui-empty>
            </div>
            <div v-else :class="resourceDialogQueueClass">
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
                  @cancel-prepare="cancelPrepare(item)"
                  @choose-candidates="candidateItem = item"
                  :candidate-count="candidates[item.id]?.length ?? 0"
                  :match-reasons="
                    snapshots[item.id]
                      ? (candidates[item.id]
                          ?.find(candidate => candidate.path === prepared[item.id])
                          ?.matchReasons.map(matchReason) ?? [])
                      : []
                  "
                />
              </ol>
            </div>
          </section>
          <div
            v-if="column === 'pending'"
            class="grid place-items-center text-(--wui-color-text-secondary)"
            aria-hidden="true"
          >
            <web-ui-icon :icon="doubleArrowRight" :size="24" :class="{ 'rotate-90': mobile }" />
          </div>
        </template>
      </div>
      <div
        v-if="scanning || scanProgress || scanIncomplete"
        role="status"
        class="mt-2 shrink-0 items-center gap-4 rounded-[18px] bg-[#eceef4] p-3 dark:bg-white/6"
        :class="[mobile ? 'block' : 'flex', { 'motion-reduced': !scanning }]"
      >
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <web-ui-spinner v-if="scanning" :size="16" class="shrink-0" />
          <div class="min-w-0 flex-1">
            <div class="scan-shimmer font-semibold text-(--wui-color-text)">
              {{ scanning ? '正在扫描文件' : scanIncomplete ? '扫描未完成' : '扫描完成' }}
            </div>
            <div
              v-if="scanning && scanProgress?.currentDirectory"
              class="scan-shimmer truncate text-xs text-(--wui-color-text-secondary)"
              :title="scanProgress.currentDirectory"
            >
              正在检查 {{ scanProgress.currentDirectory }}
            </div>
          </div>
        </div>
        <div
          class="scan-stats flex shrink-0 gap-4 text-xs text-(--wui-color-text-secondary)"
          :class="{ 'mt-2': mobile }"
        >
          <span class="scan-shimmer grid gap-0.5 whitespace-nowrap"
            ><strong class="text-sm text-(--wui-color-text)">{{ (scanProgress?.checked ?? 0).toLocaleString() }}</strong
            >已检查</span
          >
          <span class="scan-shimmer grid gap-0.5 whitespace-nowrap"
            ><strong class="scan-shimmer text-sm text-(--wui-color-accent)">{{
              Object.values(candidates).filter(items => items.length).length
            }}</strong
            >已找到</span
          >
          <span class="scan-shimmer grid gap-0.5 whitespace-nowrap"
            ><strong class="text-sm text-(--wui-color-text)">{{ scanProgress?.skipped ?? 0 }}</strong
            >已跳过</span
          >
        </div>
      </div>
    </div>
    <web-ui-button
      v-if="!scanning"
      slot="footer"
      variant="ghost"
      class="mr-auto shrink-0 [--wui-button-color:var(--wui-color-accent)]"
      :disabled="locked"
      @click="openScanChoice"
    >
      <web-ui-icon slot="prefix" :icon="iconParkSolidRadarTwo" :size="16" />一键扫描
    </web-ui-button>
    <web-ui-button
      v-if="scanning"
      slot="footer"
      variant="ghost"
      class="mr-auto shrink-0 [--wui-button-color:var(--wui-color-danger)]"
      :disabled="stopping"
      @click="requestStop"
      ><web-ui-icon slot="prefix" :icon="emojioneMonotoneStopButton" :size="16" />{{
        stopping ? '正在停止' : '停止扫描'
      }}</web-ui-button
    >
    <web-ui-button
      slot="footer"
      :full="mobile"
      variant="secondary"
      class="cancel-button"
      :disabled="locked || scanning"
      @click="emit('update:open', false)"
      >取消</web-ui-button
    >
    <web-ui-button
      slot="footer"
      :full="mobile"
      variant="primary"
      :loading="busy"
      :disabled="locked || scanning || readyItems.length === 0"
      @click="submit"
    >
      <web-ui-icon slot="prefix" :icon="akarIconsCircleCheck" />确认找回
    </web-ui-button>
  </web-ui-dialog>
  <web-ui-dialog :open="scanChoiceOpen" controlled no-backdrop-close @open-change="scanChoiceOpen = $event.detail.open">
    <span slot="header">扫描范围</span>
    <p>选择要查找的位置，包含其中所有子文件夹</p>
    <web-ui-button slot="footer" full variant="primary" @click="chooseScanDirectory">扫描选定文件夹</web-ui-button>
    <web-ui-button slot="footer" full variant="secondary" @click="scanAllDisks">扫描全盘</web-ui-button>
    <web-ui-button slot="footer" full variant="secondary" @click="scanChoiceOpen = false">取消</web-ui-button>
  </web-ui-dialog>
  <web-ui-dialog
    :open="candidateItem !== null"
    controlled
    no-backdrop-close
    @open-change="!$event.detail.open && (candidateItem = null)"
  >
    <span slot="header">选择找回的文件</span>
    <p v-if="candidateItem" class="mt-0 mb-3 text-xs text-(--wui-color-text-secondary)">
      为「{{ candidateItem.resourceTitle }}」选择匹配的文件
    </p>
    <ul v-if="candidateItem" class="m-0 flex list-none flex-col gap-2 p-0">
      <li v-for="candidate in candidates[candidateItem.id]" :key="candidate.path">
        <button
          type="button"
          class="candidate-option flex w-full cursor-pointer items-center gap-3 rounded-xl border-0 bg-(--wui-color-surface-raised,white) p-3 text-left text-(--wui-color-text) hover:bg-[color-mix(in_srgb,var(--wui-color-accent)_10%,var(--wui-color-surface-raised,white))] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--wui-color-focus-ring)"
          @click="chooseCandidate(candidate)"
        >
          <span
            class="candidate-icon grid size-9 shrink-0 place-items-center rounded-[9px] bg-[color-mix(in_srgb,var(--wui-color-accent)_14%,transparent)] text-(--wui-color-accent)"
            ><web-ui-icon :icon="lucideFile" :size="18"
          /></span>
          <span class="min-w-0 flex-1">
            <strong class="block truncate text-sm">{{ candidate.path.split('/').pop() || candidate.path }}</strong>
            <span class="block wrap-anywhere text-xs text-(--wui-color-text-secondary)">{{ candidate.path }}</span>
            <span class="block text-xs text-(--wui-color-text-secondary)"
              >{{ formatSize(candidate.size) }} · {{ new Date(candidate.modifiedAt).toLocaleString() }} ·
              {{ candidate.matchReasons.map(matchReason).join('、') }}</span
            >
          </span>
          <web-ui-icon :icon="lucideChevronRight" :size="16" class="shrink-0 text-(--wui-color-text-secondary)" />
        </button>
      </li>
    </ul>
    <web-ui-button slot="footer" full variant="secondary" @click="candidateItem = null">取消</web-ui-button>
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

<style scoped>
.cancel-button::part(button) {
  min-width: 76px;
}

.scan-shimmer {
  background: linear-gradient(
    90deg,
    currentColor 0%,
    currentColor 25%,
    color-mix(in srgb, currentcolor 25%, #fff) 50%,
    currentColor 75%,
    currentColor 100%
  );
  background-position: 100% 0;
  background-clip: text;
  background-size: 250% 100%;

  animation: scan-shimmer 1.8s linear infinite;

  -webkit-text-fill-color: transparent;
}

@keyframes scan-shimmer {
  to {
    background-position: -66.67% 0;
  }
}

.motion-reduced .scan-shimmer,
:global(web-ui-theme[motion='reduced']) .scan-shimmer {
  background: none;
  animation: none;

  -webkit-text-fill-color: currentcolor;
}

@media (prefers-reduced-motion: reduce) {
  .scan-shimmer {
    background: none;
    animation: none;

    -webkit-text-fill-color: currentcolor;
  }
}
</style>
