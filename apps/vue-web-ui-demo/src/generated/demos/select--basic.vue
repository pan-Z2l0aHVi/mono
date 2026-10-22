<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-select :value="framework" placeholder="请选择框架" @change="framework = $event.currentTarget.value">
      <web-ui-option value="vue" label="Vue"></web-ui-option>
      <web-ui-option value="react" label="React"></web-ui-option>
      <web-ui-option value="svelte" label="Svelte"></web-ui-option>
    </web-ui-select>
    <div class="flex items-center gap-3">
      <web-ui-button @click="framework = ''">清除</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">当前值：{{ framework || '（空）' }}</output>
    </div>
    <web-ui-select placeholder="禁用状态" disabled>
      <web-ui-option value="a" label="不可选"></web-ui-option>
    </web-ui-select>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const framework = ref('vue')
</script>
