<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-input-number :value="1.5" :precision="1" :min="0" :max="10"></web-ui-input-number>
    <web-ui-input-number :value="0.01" :precision="2" :step="0.01" :min="0" :max="1"></web-ui-input-number>
    <web-ui-input-number :value="2.345" :precision="2"></web-ui-input-number>
  </div>
</template>
