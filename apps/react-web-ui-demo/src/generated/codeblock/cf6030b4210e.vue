<template>
  <web-ui-editable-text class="w-80" :value="multiline" placeholder="多行占位" aria-label="多行"></web-ui-editable-text>
</template>

<script setup lang="ts">
const multiline = '第一行按值里的换行成行\n第二行的长文案会在盒宽处折行，文字态与编辑态共用同一个盒'
</script>
