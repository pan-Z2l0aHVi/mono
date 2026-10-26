<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text value="改几个字，然后按 Escape" @cancel="onCancel"></web-ui-editable-text>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('还没有操作')

function onCancel() {
  last.value = 'cancel：Escape 已把值恢复成进入编辑时的状态'
}
</script>
