<script setup lang="ts">
import type { WebUiDialog, WebUiEvent } from '@greypan/web-ui'

import ErrorBanner from './ErrorBanner.vue'

defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel: string
  busy: boolean
  danger: boolean
  error: string
  compact: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
  closed: []
}>()

function handleOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  if (!event.detail.open) emit('cancel')
}
</script>

<template>
  <web-ui-dialog
    :open="open"
    controlled
    no-backdrop-close
    :class="compact ? '[--wui-dialog-width:320px]' : undefined"
    @open-change="handleOpenChange"
    @closed="emit('closed')"
  >
    <div slot="header">{{ title }}</div>
    <ErrorBanner :message="error" />
    <p class="m-0 text-[14px] leading-6 text-[#5b5b66] dark:text-(--wui-color-text-secondary)">{{ message }}</p>
    <div slot="footer" class="flex gap-3">
      <web-ui-button full variant="secondary" :disabled="busy" @click="emit('cancel')">取消</web-ui-button>
      <web-ui-button full :variant="danger ? 'danger' : 'primary'" :loading="busy" @click="emit('confirm')">
        {{ confirmLabel }}
      </web-ui-button>
    </div>
  </web-ui-dialog>
</template>
