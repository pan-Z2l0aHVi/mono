<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text
      :value="title"
      aria-label="标题"
      placeholder="未命名"
      @input="onInput"
      @change="onChange"
    ></web-ui-editable-text>
    <output class="text-sm text-(--wui-color-text-secondary)">
      input 草稿：{{ draft || '(还没有输入)' }} · change 提交：{{ committed || '(未提交)' }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const title = ref('季度复盘')
const draft = ref('')
const committed = ref('')

function onInput(event: WebUiEvent<WebUiEditableText, 'input'>) {
  draft.value = event.currentTarget.value
}

function onChange(event: WebUiEvent<WebUiEditableText, 'change'>) {
  const value = event.currentTarget.value
  title.value = value
  committed.value = value
}
</script>
