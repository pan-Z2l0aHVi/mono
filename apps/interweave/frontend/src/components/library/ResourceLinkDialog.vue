<script setup lang="ts">
import { toast, type WebUiDialog, type WebUiEvent, type WebUiInput } from '@greypan/web-ui'
import { lucideClipboardPaste } from '@greypan/web-ui/icons'
import { ref, watch } from 'vue'

import { createLibraryRuntime } from '@/services/library'

import { normalizeLibraryURL } from './restore'

const props = defineProps<{ open: boolean; initialValue: string; mode: 'add' | 'restore' }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; submit: [url: string] }>()
const runtime = createLibraryRuntime()
const draft = ref('')

watch(
  () => props.open,
  open => {
    if (open) draft.value = props.initialValue
  },
  { immediate: true }
)

function handleOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target === event.currentTarget && !event.detail.open) emit('update:open', false)
}
function handleInput(event: WebUiEvent<WebUiInput, 'input'>) {
  draft.value = event.target.value
}
async function pasteClipboard() {
  try {
    const value = await runtime.system.readClipboardText()
    if (props.open) draft.value = value
  } catch {
    toast.error('无法读取剪切板，请手动粘贴链接', { position: 'top-center' })
  }
}
function submit() {
  const url = normalizeLibraryURL(draft.value)
  if (!url) {
    toast.error('请输入有效的网页链接', { position: 'top-center' })
    return
  }
  emit('submit', url)
  emit('update:open', false)
}
</script>

<template>
  <web-ui-dialog :open="open" controlled no-backdrop-close @open-change="handleOpenChange">
    <span slot="header">{{ mode === 'add' ? '导入链接' : '新资源链接' }}</span>
    <web-ui-input
      :value="draft"
      type="url"
      full
      aria-label="新链接"
      placeholder="https://example.com/page"
      @input="handleInput"
      @keydown.enter="submit"
    >
      <web-ui-tooltip slot="suffix" portal content="从剪切板导入">
        <web-ui-button class="-mr-2" icon variant="ghost" size="28" aria-label="粘贴链接" @click="pasteClipboard">
          <web-ui-icon :icon="lucideClipboardPaste" :size="16" />
        </web-ui-button>
      </web-ui-tooltip>
    </web-ui-input>
    <web-ui-button slot="footer" variant="primary" full @click="submit">{{
      mode === 'add' ? '导入链接' : '更新链接'
    }}</web-ui-button>
    <web-ui-button slot="footer" variant="secondary" full @click="emit('update:open', false)">取消</web-ui-button>
  </web-ui-dialog>
</template>
