<script setup lang="ts">
import type { WebUiDialog, WebUiEvent } from '@greypan/web-ui'

import ErrorBanner from './ErrorBanner.vue'
import { monoDigitsClass, splitNumericSegments } from './presentation'

const props = defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel: string
  busy: boolean
  danger: boolean
  error: string
  compact: boolean
  /**
   * 声明后，busy 期间取消按钮不再禁用，而是换成这个文案（如「停止」）：
   * 长流程（批量导入）进行中允许用户主动中止，短流程仍按禁用处理。
   */
  busyCancelLabel?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
  closed: []
}>()

function handleOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (event.target !== event.currentTarget) return
  if (event.detail.open) return
  // 长流程进行中只认显式点「停止」：Escape/关闭请求不当作停止，
  // 否则一次误触就会静默作废整批入队，而界面上看不到任何停止动作。
  if (props.busy && props.busyCancelLabel) return
  emit('cancel')
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
    <p class="m-0 text-[14px] leading-6 text-[#5b5b66] dark:text-(--wui-color-text-secondary)">
      <template v-for="(segment, index) in splitNumericSegments(message)" :key="index">
        <span v-if="segment.numeric" :class="monoDigitsClass">{{ segment.text }}</span>
        <template v-else>{{ segment.text }}</template>
      </template>
    </p>
    <div slot="footer" class="flex gap-3">
      <web-ui-button full variant="secondary" :disabled="busy && !busyCancelLabel" @click="emit('cancel')">
        {{ busy && busyCancelLabel ? busyCancelLabel : '取消' }}
      </web-ui-button>
      <web-ui-button full :variant="danger ? 'danger' : 'primary'" :loading="busy" @click="emit('confirm')">
        <template v-for="(segment, index) in splitNumericSegments(confirmLabel)" :key="index">
          <span v-if="segment.numeric" :class="monoDigitsClass">{{ segment.text }}</span>
          <template v-else>{{ segment.text }}</template>
        </template>
      </web-ui-button>
    </div>
  </web-ui-dialog>
</template>
