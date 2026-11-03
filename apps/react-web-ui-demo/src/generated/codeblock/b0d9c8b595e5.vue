<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">11 digits: 3-4-4</div>
      <web-ui-grouped-text :value="PHONE" groups="phone"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">With country code: the last size keeps repeating</div>
      <web-ui-grouped-text :value="`+86${PHONE}`" groups="phone"></web-ui-grouped-text>
    </div>
  </div>
</template>

<script setup lang="ts">
const PHONE = '13800138000'
</script>
