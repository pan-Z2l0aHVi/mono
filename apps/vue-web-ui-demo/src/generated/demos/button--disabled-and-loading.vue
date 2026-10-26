<template>
  <div class="flex flex-col items-start gap-4">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button disabled>Disabled</web-ui-button>
      <web-ui-button variant="primary" disabled>Disabled</web-ui-button>
      <web-ui-button loading>加载中</web-ui-button>
      <web-ui-button variant="primary" loading>加载中</web-ui-button>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="primary" :loading="pending" @click="pending = true">保存</web-ui-button>
      <web-ui-button variant="secondary" :disabled="!pending" @click="pending = false">结束等待</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        loading：{{ pending ? 'true，保存按钮点不动' : 'false' }}
      </output>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const pending = ref(false)
</script>
