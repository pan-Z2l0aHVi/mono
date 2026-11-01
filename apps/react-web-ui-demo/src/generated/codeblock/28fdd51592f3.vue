<template>
  <web-ui-select :value="lang" @change="lang = $event.currentTarget.value">
    <div slot="trigger" class="flex items-center gap-1.5">
      <web-ui-icon :icon="lucideGlobe" :size="16"></web-ui-icon>
      <span class="text-sm">{{ LABELS[lang] ?? '选择语言' }}</span>
    </div>
    <web-ui-option value="zh" label="中文"></web-ui-option>
    <web-ui-option value="en" label="English"></web-ui-option>
    <web-ui-option value="ja" label="日本語"></web-ui-option>
  </web-ui-select>
</template>

<script setup lang="ts">
import { lucideGlobe } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const LABELS: Record<string, string> = { zh: '中文', en: 'English', ja: '日本語' }
const lang = ref('en')
</script>
