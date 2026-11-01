<template>
  <div class="flex flex-wrap gap-4">
    <web-ui-theme v-for="item in appearances" :key="item" :appearance="item">
      <div class="w-64 rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <p class="m-0 font-medium">{{ labels[item] }}</p>
        <p class="m-0 mb-3 text-sm text-(--wui-color-text-secondary)">文本、次要文本与控件表面都取这一层的值</p>
        <div class="flex flex-wrap items-center gap-2">
          <web-ui-button variant="primary">主要</web-ui-button>
          <web-ui-button variant="secondary">次要</web-ui-button>
          <web-ui-switch checked></web-ui-switch>
        </div>
      </div>
    </web-ui-theme>
  </div>
</template>

<script setup lang="ts">
const appearances = ['light', 'dark'] as const

const labels: Record<(typeof appearances)[number], string> = {
  light: '浅色作用域',
  dark: '暗色作用域'
}
</script>
