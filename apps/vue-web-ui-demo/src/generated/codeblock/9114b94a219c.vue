<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text ref="field" value="全选之后可以直接输入替换" aria-label="替换"></web-ui-editable-text>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button @click="field?.focus()">聚焦</web-ui-button>
      <web-ui-button @click="field?.select()">全选</web-ui-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEditableText } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiEditableText>('field')
</script>
