<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-tooltip
        content="点一下开，再点一下关"
        trigger="click"
        @open-change="last = $event.detail.open ? 'true' : 'false'"
      >
        <web-ui-button variant="secondary">点击提示</web-ui-button>
      </web-ui-tooltip>
      <web-ui-tooltip
        ref="hint"
        content="只跟着 show() / hide() 走"
        trigger="none"
        @open-change="last = $event.detail.open ? 'true' : 'false'"
      >
        <web-ui-button variant="secondary" @click="hint?.show()">show()</web-ui-button>
      </web-ui-tooltip>
      <web-ui-button size="28" variant="secondary" @click="hint?.hide()">hide()</web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">最近一次 detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiTooltip } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const hint = useTemplateRef<WebUiTooltip>('hint')
const last = ref('—')
</script>
