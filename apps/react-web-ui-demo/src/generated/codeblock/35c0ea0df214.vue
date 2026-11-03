<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div v-for="gap in GAPS" :key="gap">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">--wui-grouped-text-gap: {{ gap }}</div>
      <web-ui-grouped-text
        class="font-mono"
        :style="{ '--wui-grouped-text-gap': gap }"
        :value="CARD"
        groups="card"
      ></web-ui-grouped-text>
    </div>
  </div>
</template>

<script setup lang="ts">
const CARD = '6222021234567890'
const GAPS = ['0px', '2px', '6px', '12px']
</script>
