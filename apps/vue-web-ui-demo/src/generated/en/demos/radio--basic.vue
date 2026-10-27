<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-radio :checked="plan === 'basic'" @change="plan = 'basic'">Basic</web-ui-radio>
    <web-ui-radio :checked="plan === 'pro'" @change="plan = 'pro'">Pro</web-ui-radio>
    <output class="text-sm text-(--wui-color-text-secondary)">Current plan: {{ plan }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const plan = ref('basic')
</script>
