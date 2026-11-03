<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">With a fraction</div>
      <web-ui-grouped-text value="1234567.89" groups="amount"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">Whole number</div>
      <web-ui-grouped-text value="98765432" groups="amount"></web-ui-grouped-text>
    </div>
    <div>
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">
        No fraction: the trailing dot belongs to the integer part
      </div>
      <web-ui-grouped-text value="123456." groups="amount"></web-ui-grouped-text>
    </div>
  </div>
</template>
