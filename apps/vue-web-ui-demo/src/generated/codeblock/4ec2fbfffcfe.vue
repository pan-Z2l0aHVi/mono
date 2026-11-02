<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input aria-label="Input to focus" ref="field" value="Hand focus to it"></web-ui-input>
    <web-ui-button @click="field?.focus()">Focus</web-ui-button>
    <web-ui-button @click="field?.select()">Select all</web-ui-button>
    <web-ui-button @click="field?.blur()">Blur</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiInput } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiInput>('field')
</script>
