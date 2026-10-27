<template>
  <div class="flex flex-col gap-3">
    <web-ui-textarea
      aria-label="Multiline text to select"
      ref="field"
      :rows="3"
      value="Type directly to replace after selecting all"
    ></web-ui-textarea>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button @click="field?.focus()">Focus</web-ui-button>
      <web-ui-button @click="field?.select()">Select all</web-ui-button>
      <web-ui-button @click="field?.blur()">Blur</web-ui-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiTextarea } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiTextarea>('field')
</script>
