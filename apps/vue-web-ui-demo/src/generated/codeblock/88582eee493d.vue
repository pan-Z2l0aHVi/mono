<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-popover trigger="focus" @open-change="last = $event.detail.open ? 'true' : 'false'">
        <web-ui-button slot="trigger" variant="secondary">Keyboard focus</web-ui-button>
        <div class="max-w-xs text-sm">
          Opens when Tab reaches this button and closes once focus leaves; clicking it does not open.
        </div>
      </web-ui-popover>
      <web-ui-popover trigger="click focus" placement="top">
        <web-ui-button slot="trigger" variant="secondary">Click or focus</web-ui-button>
        <div class="max-w-xs text-sm">Click toggles it, keyboard focus opens it directly.</div>
      </web-ui-popover>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">Keyboard focus last detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('—')
</script>
