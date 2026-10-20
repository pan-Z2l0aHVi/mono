<script setup lang="ts"></script>

<template>
  <div>
    <h1>input number</h1>
    <h2>Basic</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input-number :value="3" />
      <web-ui-input-number :value="0" />
    </div>

    <h2>Range limits</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input-number :value="5" :min="0" :max="10" />
      <web-ui-input-number :value="0" :min="0" :max="1" />
    </div>

    <h2>Decimal precision</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input-number :value="1.5" :precision="1" :min="0" :max="10" />
      <web-ui-input-number :value="0.01" :precision="2" :min="0" :max="1" />
    </div>

    <h2>Disabled</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input-number :value="5" disabled />
    </div>

    <h2>Read only</h2>
    <div class="mb-3 flex flex-col gap-3">
      <web-ui-input-number :value="5" readonly />
    </div>
  </div>
</template>
