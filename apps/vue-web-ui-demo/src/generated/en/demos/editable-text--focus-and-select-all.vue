<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text
      ref="field"
      value="Type directly to replace after selecting all"
      aria-label="Replace"
    ></web-ui-editable-text>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button @click="field?.focus()">Focus</web-ui-button>
      <web-ui-button @click="field?.select()">Select all</web-ui-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEditableText } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiEditableText>('field')
</script>
