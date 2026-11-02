<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <web-ui-collapse peek="80px">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        peek 80px（内容比它长）
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
        peek 200px（内容比它短）
      </button>
      <div slot="content">
        <div class="p-3 text-sm">内容不足 200px：收起高度取内容实际高度，不会被撑到 200px。</div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
const longRows = Array.from(
  { length: 8 },
  (_, index) => `段落 ${index + 1}：关闭时只露出前 80px，露出的这一截也点不动。`
)
</script>
