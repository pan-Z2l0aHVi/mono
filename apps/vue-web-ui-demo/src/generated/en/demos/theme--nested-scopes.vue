<template>
  <web-ui-theme :appearance="outer" motion="reduced">
    <div class="rounded-2xl border border-(--wui-color-border) bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <div class="flex flex-col items-start gap-2">
        <span class="text-xs text-(--wui-color-text-secondary)">Layer 1 · motion reduced</span>
        <web-ui-segmented
          :value="outer"
          aria-label="Layer 1 appearance"
          @input="outer = pick($event.currentTarget.value)"
        >
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
            <span class="text-xs text-(--wui-color-text-secondary)">Layer 2 · motion full</span>
            <web-ui-segmented
              :value="middle"
              aria-label="Layer 2 appearance"
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
                <span class="text-xs text-(--wui-color-text-secondary)">Layer 3 · motion system</span>
                <web-ui-segmented
                  :value="inner"
                  aria-label="Layer 3 appearance"
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
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' }
]

const outer = ref<ThemeAppearance>('light')
const middle = ref<ThemeAppearance>('dark')
const inner = ref<ThemeAppearance>('system')

function pick(value: string): ThemeAppearance {
  return appearances.find(item => item.value === value)?.value ?? 'light'
}
</script>
