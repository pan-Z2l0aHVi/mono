<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input
      clearable
      aria-label="Wider input"
      value="One step wider, clear color set to danger"
      class="[--wui-input-width:280px] [--wui-input-clear-color:var(--wui-color-danger)]"
    ></web-ui-input>
    <web-ui-input
      clearable
      aria-label="Narrower input"
      value="One step narrower"
      class="[--wui-input-width:120px]"
    ></web-ui-input>
  </div>
</template>
