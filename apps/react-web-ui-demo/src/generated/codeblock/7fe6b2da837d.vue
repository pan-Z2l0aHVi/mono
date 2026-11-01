<template>
  <div class="flex w-full flex-col items-start gap-4 sm:flex-row">
    <web-ui-collapse class="w-full sm:max-w-xs">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Default closed resting state
      </button>
      <div slot="content">
        <div class="max-h-32 overflow-y-auto p-3 text-sm">
          <p v-for="row in rows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse keep-mounted class="w-full sm:max-w-xs">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        keep-mounted closed resting state
      </button>
      <div slot="content">
        <div class="max-h-32 overflow-y-auto p-3 text-sm">
          <p v-for="row in rows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const rows = Array.from({ length: 20 }, (_, index) => `List item ${index + 1}`)
</script>
