<template>
  <div class="flex flex-col gap-3">
    <web-ui-empty
      class="[--wui-empty-icon-size:24px] [--wui-empty-title-font-size:14px] [--wui-empty-description-font-size:13px] [--wui-empty-min-height:120px] [--wui-empty-padding:20px_16px]"
      title="Compact empty state"
    ></web-ui-empty>
    <web-ui-empty title="Default empty state"></web-ui-empty>
    <web-ui-empty
      class="[--wui-empty-icon-size:64px] [--wui-empty-title-font-size:20px] [--wui-empty-icon-color:var(--wui-color-accent)] [--wui-empty-icon-opacity:1]"
      title="Emphasized empty state"
      description="Color and depth are two separate variables: replace the color, then bring the graphic back to its full color."
    ></web-ui-empty>
  </div>
</template>
