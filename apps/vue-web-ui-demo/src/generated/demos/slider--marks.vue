<template>
  <div class="flex flex-col items-start gap-8">
    <web-ui-slider aria-label="刻度步进 10" marks :step="10" :value="40"></web-ui-slider>
    <web-ui-slider aria-label="刻度步进 25" marks :step="25" :value="50"></web-ui-slider>
  </div>
</template>
