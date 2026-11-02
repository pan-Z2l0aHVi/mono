<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button variant="secondary" @click="addRow">加一行</web-ui-button>
      <web-ui-button variant="secondary" :disabled="rows.length === 1" @click="removeRow">删一行</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">行数：{{ rows.length }}</output>
    </div>

    <web-ui-collapse :open="open" @open-change="open = $event.detail.open">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        展开着改内容
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in rows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(true)
const rows = ref(['第 1 行'])

function addRow() {
  rows.value = [...rows.value, `第 ${rows.value.length + 1} 行`]
}

function removeRow() {
  if (rows.value.length > 1) rows.value = rows.value.slice(0, -1)
}
</script>
