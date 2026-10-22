<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-checkbox :checked="disabled" @change="disabled = $event.target.checked">
      禁用第一条的 trigger
    </web-ui-checkbox>

    <web-ui-collapse :disabled="disabled">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        随开关禁用
      </button>
      <div slot="content">
        <div class="p-3 text-sm">取消勾选就能展开；勾选后点它不动，但这条的内容本来就没展开。</div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse :open="true" disabled>
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        已展开且禁用
      </button>
      <div slot="content">
        <div class="p-3 text-sm">禁用不会把已展开的内容收掉：这条一直可见，点 trigger 无效。</div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const disabled = ref(true)
</script>
