<template>
  <div class="grid w-full max-w-xl gap-5">
    <web-ui-progress
      aria-label="高对比度进度"
      class="[--wui-progress-height:12px] [--wui-progress-fill-color:var(--wui-color-success)]"
      :value="72"
      show-value
    ></web-ui-progress>
    <web-ui-progress
      aria-label="细轨道进度"
      class="[--wui-progress-height:4px] [--wui-progress-radius:2px]"
      :value="38"
    ></web-ui-progress>
  </div>
</template>
