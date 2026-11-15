<script setup lang="ts">
import type { WebUiDialog, WebUiEvent, WebUiInput } from '@greypan/web-ui'
import { lucideClipboardPaste } from '@greypan/web-ui/icons'
import { Clipboard } from '@wailsio/runtime'
import { ref, watch } from 'vue'

import { hasWailsRuntime } from '@/services/library/wails'

import { normalizeLibraryURL } from './restore'

const props = defineProps<{ open: boolean; initialValue: string; mode: 'add' | 'restore' }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; submit: [url: string] }>()
const draft = ref('')
const error = ref('')

watch(
  () => props.open,
  open => {
    if (open) {
      draft.value = props.initialValue
      error.value = ''
    }
  },
  { immediate: true }
)

function handleOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target === event.currentTarget && !event.detail.open) emit('update:open', false)
}
function handleInput(event: WebUiEvent<WebUiInput, 'input'>) {
  draft.value = event.target.value
  error.value = ''
}
async function pasteClipboard() {
  try {
    const value = hasWailsRuntime() ? await Clipboard.Text() : await navigator.clipboard.readText()
    if (!props.open) return
    draft.value = value
    error.value = ''
  } catch {
    error.value = '无法读取剪切板，请手动粘贴链接'
  }
}
function submit() {
  const url = normalizeLibraryURL(draft.value)
  if (!url) {
    error.value = '请输入有效的网页链接'
    return
  }
  emit('submit', url)
  emit('update:open', false)
}
</script>

<template>
  <web-ui-dialog :open="open" controlled no-backdrop-close @open-change="handleOpenChange">
    <span slot="header">{{ mode === 'add' ? '添加链接' : '新资源链接' }}</span>
    <web-ui-input
      :value="draft"
      type="url"
      full
      aria-label="新链接"
      placeholder="https://example.com/page"
      @input="handleInput"
      @keydown.enter="submit"
    >
      <web-ui-tooltip slot="suffix" portal content="从剪切板添加">
        <web-ui-button class="-mr-2" icon variant="ghost" size="28" aria-label="粘贴链接" @click="pasteClipboard">
          <web-ui-icon :icon="lucideClipboardPaste" :size="16" />
        </web-ui-button>
      </web-ui-tooltip>
    </web-ui-input>
    <p v-if="error" role="alert" class="m-0 mt-2 text-sm text-red-700">{{ error }}</p>
    <web-ui-button slot="footer" variant="primary" full @click="submit">{{
      mode === 'add' ? '添加链接' : '更新链接'
    }}</web-ui-button>
    <web-ui-button slot="footer" variant="secondary" full @click="emit('update:open', false)">取消</web-ui-button>
  </web-ui-dialog>
</template>
