<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-dropdown @open-change="last = $event.detail.open ? 'true' : 'false'">
        <web-ui-button slot="trigger" variant="secondary">Click menu</web-ui-button>
        <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
        <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
      </web-ui-dropdown>
      <web-ui-dropdown trigger="hover focus" @open-change="last = $event.detail.open ? 'true' : 'false'">
        <web-ui-button slot="trigger" variant="secondary">Hover or focus</web-ui-button>
        <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
        <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
      </web-ui-dropdown>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">Last detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('—')
</script>
