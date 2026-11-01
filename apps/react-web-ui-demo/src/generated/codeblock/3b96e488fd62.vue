<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button variant="secondary" @click="addRow">Add a row</web-ui-button>
      <web-ui-button variant="secondary" :disabled="rows.length === 1" @click="removeRow">Remove a row</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">rows: {{ rows.length }}</output>
    </div>

    <web-ui-collapse :open="open" @open-change="open = $event.detail.open">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Change content while expanded
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
const rows = ref(['Row 1'])

function addRow() {
  rows.value = [...rows.value, `Row ${rows.value.length + 1}`]
}

function removeRow() {
  if (rows.value.length > 1) rows.value = rows.value.slice(0, -1)
}
</script>
