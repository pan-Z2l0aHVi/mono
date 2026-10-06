<script setup lang="ts">
import type { WebUiDialog, WebUiEvent } from '@greypan/web-ui'

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
    :class="compact ? 'max-[640px]:[--wui-dialog-width:90vw] [--wui-dialog-width:320px]' : undefined"
    @open-change="handleOpenChange"
  >
    <div slot="title">{{ title }}</div>
    <p
      v-if="error"
      class="m-0 rounded-md bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 dark:bg-red-400/12 dark:text-red-200"
      role="alert"
    >
      {{ error }}
    </p>
    <p class="m-0 text-[14px] leading-6 text-[#5b5b66] dark:text-(--wui-color-text-secondary)">{{ message }}</p>
    <div slot="footer" class="flex gap-3">
      <web-ui-button full variant="secondary" :disabled="busy" @click="emit('cancel')">取消</web-ui-button>
      <web-ui-button full :variant="danger ? 'danger' : 'primary'" :loading="busy" @click="emit('confirm')">
        {{ confirmLabel }}
      </web-ui-button>
    </div>
  </web-ui-dialog>
</template>
