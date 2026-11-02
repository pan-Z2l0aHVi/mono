<template>
  <web-ui-theme appearance="dark">
    <div class="rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <p class="m-0 mb-3 text-xs text-(--wui-color-text-secondary)">
        The outer layer is fixed to dark; switching the inner one cannot affect it
      </p>
      <web-ui-theme :appearance="appearance">
        <div
          class="w-full max-w-sm rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)"
        >
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <span class="text-sm text-(--wui-color-text-secondary)">appearance</span>
            <web-ui-segmented
              :value="appearance"
              aria-label="Appearance of the sample scope"
              @input="pick($event.currentTarget.value)"
            >
              <web-ui-segmented-trigger v-for="item in appearances" :key="item.value" :value="item.value">
                {{ item.label }}
              </web-ui-segmented-trigger>
            </web-ui-segmented>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <web-ui-input value="Input inside the scope"></web-ui-input>
            <web-ui-button variant="primary">Confirm</web-ui-button>
          </div>
        </div>
      </web-ui-theme>
    </div>
  </web-ui-theme>
</template>

<script setup lang="ts">
import type { ThemeAppearance } from '@greypan/web-ui'
import { ref } from 'vue'

const appearances: { label: string; value: ThemeAppearance }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' }
]

const appearance = ref<ThemeAppearance>('light')

function pick(value: string) {
  const next = appearances.find(item => item.value === value)
  if (next) appearance.value = next.value
}
</script>
