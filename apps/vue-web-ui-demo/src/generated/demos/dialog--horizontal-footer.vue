<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">打开 dialog</web-ui-button>
    <web-ui-dialog
      :open="open"
      footer-orientation="horizontal"
      heading="保存这条消息？"
      @open-change="open = $event.detail.open"
    >
      <p class="m-0">这条消息尚未发送，并且包含未保存的更改。你可以先将它保存为草稿，稍后继续编辑。</p>
      <web-ui-button slot="footer" full variant="secondary" @click="open = false">放弃</web-ui-button>
      <web-ui-button slot="footer" full variant="primary" @click="open = false">保存草稿</web-ui-button>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
