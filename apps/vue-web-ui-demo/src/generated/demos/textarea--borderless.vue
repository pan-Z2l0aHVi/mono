<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-textarea full borderless placeholder="无边框输入"></web-ui-textarea>
    <web-ui-textarea
      full
      borderless
      aria-label="无边框多行文本"
      :rows="4"
      value="无边框且有值，容器由外层负责"
    ></web-ui-textarea>
  </div>
</template>
