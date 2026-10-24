<template>
  <web-ui-theme appearance="light" motion="reduced">
    <div class="rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <p class="m-0 mb-2 text-xs text-(--wui-color-text-secondary)">外层 light / reduced：瞬移</p>
      <div class="flex flex-wrap items-center gap-3">
        <web-ui-segmented
          :value="outerValue"
          aria-label="外层动效对照"
          @input="outerValue = $event.currentTarget.value"
        >
          <web-ui-segmented-trigger v-for="item in sides" :key="item.value" :value="item.value">
            {{ item.label }}
          </web-ui-segmented-trigger>
        </web-ui-segmented>
        <web-ui-switch></web-ui-switch>
      </div>

      <web-ui-theme appearance="dark">
        <div
          class="mt-3 rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)"
        >
          <p class="m-0 mb-2 text-xs text-(--wui-color-text-secondary)">内层 dark / motion 未写，取 system：滑动</p>
          <div class="flex flex-wrap items-center gap-3">
            <web-ui-segmented
              :value="innerValue"
              aria-label="内层动效对照"
              @input="innerValue = $event.currentTarget.value"
            >
              <web-ui-segmented-trigger v-for="item in sides" :key="item.value" :value="item.value">
                {{ item.label }}
              </web-ui-segmented-trigger>
            </web-ui-segmented>
            <web-ui-switch checked></web-ui-switch>
          </div>
        </div>
      </web-ui-theme>
    </div>
  </web-ui-theme>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const sides = [
  { label: 'A', value: 'a' },
  { label: 'B', value: 'b' }
] as const

const outerValue = ref('a')
const innerValue = ref('a')
</script>
