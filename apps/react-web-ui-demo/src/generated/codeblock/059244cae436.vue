<template>
  <web-ui-editable-text
    class="w-80"
    :value="multiline"
    placeholder="Multiline placeholder"
    aria-label="Multiline"
  ></web-ui-editable-text>
</template>

<script setup lang="ts">
const multiline =
  'The first line breaks where the value has a newline\nThe second line of longer copy wraps at the box width; the text state and the edit state share the same box'
</script>
