<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">有小数</div>
      <web-ui-grouped-text value="1234567.89" groups="amount"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">整数</div>
      <web-ui-grouped-text value="98765432" groups="amount"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">没有小数段：结尾的点属于整数段</div>
      <web-ui-grouped-text value="123456." groups="amount"></web-ui-grouped-text>
    </div>
  </div>
</template>
