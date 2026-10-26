<script setup lang="ts">
const internalKey = 'Keep script strings'
</script>

<template>
  <section id="greeting" data-key="Keep data attributes">
    <p title="Welcome">Hello world!</p>
    <input placeholder="Your name" />
    <img alt="Company logo" src="/logo.svg" />
    <button aria-label="Close dialog">Close</button>
  </section>
</template>

<style scoped>
p {
  white-space: pre-wrap;
}
</style>
