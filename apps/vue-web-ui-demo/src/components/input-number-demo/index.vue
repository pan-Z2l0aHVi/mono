<script setup lang="ts"></script>

<template>
  <div>
    <h1>数字输入框</h1>
    <h2>基础</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input-number :value="3" />
      <web-ui-input-number :value="0" />
    </div>

    <h2>范围限制</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input-number :value="5" :min="0" :max="10" />
      <web-ui-input-number :value="0" :min="0" :max="1" />
    </div>

    <h2>小数精度</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input-number :value="1.5" :precision="1" :min="0" :max="10" />
      <web-ui-input-number :value="0.01" :precision="2" :min="0" :max="1" />
    </div>

    <h2>禁用</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input-number :value="5" disabled />
    </div>
  </div>
</template>
