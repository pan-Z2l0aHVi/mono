<template>
  <div class="flex flex-wrap gap-4">
    <web-ui-theme v-for="item in appearances" :key="item" :appearance="item">
      <div class="w-64 rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
        <p class="m-0 font-medium">{{ labels[item] }}</p>
        <p class="m-0 mb-3 text-sm text-(--wui-color-text-secondary)">
          Text, secondary text, and control surfaces all take their values from this layer
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <web-ui-button variant="primary">Primary</web-ui-button>
          <web-ui-button variant="secondary">Secondary</web-ui-button>
          <web-ui-switch checked></web-ui-switch>
        </div>
      </div>
    </web-ui-theme>
  </div>
</template>

<script setup lang="ts">
const appearances = ['light', 'dark'] as const

const labels: Record<(typeof appearances)[number], string> = {
  light: 'Light scope',
  dark: 'Dark scope'
}
</script>
