<script setup lang="ts">
import { toast, type WebUiDialog, type WebUiEvent, type WebUiInput, type WebUiTextarea } from '@greypan/web-ui'
import { lucideClipboardPaste, lucideX } from '@greypan/web-ui/icons'
import { Virtualizer } from 'virtua/vue'
import { computed, ref, watch } from 'vue'

import { createLibraryRuntime } from '@/services/library'

import { extractImportLinks } from './linkImport'
import { normalizeLibraryURL } from './restore'

const props = defineProps<{ open: boolean; initialValue: string; mode: 'add' | 'restore' }>()
/** submit 一律传数组：add 模式是多链接，restore 模式固定一条。 */
const emit = defineEmits<{ 'update:open': [value: boolean]; submit: [urls: string[]] }>()
const runtime = createLibraryRuntime()
const draft = ref('')
// 剪贴板 HTML 与来源地址独立保存：它们只在「粘贴」时提供，用户一旦手动编辑文本就作废。
const clipboardHTML = ref('')
const clipboardBaseURL = ref('')
const dismissed = ref(new Set<string>())
const previewScroll = ref<HTMLElement | undefined>(undefined)

watch(
  () => props.open,
  open => {
    if (!open) return
    draft.value = props.initialValue
    clipboardHTML.value = ''
    clipboardBaseURL.value = ''
    dismissed.value = new Set()
  },
  { immediate: true }
)

const extraction = computed(() =>
  props.mode === 'add'
    ? extractImportLinks({
        text: draft.value,
        html: clipboardHTML.value,
        baseUrl: clipboardBaseURL.value
      })
    : null
)
const candidates = computed(() => (extraction.value?.candidates ?? []).filter(item => !dismissed.value.has(item.url)))
const duplicates = computed(() => extraction.value?.duplicates ?? 0)
const invalid = computed(() => extraction.value?.invalid ?? [])
const submitDisabled = computed(() => (props.mode === 'add' ? candidates.value.length === 0 : !draft.value.trim()))

function handleOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target === event.currentTarget && !event.detail.open) emit('update:open', false)
}
function handleInput(event: WebUiEvent<WebUiInput | WebUiTextarea, 'input'>) {
  draft.value = event.target.value
  // 手动编辑后文本成为唯一事实来源，旧的剪贴板 HTML 与已删除项都作废。
  clipboardHTML.value = ''
  clipboardBaseURL.value = ''
  dismissed.value = new Set()
}
async function pasteClipboard() {
  try {
    const content = await runtime.system.readClipboardContent()
    if (!props.open) return
    draft.value = content.text
    clipboardHTML.value = content.html ?? ''
    clipboardBaseURL.value = content.base_url ?? ''
    dismissed.value = new Set()
  } catch {
    toast.error('无法读取剪切板，请手动粘贴链接', { position: 'top-center' })
  }
}
function removeCandidate(url: string) {
  dismissed.value = new Set([...dismissed.value, url])
}
function submit() {
  if (props.mode === 'restore') {
    const url = normalizeLibraryURL(draft.value)
    if (!url) {
      toast.error('请输入有效的网页链接', { position: 'top-center' })
      return
    }
    emit('submit', [url])
    emit('update:open', false)
    return
  }
  if (!candidates.value.length) return
  emit(
    'submit',
    candidates.value.map(candidate => candidate.url)
  )
  emit('update:open', false)
}
</script>

<template>
  <web-ui-dialog :open="open" controlled no-backdrop-close @open-change="handleOpenChange">
    <span slot="header">{{ mode === 'add' ? '导入链接' : '新资源链接' }}</span>

    <div v-if="mode === 'add'" class="grid gap-2">
      <div class="flex min-w-0 items-center justify-between gap-2">
        <span class="min-w-0 truncate text-xs leading-4 text-[#6a6a70] dark:text-(--wui-color-text-secondary)">
          粘贴一段文字即可提取其中的全部链接，每行一条也可以
        </span>
        <web-ui-tooltip portal content="从剪切板导入">
          <web-ui-button
            class="-mr-1 shrink-0"
            icon
            variant="ghost"
            size="28"
            aria-label="粘贴链接"
            @click="pasteClipboard"
          >
            <web-ui-icon :icon="lucideClipboardPaste" :size="16" />
          </web-ui-button>
        </web-ui-tooltip>
      </div>
      <web-ui-textarea
        :value="draft"
        full
        autosize
        :rows="1"
        :max-height="105"
        aria-label="新链接"
        placeholder="https://example.com/page 或其他包含链接的文字"
        @input="handleInput"
      />
      <div v-if="candidates.length || invalid.length" class="grid gap-1.5">
        <p class="m-0 text-xs leading-4 text-[#6a6a70] dark:text-(--wui-color-text-secondary)">
          识别到 <span class="font-mono tabular-nums">{{ candidates.length }}</span> 条链接
          <span v-if="duplicates"> · 已去重 {{ duplicates }} 条</span>
          <span v-if="invalid.length" class="text-(--wui-color-danger,#dc2626)">
            · {{ invalid.length }} 条无法识别
          </span>
        </p>
        <div
          v-if="candidates.length"
          ref="previewScroll"
          class="max-h-56 overflow-auto rounded-[14px] bg-[#f5f5f7] p-1 dark:bg-[color-mix(in_srgb,var(--wui-color-text,#1b1b20)_6%,transparent)]"
          data-link-preview
        >
          <!-- 上千条也不另建列表：virtua 只渲染可视行，少量条目时开销可忽略。 -->
          <Virtualizer
            :data="candidates"
            :item-size="32"
            :scroll-ref="previewScroll"
            as="ol"
            item="li"
            class="m-0 list-none p-0"
          >
            <template #default="{ item }">
              <div
                class="flex min-w-0 items-center gap-1 rounded-[10px] px-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                <span
                  class="min-w-0 flex-1 truncate font-mono text-xs leading-8 text-[#22212a] dark:text-(--wui-color-text)"
                  :title="item.url"
                >
                  {{ item.url }}
                </span>
                <web-ui-button
                  icon
                  variant="ghost"
                  size="24"
                  :aria-label="`移除 ${item.url}`"
                  @click="removeCandidate(item.url)"
                >
                  <web-ui-icon :icon="lucideX" :size="12" />
                </web-ui-button>
              </div>
            </template>
          </Virtualizer>
        </div>
        <ul v-if="invalid.length" class="m-0 grid list-none gap-0.5 p-0">
          <li
            v-for="raw in invalid.slice(0, 3)"
            :key="raw"
            class="truncate font-mono text-xs text-(--wui-color-danger,#dc2626)"
            :title="raw"
          >
            无法识别：{{ raw }}
          </li>
        </ul>
      </div>
    </div>

    <web-ui-input
      v-else
      :value="draft"
      type="url"
      full
      aria-label="新链接"
      placeholder="https://example.com/page"
      @input="handleInput"
    >
      <web-ui-tooltip slot="suffix" portal content="从剪切板导入">
        <web-ui-button class="-mr-2" icon variant="ghost" size="28" aria-label="粘贴链接" @click="pasteClipboard">
          <web-ui-icon :icon="lucideClipboardPaste" :size="16" />
        </web-ui-button>
      </web-ui-tooltip>
    </web-ui-input>

    <web-ui-button slot="footer" variant="primary" full :disabled="submitDisabled" @click="submit">
      {{ mode === 'add' ? (candidates.length ? `添加 ${candidates.length} 条链接` : '添加链接') : '更新链接' }}
    </web-ui-button>
    <web-ui-button slot="footer" variant="secondary" full @click="emit('update:open', false)">取消</web-ui-button>
  </web-ui-dialog>
</template>
