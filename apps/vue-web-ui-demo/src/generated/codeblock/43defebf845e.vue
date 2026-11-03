<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">不分组</div>
      <div class="font-mono">{{ CARD }}</div>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">groups="card"</div>
      <web-ui-grouped-text class="font-mono" :value="CARD" groups="card"></web-ui-grouped-text>
    </div>
  </div>
</template>

<script setup lang="ts">
const CARD = '6222021234567890'
</script>
