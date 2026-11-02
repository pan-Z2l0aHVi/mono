<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse :open="open" @open-change="open = $event.detail.open">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        展开详情
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p class="m-0">content slot 支持任意节点：文字、表单、图片，甚至另一条 collapse。</p>
        </div>
      </div>
    </web-ui-collapse>
    <output class="text-sm text-(--wui-color-text-secondary)">回写后的 open：{{ open }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
