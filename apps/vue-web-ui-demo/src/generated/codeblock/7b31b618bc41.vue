<template>
  <web-ui-theme ref="theme" appearance="light" :motion="motion">
    <div class="w-full max-w-md rounded-2xl bg-(--wui-color-page) p-4 text-(--wui-color-text)">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="text-sm text-(--wui-color-text-secondary)">motion</span>
        <web-ui-segmented
          :value="motion"
          aria-label="Motion preset of the sample scope"
          @input="pick($event.currentTarget.value)"
        >
          <web-ui-segmented-trigger v-for="item in motions" :key="item.value" :value="item.value">
            {{ item.label }}
          </web-ui-segmented-trigger>
        </web-ui-segmented>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <web-ui-select portal placeholder="Open to see the duration" aria-label="Select for comparing motion presets">
          <web-ui-option value="enter" label="Enter">Enter</web-ui-option>
          <web-ui-option value="exit" label="Exit">Exit</web-ui-option>
        </web-ui-select>
        <web-ui-button variant="secondary" @click="inspect">Read the result</web-ui-button>
        <output class="text-sm text-(--wui-color-text-secondary)">{{
          reduced === '' ? 'Not read yet' : reduced
        }}</output>
      </div>
    </div>
  </web-ui-theme>
</template>

<script setup lang="ts">
import type { ThemeMotion, WebUiTheme } from '@greypan/web-ui'
import { useTemplateRef, ref } from 'vue'

const motions: { label: string; value: ThemeMotion }[] = [
  { label: 'full', value: 'full' },
  { label: 'reduced', value: 'reduced' },
  { label: 'system', value: 'system' }
]

const theme = useTemplateRef<WebUiTheme>('theme')
const motion = ref<ThemeMotion>('system')
const reduced = ref('')

function pick(value: string) {
  const next = motions.find(item => item.value === value)
  if (next) motion.value = next.value
}

function inspect() {
  const el = theme.value
  if (!el) return
  reduced.value = `isReducedMotion() = ${String(el.isReducedMotion())}`
}
</script>
