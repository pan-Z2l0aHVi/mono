<template>
  <web-ui-button @click="open = true">编辑资料</web-ui-button>

  <web-ui-drawer :open="open" heading="编辑资料" @open-change="open = $event.detail.open">
    <div class="flex flex-col gap-3">
      <p v-for="index in 12" :key="index" class="m-0">第 {{ index }} 行内容，用来演示正文滚动。</p>
    </div>

    <div slot="footer" class="flex gap-3">
      <web-ui-button variant="secondary" full @click="open = false">取消</web-ui-button>
      <web-ui-button full @click="open = false">保存</web-ui-button>
    </div>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
