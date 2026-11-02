<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <web-ui-collapse peek="200px">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 200px · default ratio 0.4
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in derivedRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse peek="200px" class="[--wui-collapse-peek-edge-ratio:0.7]">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 200px · ratio 0.7, clamped by the cap
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in cappedRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const derivedRows = Array.from(
  { length: 6 },
  (_, index) => `Paragraph ${index + 1}: the last 80px (200px × 0.4) is the fade-plus-blur band.`
)
const cappedRows = Array.from(
  { length: 6 },
  (_, index) => `Paragraph ${index + 1}: 200px × 0.7 = 140px, but it is drawn at the 112px cap.`
)
</script>
