<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button @click="customHeader = true">Custom header</web-ui-button>
    <web-ui-button @click="noHeader = true">No header</web-ui-button>
  </div>

  <web-ui-drawer :open="customHeader" closable @open-change="customHeader = $event.detail.open">
    <div slot="header" class="flex items-baseline gap-2 px-5 py-4">
      <strong class="text-lg">Account settings</strong>
      <span class="text-xs text-(--wui-color-text-secondary)">Saved</span>
    </div>
    <p>
      The content of the header slot is entirely up to the consumer; the close button is still provided by the
      component.
    </p>
  </web-ui-drawer>

  <web-ui-drawer :open="noHeader" @open-change="noHeader = $event.detail.open">
    <p>With no heading and no header slot, the title area takes no space.</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const customHeader = ref(false)
const noHeader = ref(false)
</script>
