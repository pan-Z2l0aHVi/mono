<template>
  <div class="flex flex-col gap-3">
    <web-ui-textarea
      ref="field"
      aria-label="待全选的多行文本"
      :rows="3"
      value="全选之后可以直接输入替换"
    ></web-ui-textarea>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button @click="field?.focus()">聚焦</web-ui-button>
      <web-ui-button @click="field?.select()">全选</web-ui-button>
      <web-ui-button @click="field?.blur()">失焦</web-ui-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiTextarea } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiTextarea>('field')
</script>
