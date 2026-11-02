<template>
  <div class="flex flex-wrap items-start gap-3">
    <web-ui-textarea
      clearable
      aria-label="Wider multiline text"
      value="One step wider, clear color set to danger"
      class="[--wui-textarea-width:280px] [--wui-textarea-clear-color:var(--wui-color-danger)]"
    ></web-ui-textarea>
    <web-ui-textarea
      clearable
      aria-label="Narrower multiline text"
      value="One step narrower"
      class="[--wui-textarea-width:120px]"
    ></web-ui-textarea>
  </div>
</template>
