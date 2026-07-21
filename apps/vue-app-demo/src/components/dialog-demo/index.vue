<script setup lang="ts">
import { ref } from 'vue'

// 命令式
const dialogRef = ref<HTMLDialogElement>()

// 声明式
const visible1 = ref(false)
const visible2 = ref(false)
</script>

<template>
  <div>
    <h1>对话框</h1>

    <h2>命令式</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="dialogRef?.showModal()">打开对话框</web-ui-button>
    </div>

    <web-ui-dialog ref="dialogRef">
      <span slot="title">Save this message as a draft?</span>
      This message has not been sent and contains unsaved changes. You can save it as a draft to work on later.
      <web-ui-button slot="footer" variant="primary" full>Save</web-ui-button>
      <web-ui-button slot="footer" variant="danger" full>Don't Save</web-ui-button>
      <web-ui-button slot="footer" variant="secondary" full @click="dialogRef?.close()">Cancel</web-ui-button>
    </web-ui-dialog>

    <h2>声明式</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="visible1 = true">打开对话框</web-ui-button>
    </div>

    <web-ui-dialog :open="visible1" @open-change="visible1 = $event.detail.open">
      <span slot="title">Save this message as a draft?</span>
      This message has not been sent and contains unsaved changes. You can save it as a draft to work on later.
      <web-ui-button slot="footer" variant="primary" full>Save</web-ui-button>
      <web-ui-button slot="footer" variant="danger" full>Don't Save</web-ui-button>
      <web-ui-button slot="footer" variant="secondary" full @click="visible1 = false">Cancel</web-ui-button>
    </web-ui-dialog>

    <h2>横向按钮</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="visible2 = true">打开横向对话框</web-ui-button>
    </div>

    <web-ui-dialog :open="visible2" horizontal @open-change="visible2 = $event.detail.open">
      <span slot="title">Save this message as a draft?</span>
      This message has not been sent and contains unsaved changes. You can save it as a draft to work on later.
      <web-ui-button slot="footer" variant="secondary" full @click="visible2 = false">Cancel</web-ui-button>
      <web-ui-button slot="footer" variant="primary" full>Save</web-ui-button>
    </web-ui-dialog>
  </div>
</template>
