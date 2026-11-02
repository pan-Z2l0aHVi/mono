<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <web-ui-collapse peek="80px">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 80px (content is longer)
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p v-for="row in longRows" :key="row" class="m-0">{{ row }}</p>
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse peek="200px">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 200px (content is shorter)
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          Content is under 200px: the collapsed height takes the actual height of the content and is not stretched to
          200px.
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const longRows = Array.from(
  { length: 8 },
  (_, index) => `Paragraph ${index + 1}: when closed only the first 80px shows, and that strip is not clickable either.`
)
</script>
