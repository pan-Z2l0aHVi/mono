<script setup lang="ts">
import type { WebUiDialog, WebUiEvent, WebUiInput } from '@greypan/web-ui'
import { lucideFile, lucideFolderOpen, lucideGlobe, lucideUndo2 } from '@greypan/web-ui/icons'
import { ref, watch } from 'vue'

import { metadataRowClass } from './presentation'
import type { LibraryRestoreQueueItem } from './restore'
import { normalizeRestoreURL } from './restore'

const props = defineProps<{
  open: boolean
  queue: LibraryRestoreQueueItem[]
  busy: boolean
  error: string
  mobile: boolean
  activeItemId: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [items: LibraryRestoreQueueItem[]]
}>()

const replacementLocations = ref<Record<string, string>>({})
const validationError = ref('')

function resetDrafts() {
  replacementLocations.value = Object.fromEntries(props.queue.map(item => [item.id, item.replacementLocation]))
  validationError.value = ''
}

watch(
  () => props.open,
  open => {
    if (open) resetDrafts()
  },
  { immediate: true }
)

watch(
  () => props.queue.map(item => item.id).join('|'),
  () => {
    if (props.open) resetDrafts()
  }
)

function handleOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  emit('update:open', event.detail.open)
}

function handleInput(itemId: string, event: WebUiEvent<WebUiInput, 'input'>) {
  replacementLocations.value[itemId] = event.target.value
  validationError.value = ''
}

function submit() {
  if (props.busy || !props.queue.length) return

  const items: LibraryRestoreQueueItem[] = []
  for (const item of props.queue) {
    if (item.kind === 'url') {
      const replacementLocation = normalizeRestoreURL(replacementLocations.value[item.id] ?? item.replacementLocation)
      if (!replacementLocation) {
        validationError.value = '请输入有效的 http 或 https URL'
        return
      }
      items.push({ ...item, replacementLocation })
      continue
    }
    items.push(item)
  }

  validationError.value = ''
  emit('submit', items)
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
    <span slot="title">找回资源</span>

    <p
      v-if="validationError || error"
      class="m-0 rounded-md bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 dark:bg-red-400/12 dark:text-red-200"
      role="alert"
    >
      {{ validationError || error }}
    </p>

    <div
      class="grid min-h-0 grid-cols-2 gap-5 max-[640px]:gap-4 max-[900px]:grid-cols-1 max-[900px]:grid-rows-2"
      style="height: min(calc(90vh - 108px), calc(var(--wui-dialog-max-height, 640px) - 108px))"
    >
      <section class="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5 overflow-hidden">
        <p class="m-0 min-w-0 text-[13px] leading-6 text-[#6a6a6a] dark:text-(--wui-color-text-secondary)">
          为失效资源指定新的位置；文件会按队列顺序选择，链接可直接编辑。
        </p>
        <div
          class="grid h-full min-h-0 place-content-center justify-items-center gap-3 rounded-3xl bg-[#f0f0f4] px-6 py-7 text-center dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_4%,transparent)] max-[640px]:gap-2 max-[640px]:px-4 max-[640px]:py-2 max-[900px]:p-5"
        >
          <span
            class="grid size-13 place-items-center rounded-[18px] bg-[color-mix(in_srgb,var(--wui-color-accent,#08f)_10%,transparent)] text-(--wui-color-accent,#08f) dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_8%,transparent)] dark:text-(--wui-color-text-secondary) max-[640px]:size-10 max-[640px]:rounded-xl"
          >
            <web-ui-icon :icon="lucideFolderOpen" :size="23" />
          </span>
          <span
            class="text-[15px] font-semibold leading-[1.4] text-[#22212a] dark:text-(--wui-color-text) max-[640px]:text-[13px]"
          >
            {{ queue.length }} 个资源待找回
          </span>
          <span
            class="text-xs leading-[1.4] text-[#6a6a6a] dark:text-(--wui-color-text-secondary) max-[640px]:text-[11px]"
          >
            取消选择不会中断其他项目
          </span>
        </div>
      </section>

      <aside
        class="relative grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5 overflow-hidden border-0 bg-transparent p-0"
        aria-labelledby="library-restore-queue-title"
      >
        <div class="flex min-h-6 items-center justify-between">
          <h3
            id="library-restore-queue-title"
            class="m-0 flex items-center gap-1.5 text-[13px] font-semibold text-[#22212a] dark:text-(--wui-color-text)"
          >
            将找回
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
              'items-start transition-colors duration-100',
              activeItemId === item.id
                ? 'bg-black/3 dark:bg-white/6'
                : 'hover:bg-black/3 dark:hover:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b1b)_5%,transparent)]'
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
              <div class="flex min-h-8 items-center gap-2">
                <span
                  class="min-w-0 flex-[1_1_auto] truncate text-[14px] font-medium leading-[1.35] text-[#22212a] dark:text-(--wui-color-text)"
                >
                  {{ item.resourceTitle }}
                </span>
                <span
                  v-if="activeItemId === item.id"
                  class="flex shrink-0 items-center gap-1 text-[11px] leading-4 text-[#6a6a6a] dark:text-(--wui-color-text-secondary)"
                >
                  <web-ui-spinner :size="12" />
                  处理中
                </span>
              </div>
              <span
                class="block min-w-0 truncate text-xs leading-5 text-[#6a6a6a] dark:text-(--wui-color-text-secondary)"
                :title="item.location"
              >
                {{ item.kind === 'file' ? '原文件' : '原链接' }}：{{ item.location }}
              </span>
              <web-ui-input
                v-if="item.kind === 'url'"
                :value="replacementLocations[item.id] ?? item.replacementLocation"
                type="url"
                full
                :disabled="busy"
                placeholder="https://example.com/page"
                :aria-label="`${item.resourceTitle} 的新链接`"
                :aria-invalid="validationError ? 'true' : undefined"
                @input="handleInput(item.id, $event)"
                @keydown.enter="submit"
              />
              <span v-else class="text-xs leading-5 text-[#6a6a6a] dark:text-(--wui-color-text-secondary)">
                提交时选择新文件
              </span>
            </span>
          </li>
        </ol>

        <div
          v-else
          class="grid h-full min-h-0 place-items-center rounded-3xl bg-white dark:bg-(--wui-color-surface-raised)"
        >
          <web-ui-empty size="small" description="暂无待找回资源" />
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
      @click="submit"
    >
      <web-ui-icon slot="prefix" :icon="lucideUndo2" :size="16" />
      {{ queue.length > 1 ? '批量找回' : '找回' }}
    </web-ui-button>
  </web-ui-dialog>
</template>
