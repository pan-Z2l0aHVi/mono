<script setup lang="ts">
import { toast, type WebUiDialog, type WebUiEvent, type WebUiSwitch } from '@greypan/web-ui'
import {
  akarIconsCircleCheck,
  emojioneMonotoneStopButton,
  lucideChevronRight,
  lucideFile,
  wordpressDashboard
} from '@greypan/web-ui/icons'
import { Virtualizer } from 'virtua/vue'
import { computed, onBeforeUnmount, watch } from 'vue'

import { useLingering } from '@/composables/useLingering'
import { formatBatchTimeEstimate } from '@/pages/library/libraryWorkflow'

import { doubleArrowRight } from './icons'
import { formatDate, formatSize, monoDigitsClass, splitNumericSegments } from './presentation'
import type { PreviewLease } from './previewLease'
import { resourceDialogColumnClass, resourceDialogQueueClass } from './resourceDialogStyles'
import ResourceLinkDialog from './ResourceLinkDialog.vue'
import type { LibraryRestoreQueueItem, RecoveryScanUpdate } from './restore'
import RestoreRow from './RestoreRow.vue'
import { createRestoreSession, formatMatchReason } from './restoreSession'

const props = defineProps<{
  open: boolean
  queue: LibraryRestoreQueueItem[]
  busy: boolean
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
  /** 与添加队列共用一本预览账本：prepare/revoke/驱逐对账都由它承担。 */
  lease: PreviewLease
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [items: LibraryRestoreQueueItem[]]
}>()

const session = createRestoreSession(
  {
    open: () => props.open,
    queue: () => props.queue,
    busy: () => props.busy,
    allUnavailableFiles: () => props.allUnavailableFiles,
    failedIds: () => props.failedIds
  },
  {
    chooseFilePath: () => props.chooseFilePath(),
    chooseDirectory: () => props.chooseDirectory(),
    startScan: (ids, directory) => props.startScan(ids, directory),
    pollScan: id => props.pollScan(id),
    cancelScan: id => props.cancelScan(id),
    discardScan: id => props.discardScan(id),
    lease: props.lease,
    notifyInfo: message => toast.info(message, { position: 'top-center' }),
    notifyError: message => toast.error(message, { position: 'top-center' }),
    onSubmit: items => emit('submit', items)
  }
)

const {
  scanChoiceOpen,
  includeOtherUnavailable,
  otherUnavailableFiles,
  candidateItem,
  candidates,
  scanProgress,
  scanning,
  stopping,
  scanIncomplete,
  prepared,
  editingUrlItem,
  urlDraft,
  previews,
  pendingItems,
  readyItems,
  locked,
  canClose
} = session

const scanTargetCount = computed(
  () =>
    props.queue.filter(item => item.kind === 'file').length +
    (includeOtherUnavailable.value ? otherUnavailableFiles.value.length : 0)
)
const scanTimeEstimate = computed(() => formatBatchTimeEstimate(scanTargetCount.value))
const renderedCandidateItem = useLingering(candidateItem)
watch(
  () => props.open,
  open => {
    if (open) renderedCandidateItem.value = null
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  session.dispose()
})

function handleOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target !== event.currentTarget || !canClose.value) return
  emit('update:open', event.detail.open)
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
                ><span class="font-mono tabular-nums">{{
                  (column === 'pending' ? pendingItems : readyItems).length
                }}</span>
                项</span
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
            <div v-else data-virtual-scrollport :class="resourceDialogQueueClass">
              <Virtualizer
                :data="column === 'pending' ? pendingItems : readyItems"
                as="ol"
                item="li"
                :item-size="64"
                :buffer-size="256"
                :ssr-count="16"
                class="m-0 list-none p-0"
              >
                <template #default="{ item, index }">
                  <RestoreRow
                    :key="item.id"
                    :item="item"
                    :pending="column === 'pending'"
                    :location="prepared[item.id] ?? ''"
                    :preview="previews[item.id]"
                    :source="session.previewSource(item.id)"
                    :locked="locked"
                    :active="activeItemId === item.id"
                    :is-last="index === (column === 'pending' ? pendingItems.length : readyItems.length) - 1"
                    @prepare="session.prepare(item)"
                    @cancel-prepare="session.cancelPrepare(item)"
                    @choose-candidates="session.openCandidates(item)"
                    :candidate-count="candidates[item.id]?.length ?? 0"
                    :match-reasons="session.matchReasonsFor(item.id)"
                  />
                </template>
              </Virtualizer>
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
        class="scan-status relative mt-4 shrink-0 items-center gap-4 overflow-hidden rounded-[18px] bg-[#eceef4] p-3 dark:bg-white/6"
        :class="[mobile ? 'block' : 'flex', { 'scan-status-active': scanning, 'motion-reduced': !scanning }]"
      >
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <web-ui-spinner v-if="scanning" :size="16" class="shrink-0" />
          <div class="min-w-0 flex-1">
            <div class="font-semibold text-(--wui-color-text)">
              {{ scanning ? '正在扫描文件' : scanIncomplete ? '扫描未完成' : '扫描完成' }}
            </div>
            <div
              v-if="scanning && scanProgress?.currentDirectory"
              class="truncate text-xs text-(--wui-color-text-secondary)"
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
          <span class="grid gap-0.5 whitespace-nowrap"
            ><strong class="font-mono text-sm tabular-nums text-(--wui-color-text)">{{
              (scanProgress?.checked ?? 0).toLocaleString()
            }}</strong
            >已检查</span
          >
          <span class="grid gap-0.5 whitespace-nowrap"
            ><strong class="font-mono text-sm tabular-nums text-(--wui-color-text)">{{
              scanProgress?.skipped ?? 0
            }}</strong
            >已跳过</span
          >
          <span class="grid gap-0.5 whitespace-nowrap"
            ><strong class="font-mono text-sm tabular-nums text-(--wui-color-accent)">{{
              Object.values(candidates).filter(items => items.length).length
            }}</strong
            >已找到</span
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
      @click="session.openScanChoice()"
    >
      <web-ui-icon slot="prefix" :icon="wordpressDashboard" :size="20" />一键扫描
    </web-ui-button>
    <web-ui-button
      v-if="scanning"
      slot="footer"
      variant="ghost"
      class="mr-auto shrink-0 [--wui-button-color:var(--wui-color-danger)]"
      :disabled="stopping"
      @click="session.requestStopScan()"
      ><web-ui-icon slot="prefix" :icon="emojioneMonotoneStopButton" :size="16" />{{
        stopping ? '正在停止' : '停止扫描'
      }}</web-ui-button
    >
    <web-ui-button
      slot="footer"
      :full="mobile"
      variant="secondary"
      class="cancel-button"
      :disabled="!canClose"
      @click="emit('update:open', false)"
      >取消</web-ui-button
    >
    <web-ui-button
      slot="footer"
      :full="mobile"
      variant="primary"
      :loading="busy"
      :disabled="!canClose || readyItems.length === 0"
      @click="session.submit()"
    >
      <web-ui-icon slot="prefix" :icon="akarIconsCircleCheck" />确认找回
    </web-ui-button>
  </web-ui-dialog>
  <web-ui-dialog :open="scanChoiceOpen" controlled no-backdrop-close @open-change="scanChoiceOpen = $event.detail.open">
    <span slot="header">扫描范围</span>
    <p class="m-0">
      选择要查找的位置，包含其中所有子文件夹<template v-if="scanTimeEstimate"
        >，<template v-for="(segment, segIndex) in splitNumericSegments(scanTimeEstimate)" :key="segIndex"
          ><span v-if="segment.numeric" :class="monoDigitsClass">{{ segment.text }}</span
          ><template v-else>{{ segment.text }}</template></template
        ></template
      >
    </p>
    <div v-if="otherUnavailableFiles.length" class="mt-4 flex items-center justify-between gap-3">
      <span class="text-sm text-(--wui-color-text)"
        >同时查找其他 <span class="font-mono tabular-nums">{{ otherUnavailableFiles.length }}</span> 条失效文件</span
      >
      <web-ui-switch
        :checked="includeOtherUnavailable"
        aria-label="同时查找其他失效文件"
        @change="includeOtherUnavailable = ($event.currentTarget as WebUiSwitch).checked"
      />
    </div>
    <web-ui-button slot="footer" full variant="primary" @click="session.chooseScanDirectory()"
      >扫描选定文件夹</web-ui-button
    >
    <web-ui-button slot="footer" full variant="secondary" @click="session.scanAllDisks()">扫描全盘</web-ui-button>
    <web-ui-button slot="footer" full variant="secondary" @click="session.closeScanChoice()">取消</web-ui-button>
  </web-ui-dialog>
  <web-ui-dialog
    :open="candidateItem !== null"
    controlled
    no-backdrop-close
    @open-change="!$event.detail.open && session.closeCandidates()"
  >
    <span slot="header">选择找回的文件</span>
    <p v-if="renderedCandidateItem" class="mt-0 mb-3 text-xs text-(--wui-color-text-secondary)">
      为「{{ renderedCandidateItem.resourceTitle }}」选择匹配的文件
    </p>
    <ul v-if="renderedCandidateItem" class="m-0 flex list-none flex-col gap-2 p-0">
      <li v-for="candidate in candidates[renderedCandidateItem.id]" :key="candidate.path">
        <button
          type="button"
          class="candidate-option flex w-full cursor-pointer items-center gap-3 rounded-xl border-0 bg-(--wui-color-surface-raised,white) p-3 text-left text-(--wui-color-text) hover:bg-[color-mix(in_srgb,var(--wui-color-accent)_10%,var(--wui-color-surface-raised,white))] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--wui-color-focus-ring)"
          @click="session.chooseCandidate(candidate)"
        >
          <span
            class="candidate-icon grid size-9 shrink-0 place-items-center rounded-[9px] bg-[color-mix(in_srgb,var(--wui-color-accent)_14%,transparent)] text-(--wui-color-accent)"
            ><web-ui-icon :icon="lucideFile" :size="18"
          /></span>
          <span class="min-w-0 flex-1">
            <strong class="flex items-center gap-1.5 text-sm">
              <span class="truncate">{{ candidate.path.split('/').pop() || candidate.path }}</span>
              <span
                v-if="prepared[renderedCandidateItem.id] === candidate.path"
                class="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--wui-color-accent)_14%,transparent)] px-1.5 py-0.5 text-[11px] font-medium text-(--wui-color-accent)"
                >当前</span
              >
            </strong>
            <span class="block wrap-anywhere text-xs text-(--wui-color-text-secondary)">{{ candidate.path }}</span>
            <span class="block text-xs text-(--wui-color-text-secondary)"
              ><span class="font-mono tabular-nums">{{ formatSize(candidate.size) }}</span> ·
              <span
                ><template
                  v-for="(segment, segIndex) in splitNumericSegments(formatDate(candidate.modifiedAt))"
                  :key="segIndex"
                  ><span v-if="segment.numeric" :class="monoDigitsClass">{{ segment.text }}</span
                  ><template v-else>{{ segment.text }}</template></template
                ></span
              >
              · {{ candidate.matchReasons.map(formatMatchReason).join('、') }}</span
            >
          </span>
          <web-ui-icon :icon="lucideChevronRight" :size="16" class="shrink-0 text-(--wui-color-text-secondary)" />
        </button>
      </li>
    </ul>
    <web-ui-button slot="footer" full variant="secondary" @click="session.closeCandidates()">取消</web-ui-button>
  </web-ui-dialog>
  <ResourceLinkDialog
    :open="editingUrlItem !== null"
    :initial-value="urlDraft"
    mode="restore"
    @update:open="
      value => {
        if (!value) session.closeUrlEditor()
      }
    "
    @submit="session.completeUrl($event[0] ?? '')"
  />
</template>

<style scoped>
.cancel-button::part(button) {
  min-width: 76px;
}

.scan-status-active::after {
  pointer-events: none;
  content: '';

  position: absolute;
  inset: 0;

  border-radius: inherit;

  background: linear-gradient(105deg, transparent 25%, rgb(255 255 255 / 0.55) 50%, transparent 75%);

  animation: scan-shimmer 1.1s linear infinite;
}

:global(.dark) .scan-status-active::after {
  background: linear-gradient(105deg, transparent 25%, rgb(255 255 255 / 0.14) 50%, transparent 75%);
}

@keyframes scan-shimmer {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(100%);
  }
}

.motion-reduced.scan-status-active::after {
  content: none;
  animation: none;
}

:global(web-ui-theme[motion='reduced']) .scan-status-active::after {
  content: none;
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  .scan-status-active::after {
    content: none;
    animation: none;
  }
}
</style>
