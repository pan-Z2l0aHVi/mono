<template>
  <div class="flex flex-wrap items-center gap-6">
    <web-ui-badge :count="count">
      <web-ui-button variant="secondary" @click="count += 1">收件箱</web-ui-button>
    </web-ui-badge>

    <web-ui-button @click="count = 0">清空未读</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">count={{ count }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const count = ref(3)
</script>
