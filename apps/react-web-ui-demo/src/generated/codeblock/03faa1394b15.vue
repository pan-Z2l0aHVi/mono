<template>
  <web-ui-theme appearance="dark">
    <div class="rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <p class="m-0 mb-3 text-xs text-(--wui-color-text-secondary)">外层固定 dark，内层怎么切都动不了它</p>
      <web-ui-theme :appearance="appearance">
        <div
          class="w-full max-w-sm rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)"
        >
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <span class="text-sm text-(--wui-color-text-secondary)">appearance</span>
            <web-ui-segmented
              :value="appearance"
              aria-label="示例作用域的外观"
              @input="pick($event.currentTarget.value)"
            >
              <web-ui-segmented-trigger v-for="item in appearances" :key="item.value" :value="item.value">
                {{ item.label }}
              </web-ui-segmented-trigger>
            </web-ui-segmented>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <web-ui-input value="作用域内的输入框"></web-ui-input>
            <web-ui-button variant="primary">确认</web-ui-button>
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
  { label: '浅色', value: 'light' },
  { label: '暗色', value: 'dark' },
  { label: '跟随系统', value: 'system' }
]

const appearance = ref<ThemeAppearance>('light')

function pick(value: string) {
  const next = appearances.find(item => item.value === value)
  if (next) appearance.value = next.value
}
</script>
