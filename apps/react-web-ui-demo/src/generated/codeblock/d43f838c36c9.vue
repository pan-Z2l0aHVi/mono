<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-autocomplete ref="field" filter="none">
      <web-ui-textarea
        slot="trigger"
        :rows="3"
        class="[--wui-textarea-width:20rem]"
        placeholder="多行 trigger：Enter 换行，Escape 或失焦关闭 panel"
      ></web-ui-textarea>
      <web-ui-option value="bug" label="缺陷"></web-ui-option>
      <web-ui-option value="feature" label="需求"></web-ui-option>
    </web-ui-autocomplete>
    <web-ui-button @click="field?.focus()">聚焦 trigger</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiAutocomplete } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiAutocomplete>('field')
</script>
