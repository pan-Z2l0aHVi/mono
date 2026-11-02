<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text
      value="AAAABBBBCCCCDDDDEEEE"
      class="w-32"
      aria-label="Long word breaking"
    ></web-ui-editable-text>
    <web-ui-editable-text
      :value="spacing"
      class="w-40 [--wui-editable-text-white-space:pre]"
      aria-label="Preserve whitespace"
    ></web-ui-editable-text>
    <web-ui-editable-text
      value="Caret color changed to this accent"
      class="[--wui-color-accent:#7c3aed]"
    ></web-ui-editable-text>
  </div>
</template>

<script setup lang="ts">
const spacing = 'Whitespace is preserved as-is\npre-wrap by default'
</script>
