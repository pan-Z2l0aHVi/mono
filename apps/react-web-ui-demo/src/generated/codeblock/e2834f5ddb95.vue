<template>
  <web-ui-theme :appearance="outer" motion="reduced">
    <div class="rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <div class="flex flex-col items-start gap-2">
        <span class="text-xs text-(--wui-color-text-secondary)">第 1 层 · reduced 动效</span>
        <web-ui-segmented :value="outer" aria-label="第 1 层外观" @input="outer = pick($event.currentTarget.value)">
          <web-ui-segmented-trigger v-for="item in appearances" :key="item.value" :value="item.value">
            {{ item.label }}
          </web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>

      <web-ui-theme :appearance="middle" motion="full">
        <div
          class="mt-3 rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)"
        >
          <div class="flex flex-col items-start gap-2">
            <span class="text-xs text-(--wui-color-text-secondary)">第 2 层 · full 动效</span>
            <web-ui-segmented
              :value="middle"
              aria-label="第 2 层外观"
              @input="middle = pick($event.currentTarget.value)"
            >
              <web-ui-segmented-trigger v-for="item in appearances" :key="item.value" :value="item.value">
                {{ item.label }}
              </web-ui-segmented-trigger>
            </web-ui-segmented>
          </div>

          <web-ui-theme :appearance="inner">
            <div
              class="mt-3 rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)"
            >
              <div class="flex flex-col items-start gap-2">
                <span class="text-xs text-(--wui-color-text-secondary)">第 3 层 · system 动效</span>
                <web-ui-segmented
                  :value="inner"
                  aria-label="第 3 层外观"
                  @input="inner = pick($event.currentTarget.value)"
                >
                  <web-ui-segmented-trigger v-for="item in appearances" :key="item.value" :value="item.value">
                    {{ item.label }}
                  </web-ui-segmented-trigger>
                </web-ui-segmented>
              </div>
            </div>
          </web-ui-theme>
        </div>
      </web-ui-theme>
    </div>
  </web-ui-theme>
</template>

<script setup lang="ts">
import type { ThemeAppearance } from '@greypan/web-ui'
import { ref } from 'vue'

const appearances: { label: string; value: ThemeAppearance }[] = [
  { label: '浅色模式', value: 'light' },
  { label: '深色模式', value: 'dark' },
  { label: '跟随系统', value: 'system' }
]

const outer = ref<ThemeAppearance>('light')
const middle = ref<ThemeAppearance>('dark')
const inner = ref<ThemeAppearance>('system')

function pick(value: string): ThemeAppearance {
  return appearances.find(item => item.value === value)?.value ?? 'light'
}
</script>
