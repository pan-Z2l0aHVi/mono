<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-textarea full disabled aria-label="禁用的多行文本" value="禁用：读得到，改不动"></web-ui-textarea>
    <web-ui-textarea
      full
      readonly
      clearable
      aria-label="只读的多行文本"
      value="只读：清除 button 已收起"
    ></web-ui-textarea>
  </div>
</template>
