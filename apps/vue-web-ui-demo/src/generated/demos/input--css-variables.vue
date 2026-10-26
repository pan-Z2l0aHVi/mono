<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input
      clearable
      aria-label="较宽的输入框"
      value="宽一档、清除色改 danger"
      class="[--wui-input-width:280px] [--wui-input-clear-color:var(--wui-color-danger)]"
    ></web-ui-input>
    <web-ui-input clearable aria-label="较窄的输入框" value="窄一档" class="[--wui-input-width:120px]"></web-ui-input>
  </div>
</template>
