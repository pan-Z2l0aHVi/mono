<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input ref="field" aria-label="待聚焦的输入框" value="把焦点交给它"></web-ui-input>
    <web-ui-button @click="field?.focus()">聚焦</web-ui-button>
    <web-ui-button @click="field?.select()">全选</web-ui-button>
    <web-ui-button @click="field?.blur()">失焦</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiInput } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiInput>('field')
</script>
