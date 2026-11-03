<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">groups="6,8,8"</div>
      <web-ui-grouped-text :value="ID" groups="6,8,8"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">groups="4,4,4,4,4,4"</div>
      <web-ui-grouped-text :value="ID" groups="4,4,4,4,4,4"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">emoji 整簇保留：groups="2,2"</div>
      <web-ui-grouped-text :value="EMOJI.repeat(4)" groups="2,2"></web-ui-grouped-text>
    </div>
  </div>
</template>

<script setup lang="ts">
const ID = '110101199003078888'
const EMOJI = '\u{1F469}\u200D\u{1F4BB}'
</script>
