<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-autocomplete ref="field" filter="none">
      <web-ui-textarea
        slot="trigger"
        :rows="3"
        class="[--wui-textarea-width:20rem]"
        placeholder="Multiline trigger: Enter inserts a newline, Escape or blur closes the panel"
      ></web-ui-textarea>
      <web-ui-option value="bug" label="Bug"></web-ui-option>
      <web-ui-option value="feature" label="Feature"></web-ui-option>
    </web-ui-autocomplete>
    <web-ui-button @click="field?.focus()">Focus the trigger</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiAutocomplete } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiAutocomplete>('field')
</script>
