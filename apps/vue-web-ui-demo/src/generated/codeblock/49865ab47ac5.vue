<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text value="AAAABBBBCCCCDDDDEEEE" class="w-32" aria-label="长串断词"></web-ui-editable-text>
    <web-ui-editable-text
      :value="spacing"
      class="w-40 [--wui-editable-text-white-space:pre]"
      aria-label="保留空白"
    ></web-ui-editable-text>
    <web-ui-editable-text value="光标色改到这个 accent" class="[--wui-color-accent:#7c3aed]"></web-ui-editable-text>
  </div>
</template>

<script setup lang="ts">
const spacing = '空白按原样保留\n默认就是 pre-wrap'
</script>
