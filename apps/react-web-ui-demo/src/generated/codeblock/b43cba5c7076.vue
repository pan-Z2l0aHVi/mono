<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-tooltip
        content="立即出现"
        :show-delay="0"
        :hide-delay="0"
        @open-change="last = $event.detail.open ? 'true' : 'false'"
      >
        <web-ui-button variant="secondary">即时提示</web-ui-button>
      </web-ui-tooltip>
      <web-ui-tooltip content="禁用后不会出现" disabled>
        <web-ui-button variant="secondary">禁用提示</web-ui-button>
      </web-ui-tooltip>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">
      即时提示最近一次 detail.open = {{ last }} · 禁用提示不派发
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('—')
</script>
