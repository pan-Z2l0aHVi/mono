<template>
  <div class="flex flex-col items-start gap-6">
    <web-ui-slider aria-label="Volume"></web-ui-slider>
    <web-ui-slider aria-label="Brightness" :min="0" :max="100" :step="5" :value="40"></web-ui-slider>
    <web-ui-slider aria-label="Disabled volume" :min="0" :max="100" :step="5" :value="65" disabled></web-ui-slider>
  </div>
</template>
