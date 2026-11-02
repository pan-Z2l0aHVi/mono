<template>
  <div class="flex flex-wrap items-end gap-8">
    <web-ui-slider
      aria-label="Wide track"
      class="max-w-full [--wui-slider-width:300px] [--wui-slider-track-size:10px] [--wui-slider-thumb-thickness:26px] [--wui-slider-thumb-length:38px]"
      :value="35"
    ></web-ui-slider>

    <web-ui-slider
      aria-label="Narrow track"
      class="max-w-full [--wui-slider-width:160px] [--wui-slider-track-size:2px] [--wui-slider-thumb-thickness:12px]"
      :value="72"
    ></web-ui-slider>

    <web-ui-slider
      aria-label="Vertical wide track"
      vertical
      marks
      class="[--wui-slider-vertical-height:120px] [--wui-slider-track-size:8px] [--wui-slider-marks-inset:6px]"
      :step="10"
      :value="50"
    ></web-ui-slider>
  </div>
</template>
