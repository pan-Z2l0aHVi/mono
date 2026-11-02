<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-tooltip
        content="Appears instantly"
        :show-delay="0"
        :hide-delay="0"
        @open-change="last = $event.detail.open ? 'true' : 'false'"
      >
        <web-ui-button variant="secondary">Instant tooltip</web-ui-button>
      </web-ui-tooltip>
      <web-ui-tooltip content="Does not appear when disabled" disabled>
        <web-ui-button variant="secondary">Disabled tooltip</web-ui-button>
      </web-ui-tooltip>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">
      Instant tooltip last detail.open = {{ last }} · the disabled one dispatches nothing
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('—')
</script>
